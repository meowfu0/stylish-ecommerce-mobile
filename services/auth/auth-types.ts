export type AuthUserSummary = {
  email: string;
  emailVerifiedAt: string | null;
  id: string;
  status: string;
};

export type AuthTokens = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  tokenType: "Bearer";
};

export type AuthenticatedUserContext = AuthUserSummary & {
  merchantMemberships: {
    defaultLocation?: string | null;
    merchantId: string;
    merchantName: string;
    merchantStatus?: string;
    membershipId: string;
    permissions?: string[];
    roles: string[];
    verified?: boolean;
  }[];
  platformRoles: string[];
  profile: {
    avatarStoragePath: string | null;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export type MessageAcceptedResult = {
  accepted: boolean;
};

export type LoginResult = {
  tokens: AuthTokens;
  user: AuthUserSummary;
};

export type RegistrationResult = {
  user: AuthUserSummary;
};
