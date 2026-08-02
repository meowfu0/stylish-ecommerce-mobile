import type { Request } from 'express';

export type AuthTokenType = 'access' | 'refresh';

export type AuthJwtPayload = {
  sub: string;
  sid: string;
  av: number;
  typ: AuthTokenType;
  jti: string;
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
};

export type AuthPrincipal = {
  userId: string;
  sessionId: string;
  authVersion: number;
  email: string;
};

export type AuthenticatedRequest = Request & {
  auth: AuthPrincipal;
};

export type RequestMetadata = {
  requestId?: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
};

export type AuthTokenPair = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  refreshTokenId: string;
};

export type UserAuthRecord = {
  id: string;
  email: string;
  passwordHash: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'DISABLED';
  emailVerifiedAt: Date | null;
  authVersion: number;
  deletedAt: Date | null;
};

export type AccessPrincipalResult =
  { kind: 'VALID'; principal: AuthPrincipal } | { kind: 'INVALID' };

export type SessionCreationResult =
  { kind: 'CREATED' } | { kind: 'SESSION_LIMIT' } | { kind: 'INVALID_USER' };

export type RefreshRotationResult =
  { kind: 'ROTATED'; user: UserAuthRecord } | { kind: 'REUSED' } | { kind: 'INVALID' };

export type ActionTokenConsumptionResult =
  { kind: 'CONSUMED'; userId: string } | { kind: 'INVALID' };

export type AuthMeResult = {
  id: string;
  email: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'DISABLED';
  emailVerifiedAt: Date | null;
  profile: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarStoragePath: string | null;
  } | null;
  platformRoles: string[];
  merchantMemberships: Array<{
    merchantId: string;
    merchantName: string;
    membershipId: string;
    roles: string[];
  }>;
};
