import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import type { AuthJwtPayload, AuthTokenPair, AuthTokenType } from '../types/auth.types';

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly issuer: string;
  private readonly audience: string;
  readonly accessLifetimeSeconds: number;
  readonly refreshLifetimeSeconds: number;
  readonly emailVerificationLifetimeSeconds: number;
  readonly passwordResetLifetimeSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.accessSecret = configService.getOrThrow<string>('auth.accessSecret');
    this.refreshSecret = configService.getOrThrow<string>('auth.refreshSecret');
    this.issuer = configService.getOrThrow<string>('auth.issuer');
    this.audience = configService.getOrThrow<string>('auth.audience');
    this.accessLifetimeSeconds = configService.getOrThrow<number>(
      'auth.accessTokenLifetimeSeconds',
    );
    this.refreshLifetimeSeconds = configService.getOrThrow<number>(
      'auth.refreshTokenLifetimeSeconds',
    );
    this.emailVerificationLifetimeSeconds = configService.getOrThrow<number>(
      'auth.emailVerificationLifetimeSeconds',
    );
    this.passwordResetLifetimeSeconds = configService.getOrThrow<number>(
      'auth.passwordResetLifetimeSeconds',
    );
  }

  async createPair(userId: string, sessionId: string, authVersion: number): Promise<AuthTokenPair> {
    const refreshTokenId = randomUUID();
    const accessTokenId = randomUUID();
    const now = Date.now();
    const [accessToken, refreshToken] = await Promise.all([
      this.sign('access', accessTokenId, userId, sessionId, authVersion),
      this.sign('refresh', refreshTokenId, userId, sessionId, authVersion),
    ]);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(now + this.accessLifetimeSeconds * 1000),
      refreshTokenExpiresAt: new Date(now + this.refreshLifetimeSeconds * 1000),
      refreshTokenId,
    };
  }

  verifyAccess(token: string): Promise<AuthJwtPayload> {
    return this.verify(token, 'access');
  }

  verifyRefresh(token: string): Promise<AuthJwtPayload> {
    return this.verify(token, 'refresh');
  }

  createActionToken(): { rawToken: string; tokenHash: string } {
    const rawToken = randomBytes(32).toString('base64url');
    return {
      rawToken,
      tokenHash: this.hashOpaqueToken(rawToken),
    };
  }

  hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private sign(
    tokenType: AuthTokenType,
    tokenId: string,
    userId: string,
    sessionId: string,
    authVersion: number,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        av: authVersion,
        sid: sessionId,
        typ: tokenType,
      },
      {
        algorithm: 'HS256',
        audience: this.audience,
        expiresIn:
          tokenType === 'access' ? this.accessLifetimeSeconds : this.refreshLifetimeSeconds,
        issuer: this.issuer,
        jwtid: tokenId,
        secret: tokenType === 'access' ? this.accessSecret : this.refreshSecret,
        subject: userId,
      },
    );
  }

  private async verify(token: string, expectedType: AuthTokenType): Promise<AuthJwtPayload> {
    const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(token, {
      algorithms: ['HS256'],
      audience: this.audience,
      issuer: this.issuer,
      secret: expectedType === 'access' ? this.accessSecret : this.refreshSecret,
    });

    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof Reflect.get(payload, 'sub') !== 'string' ||
      typeof Reflect.get(payload, 'sid') !== 'string' ||
      typeof Reflect.get(payload, 'jti') !== 'string' ||
      typeof Reflect.get(payload, 'av') !== 'number' ||
      Reflect.get(payload, 'typ') !== expectedType
    ) {
      throw new Error('Invalid token claims');
    }

    return payload as AuthJwtPayload;
  }
}
