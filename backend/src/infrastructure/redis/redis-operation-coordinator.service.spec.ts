import { ConfigService } from '@nestjs/config';

import type { RedisService } from './redis.service';
import { RedisOperationCoordinator } from './redis-operation-coordinator.service';

describe('RedisOperationCoordinator', () => {
  it('shares one local in-flight approval result and releases the distributed lock', async () => {
    const redis = {
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(undefined),
    };
    const coordinator = new RedisOperationCoordinator(
      new ConfigService({ redis: { lockTtlMs: 10_000 } }),
      redis as unknown as RedisService,
    );
    let releaseOperation!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseOperation = resolve;
    });
    const operation = jest.fn(async () => {
      await gate;
      return { merchantId: 'merchant-1' };
    });

    const first = coordinator.run('application-review:merchant-1', operation);
    const second = coordinator.run('application-review:merchant-1', operation);
    releaseOperation();

    await expect(Promise.all([first, second])).resolves.toEqual([
      { merchantId: 'merchant-1' },
      { merchantId: 'merchant-1' },
    ]);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(redis.acquireLock).toHaveBeenCalledTimes(1);
    expect(redis.releaseLock).toHaveBeenCalledTimes(1);
  });
});
