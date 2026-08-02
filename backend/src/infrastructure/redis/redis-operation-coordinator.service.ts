import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import { RedisService } from './redis.service';

@Injectable()
export class RedisOperationCoordinator {
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly lockTtlMs: number;

  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.lockTtlMs = configService.getOrThrow<number>('redis.lockTtlMs');
  }

  run<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);

    if (existing) {
      return existing as Promise<T>;
    }

    const pending = this.runCoordinated(key, operation).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, pending);
    return pending;
  }

  private async runCoordinated<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const token = randomUUID();
    const acquired = await this.redisService.acquireLock(key, token, this.lockTtlMs);

    try {
      // PostgreSQL row locks and constraints remain authoritative if another process owns the lock.
      return await operation();
    } finally {
      if (acquired) {
        await this.redisService.releaseLock(key, token);
      }
    }
  }
}
