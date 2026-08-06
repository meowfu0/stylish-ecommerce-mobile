import { ConflictException, Controller, Get, UnauthorizedException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { DatabaseService } from '../src/database/database.service';
import {
  RequireMerchantPermissions,
  RequirePlatformPermissions,
} from '../src/modules/auth/decorators/permissions.decorator';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { AuthStore } from '../src/modules/auth/services/auth.store';

@Controller('test-authorization')
class AuthorizationProbeController {
  @Get('platform')
  @RequirePlatformPermissions('platform.users.manage')
  platform(): { allowed: true } {
    return { allowed: true };
  }

  @Get('merchants/:merchantId/orders')
  @RequireMerchantPermissions('merchantId', 'merchant.orders.read')
  merchant(): { allowed: true } {
    return { allowed: true };
  }
}

const user = {
  id: '6dd661fa-487a-4f99-9f79-8433039cf469',
  email: 'customer@example.com',
  status: 'ACTIVE',
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
};

const principal = {
  userId: user.id,
  sessionId: '46acb46b-d07f-42c2-b20b-d55821ef811b',
  authVersion: 0,
  email: user.email,
};

const authenticatedData = {
  user,
  tokens: {
    accessToken: 'new.access.jwt',
    refreshToken: 'new.refresh.jwt',
    tokenType: 'Bearer' as const,
    expiresIn: 900,
    refreshTokenExpiresAt: '2026-08-30T00:00:00.000Z',
  },
};

describe('Authentication endpoints (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    logoutAll: jest.Mock;
    getMe: jest.Mock;
    verifyEmail: jest.Mock;
    resendVerification: jest.Mock;
    forgotPassword: jest.Mock;
    resetPassword: jest.Mock;
    validateAccessToken: jest.Mock;
  };
  let authStore: {
    hasPlatformPermissions: jest.Mock;
    hasMerchantPermissions: jest.Mock;
  };

  beforeAll(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
      getMe: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerification: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      validateAccessToken: jest.fn(),
    };
    authStore = {
      hasPlatformPermissions: jest.fn(),
      hasMerchantPermissions: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthorizationProbeController],
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({ checkConnection: jest.fn().mockResolvedValue(true) })
      .overrideProvider(AuthService)
      .useValue(authService)
      .overrideProvider(AuthStore)
      .useValue(authStore)
      .compile();

    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    for (const mock of Object.values(authService)) {
      mock.mockReset();
    }
    for (const mock of Object.values(authStore)) {
      mock.mockReset();
    }
    authService.validateAccessToken.mockResolvedValue(principal);
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, verifies, and logs in a customer through the HTTP contracts', async () => {
    authService.register.mockResolvedValue({
      user: { ...user, status: 'PENDING_VERIFICATION', emailVerifiedAt: null },
    });
    authService.verifyEmail.mockResolvedValue({ accepted: true });
    authService.login.mockResolvedValue(authenticatedData);

    await request(server)
      .post('/api/auth/register')
      .send({
        email: 'Customer@Example.com',
        password: 'correct horse battery staple',
      })
      .expect(201)
      .expect(({ body }) => {
        const parsed = body as unknown as {
          success: boolean;
          data: { user: { status: string } };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.user.status).toBe('PENDING_VERIFICATION');
      });
    await request(server)
      .post('/api/auth/verify-email')
      .send({ token: 'verification-token-value-that-is-long-enough' })
      .expect(200);
    await request(server)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'correct horse battery staple' })
      .expect(200)
      .expect(({ body }) => {
        const parsed = body as unknown as {
          data: { tokens: { accessToken: string; refreshToken: string } };
        };
        expect(parsed.data.tokens).toEqual(
          expect.objectContaining({
            accessToken: 'new.access.jwt',
            refreshToken: 'new.refresh.jwt',
          }),
        );
      });
  });

  it('rotates refresh tokens and returns 401 for replay detection', async () => {
    authService.refresh.mockResolvedValueOnce(authenticatedData).mockRejectedValueOnce(
      new UnauthorizedException({
        message: 'Invalid or expired refresh token',
        errors: [{ field: 'refreshToken', message: 'Refresh token is invalid or expired' }],
      }),
    );

    await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'current.refresh.jwt' })
      .expect(200);
    await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'current.refresh.jwt' })
      .expect(401)
      .expect(({ body }) => {
        expect(body).toEqual({
          success: false,
          message: 'Invalid or expired refresh token',
          errors: [{ field: 'refreshToken', message: 'Refresh token is invalid or expired' }],
        });
      });
  });

  it('supports me, logout, and logout-all with an access token', async () => {
    authService.getMe.mockResolvedValue({
      ...user,
      profile: null,
      platformRoles: ['customer'],
      merchantMemberships: [],
    });
    authService.logout.mockResolvedValue({ accepted: true });
    authService.logoutAll.mockResolvedValue({ accepted: true });

    await request(server)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer current.access.jwt')
      .expect(200)
      .expect(({ body }) => {
        const parsed = body as unknown as { data: { platformRoles: string[] } };
        expect(parsed.data.platformRoles).toEqual(['customer']);
      });
    await request(server)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer current.access.jwt')
      .expect(200);
    await request(server)
      .post('/api/auth/logout-all')
      .set('Authorization', 'Bearer current.access.jwt')
      .expect(200);
  });

  it('returns generic responses for forgot password and reset-token failures', async () => {
    authService.forgotPassword.mockResolvedValue({ accepted: true });
    authService.resetPassword.mockRejectedValue(
      new UnauthorizedException({
        message: 'Invalid or expired token',
        errors: [{ field: 'token', message: 'Token is invalid or expired' }],
      }),
    );

    await request(server)
      .post('/api/auth/forgot-password')
      .send({ email: 'missing@example.com' })
      .expect(202)
      .expect(({ body }) => {
        const parsed = body as unknown as { data: { accepted: boolean } };
        expect(parsed.data).toEqual({ accepted: true });
      });
    await request(server)
      .post('/api/auth/reset-password')
      .send({
        token: 'expired-action-token-value-that-is-long-enough',
        newPassword: 'replacement-password-value',
      })
      .expect(401);
  });

  it('returns generic login denial for a disabled account and 409 at the session limit', async () => {
    authService.login
      .mockRejectedValueOnce(
        new UnauthorizedException({
          message: 'Invalid email or password',
          errors: [{ field: 'credentials', message: 'Credentials are invalid' }],
        }),
      )
      .mockRejectedValueOnce(
        new ConflictException({
          message: 'Maximum active sessions reached',
          errors: [{ field: 'session', message: 'Log out another session before signing in' }],
        }),
      );

    await request(server)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'correct horse battery staple' })
      .expect(401);
    await request(server)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'correct horse battery staple' })
      .expect(409);
  });

  it('denies missing platform permission and cross-merchant access', async () => {
    authStore.hasPlatformPermissions.mockResolvedValue(false);
    authStore.hasMerchantPermissions.mockResolvedValue(false);
    const requestedMerchantId = '8f23e7f0-b381-4924-8464-42e78f949377';

    await request(server)
      .get('/api/test-authorization/platform')
      .set('Authorization', 'Bearer current.access.jwt')
      .expect(403);
    await request(server)
      .get(`/api/test-authorization/merchants/${requestedMerchantId}/orders`)
      .set('Authorization', 'Bearer current.access.jwt')
      .expect(403);
    expect(authStore.hasMerchantPermissions).toHaveBeenCalledWith(user.id, requestedMerchantId, [
      'merchant.orders.read',
    ]);
  });
});
