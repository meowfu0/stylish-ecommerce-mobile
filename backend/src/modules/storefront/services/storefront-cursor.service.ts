import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import type { StorefrontProductListQueryDto } from '../dto/storefront-request.dto';
import type { StorefrontSort } from '../storefront.constants';

export type StorefrontCursorKey = {
  featured?: boolean;
  id: string;
  name?: string;
  price?: number;
  publishedAt?: string;
};

type StorefrontCursorPayload = {
  filter: string;
  key: StorefrontCursorKey;
  sort: StorefrontSort;
  version: 1;
};

@Injectable()
export class StorefrontCursorService {
  encode(
    query: StorefrontProductListQueryDto,
    sort: StorefrontSort,
    key: StorefrontCursorKey,
  ): string {
    const payload: StorefrontCursorPayload = {
      filter: this.filterFingerprint(query, sort),
      key,
      sort,
      version: 1,
    };

    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  decode(
    cursor: string | undefined,
    query: StorefrontProductListQueryDto,
    sort: StorefrontSort,
  ): StorefrontCursorKey | null {
    if (!cursor) return null;

    try {
      const payload = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as Partial<StorefrontCursorPayload>;

      if (
        payload.version !== 1 ||
        payload.sort !== sort ||
        payload.filter !== this.filterFingerprint(query, sort) ||
        !payload.key ||
        !this.isUuid(payload.key.id)
      ) {
        throw new Error('Invalid cursor payload');
      }
      this.assertSortKey(payload.key, sort);
      return payload.key;
    } catch {
      throw new BadRequestException({
        message: 'Invalid storefront cursor',
        errors: [{ field: 'cursor', message: 'Cursor is invalid for this query' }],
      });
    }
  }

  fingerprint(query: StorefrontProductListQueryDto, sort: StorefrontSort): string {
    return this.filterFingerprint(query, sort);
  }

  private filterFingerprint(query: StorefrontProductListQueryDto, sort: StorefrontSort): string {
    const normalized = {
      brandId: query.brandId ?? null,
      categorySlug: query.categorySlug ?? null,
      collectionSlug: query.collectionSlug ?? null,
      featured: query.featured ?? null,
      inStockOnly: query.inStockOnly ?? false,
      maxPriceCentavos: query.maxPriceCentavos ?? null,
      merchantSlug: query.merchantSlug ?? null,
      minPriceCentavos: query.minPriceCentavos ?? null,
      search: query.search?.toLowerCase() ?? null,
      sort,
    };

    return createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 24);
  }

  private assertSortKey(key: StorefrontCursorKey, sort: StorefrontSort): void {
    if (
      (sort === 'recommended' &&
        (typeof key.featured !== 'boolean' || !this.isDate(key.publishedAt))) ||
      (sort === 'latest' && !this.isDate(key.publishedAt)) ||
      ((sort === 'price_asc' || sort === 'price_desc') &&
        (!Number.isInteger(key.price) || (key.price ?? -1) < 0)) ||
      (sort === 'name' && (typeof key.name !== 'string' || key.name.length === 0))
    ) {
      throw new Error('Invalid cursor key');
    }
  }

  private isDate(value: unknown): value is string {
    return typeof value === 'string' && !Number.isNaN(Date.parse(value));
  }

  private isUuid(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    );
  }
}
