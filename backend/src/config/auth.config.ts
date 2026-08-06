import { registerAs } from '@nestjs/config';

const MINUTES = 60;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;
const DEFAULT_MAX_ACTIVE_SESSIONS = 5;

export default registerAs('auth', () => {
  const maxActiveSessions =
    process.env.NODE_ENV === 'development'
      ? Number.MAX_SAFE_INTEGER
      : Number(process.env.AUTH_MAX_ACTIVE_SESSIONS ?? DEFAULT_MAX_ACTIVE_SESSIONS);

  return {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    issuer: process.env.JWT_ISSUER ?? 'stylish-api',
    audience: process.env.JWT_AUDIENCE ?? 'stylish-expo',
    accessTokenLifetimeSeconds: 15 * MINUTES,
    refreshTokenLifetimeSeconds: 30 * DAYS,
    emailVerificationLifetimeSeconds: 24 * HOURS,
    passwordResetLifetimeSeconds: 30 * MINUTES,
    // Local sign-in testing creates many short-lived sessions.
    // Production and tests retain the configured cap.
    maxActiveSessions,
    rateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000),
    frontendUrl: process.env.AUTH_FRONTEND_URL ?? 'stylish://auth',
  };
});
