import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import type { AuthService } from '../services/auth.service';
import { AccessTokenGuard } from './access-token.guard';

describe('AccessTokenGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let authService: { validateAccessToken: jest.Mock };
  let request: {
    auth?: unknown;
    header: jest.Mock;
    method: string;
    path: string;
  };
  let context: ExecutionContext;
  let guard: AccessTokenGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    authService = { validateAccessToken: jest.fn() };
    request = {
      header: jest.fn(),
      method: 'GET',
      path: '/api/auth/me',
    };
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
        getResponse: () => ({ getHeader: jest.fn().mockReturnValue('request-id') }),
      }),
    } as unknown as ExecutionContext;
    guard = new AccessTokenGuard(
      reflector as unknown as Reflector,
      authService as unknown as AuthService,
    );
  });

  it('allows public routes without inspecting authorization', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.header).not.toHaveBeenCalled();
  });

  it('rejects a missing authorization header', async () => {
    request.header.mockReturnValue(undefined);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authService.validateAccessToken).not.toHaveBeenCalled();
  });

  it('rejects malformed bearer authorization', async () => {
    request.header.mockReturnValue('Token invalid');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authService.validateAccessToken).not.toHaveBeenCalled();
  });

  it('attaches the validated principal', async () => {
    const principal = {
      authVersion: 0,
      email: 'customer@example.com',
      sessionId: 'session-id',
      userId: 'user-id',
    };
    request.header.mockReturnValue('Bearer access-token');
    authService.validateAccessToken.mockResolvedValue(principal);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.validateAccessToken).toHaveBeenCalledWith('access-token');
    expect(request.auth).toEqual(principal);
  });
});
