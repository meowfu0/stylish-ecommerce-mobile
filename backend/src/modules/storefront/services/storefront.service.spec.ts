import { BadRequestException } from '@nestjs/common';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

import { StorefrontCursorService } from './storefront-cursor.service';
import { StorefrontService } from './storefront.service';

describe('StorefrontService', () => {
  const execute = jest.fn<Promise<{ rows: unknown[] }>, [SQL]>();
  const cache = {
    getOrLoad: jest.fn(
      (_namespace: string, _input: unknown, _ttl: number, _stock: boolean, loader: () => unknown) =>
        Promise.resolve(loader()),
    ),
  };
  const storage = { createSignedReadUrl: jest.fn() };
  const service = new StorefrontService(
    cache as never,
    new StorefrontCursorService(),
    { db: { execute } } as never,
    storage as never,
  );

  beforeEach(() => {
    execute.mockReset();
    storage.createSignedReadUrl.mockReset();
  });

  it('hard-codes public visibility, confirmed images, and tenant joins in listing SQL', async () => {
    execute.mockResolvedValue({ rows: [] });

    await service.listProducts({
      brandId: 'e63c10e0-b0ae-44cc-a67f-73506b390521',
      categorySlug: 'dresses',
      collectionSlug: 'summer-edit',
      featured: true,
      inStockOnly: true,
      maxPriceCentavos: 50_000,
      merchantSlug: 'lumiere',
      minPriceCentavos: 10_000,
      search: 'linen',
    });

    const statement = execute.mock.lastCall?.[0];

    if (!statement) {
      throw new Error('Expected storefront SQL to execute');
    }
    const query = new PgDialect().sqlToQuery(statement).sql;

    expect(query).toContain("product.status = 'ACTIVE'");
    expect(query).toContain("merchant.status = 'ACTIVE'");
    expect(query).toContain("merchant.verification_status = 'VERIFIED'");
    expect(query).toContain("image.status = 'CONFIRMED'");
    expect(query).toContain('product_category.merchant_id = product.merchant_id');
    expect(query).toContain('collection_product.merchant_id = product.merchant_id');
    expect(query).toContain('price_variant.is_active = true');
    expect(query).toContain('location.is_active = true');
    expect(query).not.toContain('inventory_movements');
  });

  it('returns only a signed image URL and never the internal storage path', async () => {
    execute.mockResolvedValue({
      rows: [
        {
          availableStock: 3,
          brandDescription: null,
          brandId: null,
          brandName: null,
          brandSlug: null,
          description: 'Private mapping input',
          imageAltText: 'Linen dress',
          imageId: '8078fa64-b928-4de2-9056-4cbe839879ee',
          imageStoragePath: 'merchants/internal/product/image.jpg',
          isFeatured: true,
          maxPriceCentavos: 25_000,
          merchantDisplayName: 'Lumiere',
          merchantId: '70c05986-977b-4434-b1cc-5db81e6df03d',
          merchantSlug: 'lumiere',
          minPriceCentavos: 25_000,
          name: 'Linen Dress',
          productId: '1225e286-8f17-46a9-a46d-10005ee467ab',
          productSlug: 'lumiere-linen-dress',
          publishedAt: new Date('2026-08-01T00:00:00.000Z'),
          shortDescription: 'Summer linen',
          stockStatus: 'IN_STOCK',
        },
      ],
    });
    storage.createSignedReadUrl.mockResolvedValue({
      expiresAt: '2026-08-01T00:05:00.000Z',
      signedUrl: 'https://signed.example.test/image',
    });

    const result = await service.listProducts({});

    expect(result.items[0]?.primaryImage?.signedUrl).toBe('https://signed.example.test/image');
    expect(JSON.stringify(result)).not.toContain('merchants/internal');
  });

  it('rejects an inverted price range before querying PostgreSQL', () => {
    expect(() => service.listProducts({ maxPriceCentavos: 100, minPriceCentavos: 200 })).toThrow(
      BadRequestException,
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
