import { registerAs } from '@nestjs/config';

const MINUTES = 60;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

export default registerAs('auth', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  issuer: process.env.JWT_ISSUER ?? 'stylish-api',
  audience: process.env.JWT_AUDIENCE ?? 'stylish-expo',
  accessTokenLifetimeSeconds: 15 * MINUTES,
  refreshTokenLifetimeSeconds: 30 * DAYS,
  emailVerificationLifetimeSeconds: 24 * HOURS,
  passwordResetLifetimeSeconds: 30 * MINUTES,
  maxActiveSessions: Number(process.env.AUTH_MAX_ACTIVE_SESSIONS ?? 5),
  rateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000),
  frontendUrl: process.env.AUTH_FRONTEND_URL ?? 'stylish://auth',
}));
