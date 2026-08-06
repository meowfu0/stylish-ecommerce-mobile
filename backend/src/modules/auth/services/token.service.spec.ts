import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { TokenService } from './token.service';

describe('TokenService', () => {
  const accessSecret = 'unit-test-access-secret-with-more-than-32-characters';
  const refreshSecret = 'unit-test-refresh-secret-that-is-clearly-different';
  const values: Record<string, unknown> = {
    'auth.accessSecret': accessSecret,
    'auth.refreshSecret': refreshSecret,
    'auth.issuer': 'stylish-api-test',
    'auth.audience': 'stylish-client-test',
    'auth.accessTokenLifetimeSeconds': 900,
    'auth.refreshTokenLifetimeSeconds': 2_592_000,
    'auth.emailVerificationLifetimeSeconds': 86_400,
    'auth.passwordResetLifetimeSeconds': 1_800,
  };
  const jwtService = new JwtService();
  const configService = {
    getOrThrow: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
  const service = new TokenService(jwtService, configService);

  it('issues separately signed access and refresh JWTs with validated claims', async () => {
    const pair = await service.createPair(
      '6dd661fa-487a-4f99-9f79-8433039cf469',
      '46acb46b-d07f-42c2-b20b-d55821ef811b',
      3,
    );
    const access = await service.verifyAccess(pair.accessToken);
    const refresh = await service.verifyRefresh(pair.refreshToken);

    expect(access).toEqual(
      expect.objectContaining({
        typ: 'access',
        av: 3,
        iss: 'stylish-api-test',
        aud: 'stylish-client-test',
      }),
    );
    expect(refresh).toEqual(
      expect.objectContaining({
        typ: 'refresh',
        jti: pair.refreshTokenId,
      }),
    );
    await expect(service.verifyRefresh(pair.accessToken)).rejects.toBeDefined();
    await expect(service.verifyAccess(pair.refreshToken)).rejects.toBeDefined();
  });

  it('rejects the wrong issuer and non-HS256 algorithms', async () => {
    const wrongIssuer = await jwtService.signAsync(
      {
        sid: '46acb46b-d07f-42c2-b20b-d55821ef811b',
        av: 0,
        typ: 'access',
      },
      {
        secret: accessSecret,
        algorithm: 'HS256',
        issuer: 'another-issuer',
        audience: 'stylish-client-test',
        subject: '6dd661fa-487a-4f99-9f79-8433039cf469',
        jwtid: '9d26d59a-f5c6-4457-8506-86a149a5e375',
        expiresIn: 900,
      },
    );
    const wrongAlgorithm = await jwtService.signAsync(
      {
        sid: '46acb46b-d07f-42c2-b20b-d55821ef811b',
        av: 0,
        typ: 'access',
      },
      {
        secret: accessSecret,
        algorithm: 'HS384',
        issuer: 'stylish-api-test',
        audience: 'stylish-client-test',
        subject: '6dd661fa-487a-4f99-9f79-8433039cf469',
        jwtid: '9d26d59a-f5c6-4457-8506-86a149a5e375',
        expiresIn: 900,
      },
    );

    await expect(service.verifyAccess(wrongIssuer)).rejects.toBeDefined();
    await expect(service.verifyAccess(wrongAlgorithm)).rejects.toBeDefined();
  });

  it('rejects expired tokens and a signed token with the wrong type', async () => {
    const expired = await jwtService.signAsync(
      {
        sid: '46acb46b-d07f-42c2-b20b-d55821ef811b',
        av: 0,
        typ: 'access',
      },
      {
        secret: accessSecret,
        algorithm: 'HS256',
        issuer: 'stylish-api-test',
        audience: 'stylish-client-test',
        subject: '6dd661fa-487a-4f99-9f79-8433039cf469',
        jwtid: '9d26d59a-f5c6-4457-8506-86a149a5e375',
        expiresIn: -1,
      },
    );
    const wrongType = await jwtService.signAsync(
      {
        sid: '46acb46b-d07f-42c2-b20b-d55821ef811b',
        av: 0,
        typ: 'refresh',
      },
      {
        secret: accessSecret,
        algorithm: 'HS256',
        issuer: 'stylish-api-test',
        audience: 'stylish-client-test',
        subject: '6dd661fa-487a-4f99-9f79-8433039cf469',
        jwtid: '9d26d59a-f5c6-4457-8506-86a149a5e375',
        expiresIn: 900,
      },
    );

    await expect(service.verifyAccess(expired)).rejects.toBeDefined();
    await expect(service.verifyAccess(wrongType)).rejects.toBeDefined();
  });

  it('creates high-entropy opaque action tokens and stable one-way hashes', () => {
    const first = service.createActionToken();
    const second = service.createActionToken();

    expect(first.rawToken).not.toBe(second.rawToken);
    expect(first.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(service.hashOpaqueToken(first.rawToken)).toBe(first.tokenHash);
    expect(first.tokenHash).not.toContain(first.rawToken);
  });
});
