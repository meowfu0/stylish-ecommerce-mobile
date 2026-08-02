export const IS_PUBLIC_METADATA = 'auth:is-public';
export const PLATFORM_PERMISSIONS_METADATA = 'auth:platform-permissions';
export const MERCHANT_PERMISSIONS_METADATA = 'auth:merchant-permissions';

export const AUTH_RATE_LIMITS = {
  register: 5,
  login: 10,
  refresh: 20,
  actionToken: 5,
  logout: 20,
} as const;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
