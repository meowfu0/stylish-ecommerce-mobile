import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import {
  EMAIL_DELIVERY,
  type ActionEmailPurpose,
  type EmailDeliveryPort,
} from '../../../infrastructure/email/email-delivery.types';

import type {
  ActionTokenDto,
  EmailDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from '../dto/auth-request.dto';
import type {
  AuthenticatedDataDto,
  MeDataDto,
  MessageAcceptedDataDto,
  RegistrationDataDto,
} from '../dto/auth-response.dto';
import type { AuthPrincipal, RequestMetadata, UserAuthRecord } from '../types/auth.types';
import { AuthAuditService } from './auth-audit.service';
import { AuthStore } from './auth.store';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const isUniqueViolation = (error: unknown): boolean => {
  let currentError = error;

  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof currentError !== 'object' || currentError === null) {
      return false;
    }
    if (Reflect.get(currentError, 'code') === '23505') {
      return true;
    }
    currentError = Reflect.get(currentError, 'cause');
  }

  return false;
};

type StoredActionToken = {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
  idempotencyKey: string;
};

@Injectable()
export class AuthService {
  private readonly maxActiveSessions: number;

  constructor(
    private readonly authStore: AuthStore,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    @Inject(EMAIL_DELIVERY) private readonly emailService: EmailDeliveryPort,
    private readonly auditService: AuthAuditService,
    configService: ConfigService,
  ) {
    this.maxActiveSessions = configService.getOrThrow<number>('auth.maxActiveSessions');
  }

  async register(dto: RegisterDto, metadata: RequestMetadata): Promise<RegistrationDataDto> {
    const passwordHash = await this.passwordService.hash(dto.password);
    const actionToken = this.createActionToken(this.tokenService.emailVerificationLifetimeSeconds);

    try {
      const user = await this.authStore.registerUser({
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        actionToken,
      });
      await this.deliverActionEmail(
        user,
        'EMAIL_VERIFICATION',
        actionToken,
        'auth.email_verification.requested',
        metadata,
      );
      await this.auditService.record('auth.register', metadata, {
        actorUserId: user.id,
        entityId: user.id,
        outcome: 'SUCCESS',
      });

      return { user: this.toUserSummary(user) };
    } catch (error) {
      if (isUniqueViolation(error)) {
        await this.auditService.record('auth.register', metadata, {
          outcome: 'DENIED',
          reason: 'DUPLICATE_REGISTRATION',
        });
        throw new ConflictException({
          message: 'Unable to create account',
          errors: [{ field: 'email', message: 'An account cannot be created with this email' }],
        });
      }

      throw error;
    }
  }

  async login(dto: LoginDto, metadata: RequestMetadata): Promise<AuthenticatedDataDto> {
    const user = await this.authStore.findUserByEmail(dto.email);

    if (!user) {
      await this.passwordService.consumeDummyVerification(dto.password);
      await this.auditService.record('auth.login', metadata, {
        outcome: 'DENIED',
        reason: 'INVALID_CREDENTIALS',
      });
      throw this.invalidCredentials();
    }

    const passwordValid = await this.passwordService.verify(user.passwordHash, dto.password);

    if (!passwordValid || user.deletedAt || user.status !== 'ACTIVE' || !user.emailVerifiedAt) {
      await this.auditService.record('auth.login', metadata, {
        actorUserId: user.id,
        entityId: user.id,
        outcome: 'DENIED',
        reason: 'INVALID_CREDENTIALS_OR_ACCOUNT_STATE',
      });
      throw this.invalidCredentials();
    }

    const sessionId = randomUUID();
    const pair = await this.tokenService.createPair(user.id, sessionId, user.authVersion);
    const result = await this.authStore.createSession({
      user,
      sessionId,
      refreshToken: {
        id: pair.refreshTokenId,
        tokenHash: this.tokenService.hashOpaqueToken(pair.refreshToken),
        expiresAt: pair.refreshTokenExpiresAt,
      },
      metadata: { ...metadata, deviceName: dto.deviceName },
      maxActiveSessions: this.maxActiveSessions,
    });

    if (result.kind === 'SESSION_LIMIT') {
      throw new ConflictException({
        message: 'Maximum active sessions reached',
        errors: [{ field: 'session', message: 'Log out another session before signing in' }],
      });
    }

    if (result.kind !== 'CREATED') {
      throw this.invalidCredentials();
    }

    await this.auditService.record('auth.login', metadata, {
      actorUserId: user.id,
      entityId: sessionId,
      outcome: 'SUCCESS',
    });

    return this.toAuthenticatedData(user, pair);
  }

