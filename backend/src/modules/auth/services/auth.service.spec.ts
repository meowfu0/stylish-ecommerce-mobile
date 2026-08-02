import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import type { AuthTokenPair, UserAuthRecord } from '../types/auth.types';
import type { AuthAuditService } from './auth-audit.service';
import { AuthService } from './auth.service';
import type { AuthStore } from './auth.store';
import type { TokenService } from './token.service';

const activeUser: UserAuthRecord = {
  id: '6dd661fa-487a-4f99-9f79-8433039cf469',
  email: 'customer@example.com',
  passwordHash: 'stored-hash',
  status: 'ACTIVE',
  emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  authVersion: 0,
  deletedAt: null,
};

const tokenPair: AuthTokenPair = {
  accessToken: 'access.jwt.value',
  refreshToken: 'refresh.jwt.value',
  accessTokenExpiresAt: new Date('2026-08-01T00:15:00.000Z'),
  refreshTokenExpiresAt: new Date('2026-08-31T00:00:00.000Z'),
  refreshTokenId: '2c53ab4b-4455-44f1-aa6e-66fbb569be65',
};

describe('AuthService', () => {
  let service: AuthService;
  let store: {
    findUserByEmail: jest.Mock;
    registerUser: jest.Mock;
    createSession: jest.Mock;
    rotateRefreshToken: jest.Mock;
    revokeSession: jest.Mock;
    revokeAllSessions: jest.Mock;
    consumeEmailVerification: jest.Mock;
    replaceActionToken: jest.Mock;
    consumePasswordReset: jest.Mock;
    validateAccessPrincipal: jest.Mock;
    getMe: jest.Mock;
  };
  let passwordService: {
    hash: jest.Mock;
    verify: jest.Mock;
    consumeDummyVerification: jest.Mock;
  };
  let tokenService: {
    accessLifetimeSeconds: number;
    refreshLifetimeSeconds: number;
    emailVerificationLifetimeSeconds: number;
    passwordResetLifetimeSeconds: number;
    createActionToken: jest.Mock;
    hashOpaqueToken: jest.Mock;
    createPair: jest.Mock;
    verifyRefresh: jest.Mock;
    verifyAccess: jest.Mock;
  };
  let emailService: { send: jest.Mock };
  let auditService: { record: jest.Mock };

  beforeEach(() => {
    store = {
      findUserByEmail: jest.fn(),
      registerUser: jest.fn(),
      createSession: jest.fn(),
      rotateRefreshToken: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessions: jest.fn(),
      consumeEmailVerification: jest.fn(),
      replaceActionToken: jest.fn(),
      consumePasswordReset: jest.fn(),
      validateAccessPrincipal: jest.fn(),
      getMe: jest.fn(),
    };
    passwordService = {
      hash: jest.fn().mockResolvedValue('argon2id-hash'),
      verify: jest.fn(),
      consumeDummyVerification: jest.fn().mockResolvedValue(undefined),
    };
    tokenService = {
      accessLifetimeSeconds: 900,
      refreshLifetimeSeconds: 2_592_000,
      emailVerificationLifetimeSeconds: 86_400,
      passwordResetLifetimeSeconds: 1_800,
      createActionToken: jest.fn().mockReturnValue({
        rawToken: 'opaque-action-token',
        tokenHash: 'a'.repeat(64),
      }),
      hashOpaqueToken: jest.fn().mockReturnValue('b'.repeat(64)),
      createPair: jest.fn().mockResolvedValue(tokenPair),
      verifyRefresh: jest.fn(),
      verifyAccess: jest.fn(),
    };
    emailService = { send: jest.fn().mockResolvedValue(undefined) };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(5),
    } as unknown as ConfigService;

    service = new AuthService(
      store as unknown as AuthStore,
      passwordService,
      tokenService as unknown as TokenService,
      emailService,
      auditService as unknown as AuthAuditService,
      configService,
    );
  });

  it('registers a pending customer and sends a verification email', async () => {
    const pendingUser = {
      ...activeUser,
      status: 'PENDING_VERIFICATION' as const,
      emailVerifiedAt: null,
    };
    store.registerUser.mockResolvedValue(pendingUser);

    const result = await service.register(
      {
        email: pendingUser.email,
        password: 'correct horse battery staple',
      },
      { requestId: 'register-test' },
    );

    expect(result.user.status).toBe('PENDING_VERIFICATION');
    expect(store.registerUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: pendingUser.email,
        passwordHash: 'argon2id-hash',
      }),
    );
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'EMAIL_VERIFICATION' }),
    );
  });

  it('keeps registration successful when email delivery is temporarily unavailable', async () => {
    const pendingUser = {
      ...activeUser,
      status: 'PENDING_VERIFICATION' as const,
      emailVerifiedAt: null,
    };
    store.registerUser.mockResolvedValue(pendingUser);
    emailService.send.mockRejectedValue(new Error('SMTP unavailable'));

    const result = await service.register(
      {
        email: pendingUser.email,
        password: 'correct horse battery staple',
      },
      { requestId: 'register-email-failure-test' },
    );

    expect(result.user.email).toBe(pendingUser.email);
    expect(result.user.status).toBe('PENDING_VERIFICATION');
    expect(auditService.record).toHaveBeenCalledWith(
      'auth.email_verification.requested',
      expect.any(Object),
      expect.objectContaining({
        outcome: 'FAILED',
        reason: 'EMAIL_DELIVERY_FAILED',
      }),
    );
  });

  it('returns generic accepted responses for resend and password recovery', async () => {
    const pendingUser = {
      ...activeUser,
      status: 'PENDING_VERIFICATION' as const,
      emailVerifiedAt: null,
    };
    store.findUserByEmail
      .mockResolvedValueOnce(pendingUser)
      .mockResolvedValueOnce(activeUser)
      .mockResolvedValueOnce(null);

    await expect(service.resendVerification({ email: pendingUser.email }, {})).resolves.toEqual({
      accepted: true,
    });
    await expect(service.forgotPassword({ email: activeUser.email }, {})).resolves.toEqual({
      accepted: true,
    });
    await expect(service.forgotPassword({ email: 'missing@example.com' }, {})).resolves.toEqual({
      accepted: true,
    });

    expect(store.replaceActionToken).toHaveBeenCalledTimes(2);
    expect(emailService.send).toHaveBeenCalledTimes(2);
  });

  it('returns the approved generic conflict for duplicate registration', async () => {
    store.registerUser.mockRejectedValue({
      cause: { code: '23505' },
      message: 'Failed query',
    });

    await expect(
      service.register({ email: activeUser.email, password: 'correct horse battery staple' }, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    {
      name: 'unverified',
      user: {
        ...activeUser,
        status: 'PENDING_VERIFICATION' as const,
        emailVerifiedAt: null,
      },
    },
    {
      name: 'disabled',
      user: { ...activeUser, status: 'DISABLED' as const },
    },
  ])('denies login for a $name account with a generic error', async ({ user }) => {
    store.findUserByEmail.mockResolvedValue(user);
    passwordService.verify.mockResolvedValue(true);

    await expect(
      service.login({ email: user.email, password: 'valid-password-value' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(store.createSession).not.toHaveBeenCalled();
  });

  it('performs a dummy password operation for an unknown login email', async () => {
    store.findUserByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'unknown@example.com', password: 'invalid-password-value' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(passwordService.consumeDummyVerification).toHaveBeenCalled();
  });

  it('creates a session and returns JSON tokens after valid login', async () => {
    store.findUserByEmail.mockResolvedValue(activeUser);
    passwordService.verify.mockResolvedValue(true);
    store.createSession.mockResolvedValue({ kind: 'CREATED' });

    const result = await service.login(
      { email: activeUser.email, password: 'valid-password-value' },
      {},
    );

    expect(result.tokens).toEqual(
      expect.objectContaining({
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: 900,
      }),
    );
  });

  it('enforces the five-session limit', async () => {
    store.findUserByEmail.mockResolvedValue(activeUser);
    passwordService.verify.mockResolvedValue(true);
    store.createSession.mockResolvedValue({ kind: 'SESSION_LIMIT' });

    await expect(
      service.login({ email: activeUser.email, password: 'valid-password-value' }, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rotates a refresh token', async () => {
    tokenService.verifyRefresh.mockResolvedValue({
      sub: activeUser.id,
      sid: '46acb46b-d07f-42c2-b20b-d55821ef811b',
      av: 0,
      typ: 'refresh',
      jti: '9d26d59a-f5c6-4457-8506-86a149a5e375',
    });
    store.rotateRefreshToken.mockResolvedValue({ kind: 'ROTATED', user: activeUser });

    const result = await service.refresh({ refreshToken: 'old.refresh.jwt' }, {});

    expect(result.tokens.refreshToken).toBe(tokenPair.refreshToken);
    expect(store.rotateRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('denies an expired refresh JWT', async () => {
    tokenService.verifyRefresh.mockRejectedValue(new Error('expired'));

    await expect(
      service.refresh({ refreshToken: 'expired.refresh.jwt' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('denies refresh-token replay after the store revokes the session', async () => {
    tokenService.verifyRefresh.mockResolvedValue({
      sub: activeUser.id,
      sid: '46acb46b-d07f-42c2-b20b-d55821ef811b',
      av: 0,
      typ: 'refresh',
      jti: '9d26d59a-f5c6-4457-8506-86a149a5e375',
    });
    store.rotateRefreshToken.mockResolvedValue({ kind: 'REUSED' });

    await expect(
      service.refresh({ refreshToken: 'replayed.refresh.jwt' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auditService.record).toHaveBeenCalledWith(
      'auth.refresh.reuse_detected',
      {},
      expect.objectContaining({ reason: 'REFRESH_TOKEN_REUSE' }),
    );
  });

  it('revokes one session and all sessions on explicit logout actions', async () => {
    const principal = {
      userId: activeUser.id,
      sessionId: '46acb46b-d07f-42c2-b20b-d55821ef811b',
      authVersion: 0,
      email: activeUser.email,
    };

    await service.logout(principal, {});
    await service.logoutAll(principal, {});

    expect(store.revokeSession).toHaveBeenCalledWith(
      principal.userId,
      principal.sessionId,
      'LOGOUT',
    );
    expect(store.revokeAllSessions).toHaveBeenCalledWith(principal.userId, 'LOGOUT_ALL');
  });

  it('consumes a valid password reset and denies an expired action token', async () => {
    store.consumePasswordReset
      .mockResolvedValueOnce({ kind: 'CONSUMED', userId: activeUser.id })
      .mockResolvedValueOnce({ kind: 'INVALID' });

    await expect(
      service.resetPassword(
        { token: 'valid-action-token-value-that-is-long', newPassword: 'new-password-value' },
        {},
      ),
    ).resolves.toEqual({ accepted: true });
    await expect(
      service.resetPassword(
        { token: 'expired-action-token-value-that-is-long', newPassword: 'new-password-value' },
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects access when the account, auth version, or session is invalid', async () => {
    tokenService.verifyAccess.mockResolvedValue({
      sub: activeUser.id,
      sid: '46acb46b-d07f-42c2-b20b-d55821ef811b',
      av: 0,
      typ: 'access',
      jti: '9d26d59a-f5c6-4457-8506-86a149a5e375',
    });
    store.validateAccessPrincipal.mockResolvedValue({ kind: 'INVALID' });

    await expect(service.validateAccessToken('access.jwt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
