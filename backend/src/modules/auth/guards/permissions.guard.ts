import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  IS_PUBLIC_METADATA,
  MERCHANT_PERMISSIONS_METADATA,
  PLATFORM_PERMISSIONS_METADATA,
} from '../constants/auth.constants';
import type { MerchantPermissionRequirement } from '../decorators/permissions.decorator';
import { AuthStore } from '../services/auth.store';
import type { AuthenticatedRequest } from '../types/auth.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authStore: AuthStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    if (isPublic) {
      return true;
    }

    const platformPermissions = this.reflector.getAllAndOverride<string[]>(
      PLATFORM_PERMISSIONS_METADATA,
      [context.getHandler(), context.getClass()],
    );
    const merchantRequirement = this.reflector.getAllAndOverride<MerchantPermissionRequirement>(
      MERCHANT_PERMISSIONS_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!platformPermissions && !merchantRequirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const platformAllowed = platformPermissions
      ? await this.authStore.hasPlatformPermissions(request.auth.userId, platformPermissions)
      : true;
    const merchantId = merchantRequirement
      ? request.params[merchantRequirement.merchantParam]
      : undefined;
    const merchantAllowed = merchantRequirement
      ? typeof merchantId === 'string' &&
        (await this.authStore.hasMerchantPermissions(
          request.auth.userId,
          merchantId,
          merchantRequirement.permissions,
        ))
      : true;

    if (!platformAllowed || !merchantAllowed) {
      throw new ForbiddenException({
        message: 'Permission denied',
        errors: [{ field: 'permission', message: 'Required permission was not granted' }],
      });
    }

    return true;
  }
}