  async refresh(dto: RefreshDto, metadata: RequestMetadata): Promise<AuthenticatedDataDto> {
    let payload;

    try {
      payload = await this.tokenService.verifyRefresh(dto.refreshToken);
    } catch {
      throw this.invalidRefreshToken();
    }

    const nextPair = await this.tokenService.createPair(payload.sub, payload.sid, payload.av);
    const result = await this.authStore.rotateRefreshToken({
      userId: payload.sub,
      sessionId: payload.sid,
      authVersion: payload.av,
      currentTokenId: payload.jti,
      currentTokenHash: this.tokenService.hashOpaqueToken(dto.refreshToken),
      nextToken: {
        id: nextPair.refreshTokenId,
        tokenHash: this.tokenService.hashOpaqueToken(nextPair.refreshToken),
        expiresAt: nextPair.refreshTokenExpiresAt,
      },
    });

    if (result.kind === 'REUSED') {
      await this.auditService.record('auth.refresh.reuse_detected', metadata, {
        actorUserId: payload.sub,
        entityId: payload.sid,
        outcome: 'DENIED',
        reason: 'REFRESH_TOKEN_REUSE',
      });
      throw this.invalidRefreshToken();
    }

    if (result.kind !== 'ROTATED') {
      throw this.invalidRefreshToken();
    }

    await this.auditService.record('auth.refresh', metadata, {
      actorUserId: result.user.id,
      entityId: payload.sid,
      outcome: 'SUCCESS',
    });

    return this.toAuthenticatedData(result.user, nextPair);
  }

  async logout(
    principal: AuthPrincipal,
    metadata: RequestMetadata,
  ): Promise<MessageAcceptedDataDto> {
    await this.authStore.revokeSession(principal.userId, principal.sessionId, 'LOGOUT');
    await this.auditService.record('auth.logout', metadata, {
      actorUserId: principal.userId,
      entityId: principal.sessionId,
      outcome: 'SUCCESS',
    });
    return { accepted: true };
  }

  async logoutAll(
    principal: AuthPrincipal,
    metadata: RequestMetadata,
  ): Promise<MessageAcceptedDataDto> {
    await this.authStore.revokeAllSessions(principal.userId, 'LOGOUT_ALL');
    await this.auditService.record('auth.logout_all', metadata, {
      actorUserId: principal.userId,
      entityId: principal.userId,
      outcome: 'SUCCESS',
    });
    return { accepted: true };
  }

  async verifyEmail(
    dto: ActionTokenDto,
    metadata: RequestMetadata,
  ): Promise<MessageAcceptedDataDto> {
    const result = await this.authStore.consumeEmailVerification(
      this.tokenService.hashOpaqueToken(dto.token),
    );

    if (result.kind !== 'CONSUMED') {
      throw this.invalidActionToken();
    }

    await this.auditService.record('auth.email_verified', metadata, {
      actorUserId: result.userId,
      entityId: result.userId,
      outcome: 'SUCCESS',
    });
    return { accepted: true };
  }

  async resendVerification(
    dto: EmailDto,
    metadata: RequestMetadata,
  ): Promise<MessageAcceptedDataDto> {
    const user = await this.authStore.findUserByEmail(dto.email);

    if (user?.status === 'PENDING_VERIFICATION' && !user.deletedAt) {
      await this.issueActionEmail(
        user,
        'EMAIL_VERIFICATION',
        this.tokenService.emailVerificationLifetimeSeconds,
        'auth.email_verification.requested',
        metadata,
      );
    }

    return { accepted: true };
  }

