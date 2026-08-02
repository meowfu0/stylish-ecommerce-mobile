import { ServiceUnavailableException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import { REDIS_RATE_LIMIT_METADATA } from './redis-rate-limit.decorator';
import { RedisRateLimitGuard } from './redis-rate-limit.guard';
import type { RedisService } from './redis.service';

describe('RedisRateLimitGuard', () => {
  const options = { limit: 2, name: 'merchant-submit', windowMs: 60_000 };
  let headers: Record<string, string | number>;
  let redis: { incrementRateLimit: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };
  let context: ExecutionContext;

  beforeEach(() => {
    headers = {};
    redis = { incrementRateLimit: jest.fn() };
    reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === REDIS_RATE_LIMIT_METADATA ? options : undefined,
      ),
    };
    context = {
      getClass: jest.fn(),
      getHandler: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => ({ auth: { userId: 'user-1' }, ip: '127.0.0.1' }),
        getResponse: () => ({
          setHeader: (key: string, value: string | number) => {
            headers[key] = value;
          },
        }),
      }),
    } as unknown as ExecutionContext;
  });

  it('allows requests below the distributed limit and returns rate headers', async () => {
    redis.incrementRateLimit.mockResolvedValue({ count: 1, resetInMs: 59_000 });
    const guard = new RedisRateLimitGuard(
      reflector as unknown as Reflector,
      redis as unknown as RedisService,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(redis.incrementRateLimit).toHaveBeenCalledWith('merchant-submit:user-1', 60_000);
    expect(headers['RateLimit-Remaining']).toBe(1);
  });

  it('returns 429 above the limit and 503 when distributed protection is unavailable', async () => {
    const guard = new RedisRateLimitGuard(
      reflector as unknown as Reflector,
      redis as unknown as RedisService,
    );
    redis.incrementRateLimit.mockResolvedValueOnce({ count: 3, resetInMs: 30_000 });

    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 429 });

    redis.incrementRateLimit.mockResolvedValueOnce(null);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
