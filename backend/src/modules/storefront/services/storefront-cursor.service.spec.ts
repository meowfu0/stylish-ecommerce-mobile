import { BadRequestException } from '@nestjs/common';

import { StorefrontCursorService } from './storefront-cursor.service';

const productId = '1225e286-8f17-46a9-a46d-10005ee467ab';

describe('StorefrontCursorService', () => {
  const service = new StorefrontCursorService();

  it('round-trips an opaque cursor for the same filters', () => {
    const query = { categorySlug: 'dresses', featured: true, sort: 'recommended' as const };
    const cursor = service.encode(query, 'recommended', {
      featured: true,
      id: productId,
      publishedAt: '2026-08-01T00:00:00.000Z',
    });

    expect(cursor).not.toContain(productId);
    expect(service.decode(cursor, query, 'recommended')).toEqual({
      featured: true,
      id: productId,
      publishedAt: '2026-08-01T00:00:00.000Z',
    });
  });

  it('rejects malformed cursors and reuse with different filters', () => {
    expect(() => service.decode('not-a-cursor', {}, 'latest')).toThrow(BadRequestException);
    const cursor = service.encode({ categorySlug: 'dresses' }, 'price_asc', {
      id: productId,
      price: 12_500,
    });

    expect(() => service.decode(cursor, { categorySlug: 'shoes' }, 'price_asc')).toThrow(
      BadRequestException,
    );
  });
});
