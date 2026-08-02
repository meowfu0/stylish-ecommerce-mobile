import { StorefrontCacheService } from './storefront-cache.service';

describe('StorefrontCacheService', () => {
  it('uses cache hits and changes keys after a catalog revision', async () => {
    const values = new Map<string, unknown>();
    const redis = {
      getJson: jest.fn((key: string) => Promise.resolve(values.get(key) ?? null)),
      setJson: jest.fn((key: string, value: unknown) => {
        values.set(key, value);
        return Promise.resolve(true);
      }),
    };
    const service = new StorefrontCacheService(redis as never);
    const loader = jest.fn().mockResolvedValue({ items: [{ id: 'first' }] });

    await service.getOrLoad('products', { sort: 'latest' }, 30, true, loader);
    await service.getOrLoad('products', { sort: 'latest' }, 30, true, loader);

    expect(loader).toHaveBeenCalledTimes(1);

    values.set('storefront:catalog:revision', 1);
    await service.getOrLoad('products', { sort: 'latest' }, 30, true, loader);

    expect(loader).toHaveBeenCalledTimes(2);
    expect(redis.setJson).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 30);
  });

  it('does not cache loader errors', async () => {
    const redis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(true),
    };
    const service = new StorefrontCacheService(redis as never);

    await expect(
      service.getOrLoad('product-detail', { slug: 'missing' }, 60, true, () =>
        Promise.reject(new Error('not found')),
      ),
    ).rejects.toThrow('not found');
    expect(redis.setJson).not.toHaveBeenCalled();
  });
});
