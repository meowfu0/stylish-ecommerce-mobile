import { SetMetadata } from '@nestjs/common';

export const REDIS_RATE_LIMIT_METADATA = 'redis-rate-limit';

export type RedisRateLimitOptions = {
  limit: number;
  name: string;
  windowMs: number;
};

export const RedisRateLimit = (options: RedisRateLimitOptions): MethodDecorator & ClassDecorator =>
  SetMetadata(REDIS_RATE_LIMIT_METADATA, options);