  async forgotPassword(dto: EmailDto, metadata: RequestMetadata): Promise<MessageAcceptedDataDto> {
    const user = await this.authStore.findUserByEmail(dto.email);

    if (user && !user.deletedAt && user.status !== 'DISABLED') {
      await this.issueActionEmail(
        user,
        'PASSWORD_RESET',
        this.tokenService.passwordResetLifetimeSeconds,
        'auth.password_reset.requested',
        metadata,
      );
    }

    return { accepted: true };
  }

  async resetPassword(
    dto: ResetPasswordDto,
    metadata: RequestMetadata,
  ): Promise<MessageAcceptedDataDto> {
    const passwordHash = await this.passwordService.hash(dto.newPassword);
    const result = await this.authStore.consumePasswordReset(
      this.tokenService.hashOpaqueToken(dto.token),
      passwordHash,
    );

    if (result.kind !== 'CONSUMED') {
      throw this.invalidActionToken();
    }

    await this.auditService.record('auth.password_reset.completed', metadata, {
      actorUserId: result.userId,
      entityId: result.userId,
      outcome: 'SUCCESS',
    });
    return { accepted: true };
  }

  async validateAccessToken(token: string): Promise<AuthPrincipal> {
    const payload = await this.tokenService.verifyAccess(token);
    const result = await this.authStore.validateAccessPrincipal(
      payload.sub,
      payload.sid,
      payload.av,
    );

    if (result.kind !== 'VALID') {
      throw this.invalidCredentials();
    }

    return result.principal;
  }

  async getMe(userId: string): Promise<MeDataDto> {
    const result = await this.authStore.getMe(userId);

    if (!result) {
      throw this.invalidCredentials();
    }

    return {
      ...result,
      emailVerifiedAt: result.emailVerifiedAt?.toISOString() ?? null,
    };
  }

  private createActionToken(lifetimeSeconds: number): StoredActionToken {
    return {
      ...this.tokenService.createActionToken(),
      expiresAt: new Date(Date.now() + lifetimeSeconds * 1000),
      idempotencyKey: randomUUID(),
    };
  }

  private async issueActionEmail(
    user: UserAuthRecord,
    purpose: ActionEmailPurpose,
    lifetimeSeconds: number,
    auditEvent: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const actionToken = this.createActionToken(lifetimeSeconds);
    await this.authStore.replaceActionToken(user.id, purpose, actionToken);
    await this.deliverActionEmail(user, purpose, actionToken, auditEvent, metadata);
  }

  private async deliverActionEmail(
    user: UserAuthRecord,
    purpose: ActionEmailPurpose,
    actionToken: StoredActionToken,
    auditEvent: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    try {
      await this.emailService.send({
        idempotencyKey: actionToken.idempotencyKey,
        recipient: user.email,
        purpose,
        rawToken: actionToken.rawToken,
      });
      await this.auditService.record(auditEvent, metadata, {
        actorUserId: user.id,
        entityId: user.id,
        outcome: 'SUCCESS',
      });
    } catch {
      await this.auditService.record(auditEvent, metadata, {
        actorUserId: user.id,
        entityId: user.id,
        outcome: 'FAILED',
        reason: 'EMAIL_DELIVERY_FAILED',
      });
    }
  }

  private toUserSummary(user: UserAuthRecord): RegistrationDataDto['user'] {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    };
  }

  private toAuthenticatedData(
    user: UserAuthRecord,
    pair: Awaited<ReturnType<TokenService['createPair']>>,
  ): AuthenticatedDataDto {
    return {
      user: this.toUserSummary(user),
      tokens: {
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.tokenService.accessLifetimeSeconds,
        refreshTokenExpiresAt: pair.refreshTokenExpiresAt.toISOString(),
      },
    };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'Invalid email or password',
      errors: [{ field: 'credentials', message: 'Credentials are invalid' }],
    });
  }

  private invalidRefreshToken(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'Invalid or expired refresh token',
      errors: [{ field: 'refreshToken', message: 'Refresh token is invalid or expired' }],
    });
  }

  private invalidActionToken(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'Invalid or expired token',
      errors: [{ field: 'token', message: 'Token is invalid or expired' }],
    });
  }
}
