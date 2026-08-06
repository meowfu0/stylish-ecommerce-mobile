import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  STOREFRONT_CATALOG_REVISION_KEY,
  STOREFRONT_STOCK_REVISION_KEY,
} from '../storefront.constants';

@Injectable()
export class StorefrontCacheService {
  constructor(private readonly redisService: RedisService) {}

  async getOrLoad<T>(
    namespace: string,
    input: unknown,
    ttlSeconds: number,
    includeStock: boolean,
    loader: () => Promise<T>,
  ): Promise<T> {
    const [catalogRevision, stockRevision] = await Promise.all([
      this.revision(STOREFRONT_CATALOG_REVISION_KEY),
      includeStock ? this.revision(STOREFRONT_STOCK_REVISION_KEY) : Promise.resolve(0),
    ]);
    const key = `storefront:${namespace}:c${catalogRevision}:s${stockRevision}:${this.hash(input)}`;
    const cached = await this.redisService.getJson<T>(key);

    if (cached !== null) return cached;

    const value = await loader();
    await this.redisService.setJson(key, value, ttlSeconds);
    return value;
  }

  private async revision(key: string): Promise<number> {
    const value = await this.redisService.getJson<number>(key);
    return Number.isInteger(value) && (value ?? -1) >= 0 ? (value as number) : 0;
  }

  private hash(input: unknown): string {
    return createHash('sha256').update(this.stableStringify(input)).digest('hex').slice(0, 32);
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`)
        .join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
  }
}
