import { SetMetadata } from '@nestjs/common';

import {
  MERCHANT_PERMISSIONS_METADATA,
  PLATFORM_PERMISSIONS_METADATA,
} from '../constants/auth.constants';

export type MerchantPermissionRequirement = {
  merchantParam: string;
  permissions: string[];
};

export const RequirePlatformPermissions = (
  ...permissionKeys: string[]
): MethodDecorator & ClassDecorator => SetMetadata(PLATFORM_PERMISSIONS_METADATA, permissionKeys);

export const RequireMerchantPermissions = (
  merchantParam: string,
  ...permissionKeys: string[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(MERCHANT_PERMISSIONS_METADATA, {
    merchantParam,
    permissions: permissionKeys,
  } satisfies MerchantPermissionRequirement);
