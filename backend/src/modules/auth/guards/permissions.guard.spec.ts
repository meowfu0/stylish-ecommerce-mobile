import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import {
  IS_PUBLIC_METADATA,
  MERCHANT_PERMISSIONS_METADATA,
  PLATFORM_PERMISSIONS_METADATA,
} from '../constants/auth.constants';
import type { AuthStore } from '../services/auth.store';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const userId = '6dd661fa-487a-4f99-9f79-8433039cf469';
  const authorizedMerchantId = '70c05986-977b-4434-b1cc-5db81e6df03d';
  const requestedMerchantId = '8f23e7f0-b381-4924-8464-42e78f949377';
  let reflector: { getAllAndOverride: jest.Mock };
  let authStore: {
    hasPlatformPermissions: jest.Mock;
    hasMerchantPermissions: jest.Mock;
  };
  let guard: PermissionsGuard;
  let context: ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    authStore = {
      hasPlatformPermissions: jest.fn(),
      hasMerchantPermissions: jest.fn(),
    };
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => ({
          auth: { userId },
          params: { merchantId: requestedMerchantId },
        }),
      }),
    } as unknown as ExecutionContext;
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      authStore as unknown as AuthStore,
    );
  });

  it('denies a merchant permission when membership belongs to another tenant', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_METADATA || key === PLATFORM_PERMISSIONS_METADATA) {
        return undefined;
      }

      if (key === MERCHANT_PERMISSIONS_METADATA) {
        return {
          merchantParam: 'merchantId',
          permissions: ['merchant.orders.read'],
        };
      }

      return undefined;
    });
    authStore.hasMerchantPermissions.mockImplementation((_userId: string, merchantId: string) =>
      Promise.resolve(merchantId === authorizedMerchantId),
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(authStore.hasMerchantPermissions).toHaveBeenCalledWith(userId, requestedMerchantId, [
      'merchant.orders.read',
    ]);
  });

  it('defaults to denial when a declared platform permission is missing', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === PLATFORM_PERMISSIONS_METADATA) {
        return ['platform.users.manage'];
      }

      return undefined;
    });
    authStore.hasPlatformPermissions.mockResolvedValue(false);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
