import { ConfigService } from '@nestjs/config';

import { RedisService } from './redis.service';

const config = (overrides: Record<string, unknown> = {}): ConfigService =>
  new ConfigService({
    app: { nodeEnv: 'test' },
    redis: {
      connectionTimeoutMs: 50,
      defaultTtlSeconds: 60,
      enabled: false,
      keyPrefix: 'redis-test',
      required: false,
      url: undefined,
      ...overrides,
    },
  });

describe('RedisService', () => {
  it('provides cache, lock, and rate-limit behavior through the development fallback', async () => {
    const service = new RedisService(config());
    await service.onModuleInit();

    expect(service.usingMemoryFallback()).toBe(true);
    expect(await service.setJson('merchant-profile:merchant-1', { id: 'merchant-1' }, 60)).toBe(
      true,
    );
    await expect(service.getJson('merchant-profile:merchant-1')).resolves.toEqual({
      id: 'merchant-1',
    });

    expect(await service.acquireLock('approve:merchant-1', 'token-a', 1000)).toBe(true);
    expect(await service.acquireLock('approve:merchant-1', 'token-b', 1000)).toBe(false);
    await service.releaseLock('approve:merchant-1', 'token-b');
    expect(await service.acquireLock('approve:merchant-1', 'token-c', 1000)).toBe(false);
    await service.releaseLock('approve:merchant-1', 'token-a');
    expect(await service.acquireLock('approve:merchant-1', 'token-d', 1000)).toBe(true);

    await expect(service.incrementRateLimit('submit:user-1', 60_000)).resolves.toEqual(
      expect.objectContaining({ count: 1 }),
    );
    await expect(service.incrementRateLimit('submit:user-1', 60_000)).resolves.toEqual(
      expect.objectContaining({ count: 2 }),
    );
    await expect(service.increment('storefront:catalog:revision')).resolves.toBe(1);
    await expect(service.increment('storefront:catalog:revision')).resolves.toBe(2);
  });

  it('fails initialization clearly when required Redis cannot be reached', async () => {
    const service = new RedisService(
      config({ enabled: true, required: true, url: 'redis://127.0.0.1:1' }),
    );

    await expect(service.onModuleInit()).rejects.toThrow('Redis is required but unavailable');
    await service.onApplicationShutdown();
  });
});
