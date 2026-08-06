import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  connectionTimeoutMs: Number(process.env.REDIS_CONNECTION_TIMEOUT_MS ?? 3000),
  defaultTtlSeconds: Number(process.env.REDIS_DEFAULT_TTL_SECONDS ?? 60),
  enabled: process.env.REDIS_ENABLED === 'true',
  idempotencyTtlSeconds: Number(process.env.REDIS_IDEMPOTENCY_TTL_SECONDS ?? 300),
  keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'stylish',
  lockTtlMs: Number(process.env.REDIS_LOCK_TTL_MS ?? 10_000),
  required: process.env.REDIS_REQUIRED === 'true',
  url: process.env.REDIS_URL?.trim() || undefined,
}));
