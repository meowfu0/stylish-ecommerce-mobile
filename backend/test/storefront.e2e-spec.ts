import { NotFoundException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { StorefrontService } from '../src/modules/storefront/services/storefront.service';

const brandId = 'e63c10e0-b0ae-44cc-a67f-73506b390521';
const merchantId = '70c05986-977b-4434-b1cc-5db81e6df03d';
const productId = '1225e286-8f17-46a9-a46d-10005ee467ab';
const imageId = '8078fa64-b928-4de2-9056-4cbe839879ee';
const merchant = { displayName: 'Lumiere', id: merchantId, slug: 'lumiere' };
const product = {
  brand: { description: null, id: brandId, name: 'Lumiere Studio', slug: 'lumiere-studio' },
  currency: 'PHP',
  isFeatured: true,
  maxPriceCentavos: 25_000,
  merchant,
  minPriceCentavos: 25_000,
  name: 'Linen Dress',
  primaryImage: {
    altText: 'Black linen dress',
    expiresAt: '2026-08-01T00:05:00.000Z',
    id: imageId,
    signedUrl: 'https://signed.example.test/read',
  },
  productId,
  publishedAt: '2026-08-01T00:00:00.000Z',
  shortDescription: 'Summer linen',
  slug: 'lumiere-linen-dress',
  stockStatus: 'IN_STOCK',
};
const productList = { items: [product], nextCursor: 'opaque-next-cursor' };
const serviceMethods = [
  'getCollection',
  'getMerchant',
  'getProduct',
  'listBrands',
  'listCategories',
  'listCategoryProducts',
  'listCollections',
  'listMerchantProducts',
  'listProducts',
] as const;
type StorefrontServiceMock = Record<(typeof serviceMethods)[number], jest.Mock>;

describe('Customer storefront endpoints (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let authService: { validateAccessToken: jest.Mock };
  let redis: { incrementRateLimit: jest.Mock };
  let storefront: StorefrontServiceMock;

  beforeAll(async () => {
    authService = { validateAccessToken: jest.fn() };
    redis = { incrementRateLimit: jest.fn() };
    storefront = Object.fromEntries(
      serviceMethods.map((method) => [method, jest.fn()]),
    ) as StorefrontServiceMock;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({ checkConnection: jest.fn().mockResolvedValue(true) })
      .overrideProvider(AuthService)
      .useValue(authService)
      .overrideProvider(RedisService)
      .useValue(redis)
      .overrideProvider(StorefrontService)
      .useValue(storefront)
      .compile();

    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    authService.validateAccessToken.mockReset();
    redis.incrementRateLimit.mockReset().mockResolvedValue({ count: 1, resetInMs: 60_000 });
    Object.values(storefront).forEach((mock) => mock.mockReset());
    storefront.listProducts.mockResolvedValue(productList);
    storefront.getProduct.mockResolvedValue({
      ...product,
      categories: [],
      collections: [],
      description: 'Full description',
      options: [],
      variants: [],
    });
    storefront.listCategories.mockResolvedValue({ items: [] });
    storefront.listCategoryProducts.mockResolvedValue(productList);
    storefront.listCollections.mockResolvedValue({ items: [] });
    storefront.getCollection.mockResolvedValue({
      description: null,
      endsAt: null,
      id: '8913e286-8f17-46a9-a46d-10005ee467ab',
      merchant,
      name: 'Summer Edit',
      products: productList,
      slug: 'summer-edit',
      startsAt: null,
    });
    storefront.listBrands.mockResolvedValue({ items: [] });
    storefront.getMerchant.mockResolvedValue({
      ...merchant,
      currency: 'PHP',
      description: 'Public merchant description',
      websiteUrl: 'https://merchant.example.test',
    });
    storefront.listMerchantProducts.mockResolvedValue(productList);
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes all storefront reads publicly without invoking access-token validation', async () => {
    await request(server).get('/api/storefront/products').expect(200);
    await request(server).get('/api/storefront/products/lumiere-linen-dress').expect(200);
    await request(server).get('/api/storefront/categories').expect(200);
    await request(server).get('/api/storefront/categories/dresses/products').expect(200);
    await request(server).get('/api/storefront/collections').expect(200);
    await request(server).get('/api/storefront/collections/summer-edit').expect(200);
    await request(server).get('/api/storefront/brands').expect(200);
    await request(server).get('/api/storefront/merchants/lumiere').expect(200);
    await request(server).get('/api/storefront/merchants/lumiere/products').expect(200);

    expect(authService.validateAccessToken).not.toHaveBeenCalled();
  });

  it('validates and transforms product filters before forwarding them', async () => {
    await request(server)
      .get('/api/storefront/products')
      .query({
        brandId,
        categorySlug: 'Dresses',
        collectionSlug: 'Summer-Edit',
        featured: 'true',
        inStockOnly: 'true',
        limit: '10',
        maxPriceCentavos: '50000',
        merchantSlug: 'Lumiere',
        minPriceCentavos: '10000',
        search: ' linen ',
        sort: 'price_asc',
      })
      .expect(200)
      .expect(({ body }) => {
        expect((body as { data: typeof productList }).data.nextCursor).toBe('opaque-next-cursor');
      });

    expect(storefront.listProducts).toHaveBeenCalledWith({
      brandId,
      categorySlug: 'dresses',
      collectionSlug: 'summer-edit',
      featured: true,
      inStockOnly: true,
      limit: 10,
      maxPriceCentavos: 50_000,
      merchantSlug: 'lumiere',
      minPriceCentavos: 10_000,
      search: 'linen',
      sort: 'price_asc',
    });
  });

  it('rejects invalid queries before executing the storefront service', async () => {
    await request(server).get('/api/storefront/products?limit=0').expect(400);
    await request(server).get('/api/storefront/products?inStockOnly=maybe').expect(400);
    await request(server).get('/api/storefront/products?unexpected=private').expect(400);

    expect(storefront.listProducts).not.toHaveBeenCalled();
  });

  it('returns safe not-found responses for unpublished or cross-merchant resources', async () => {
    storefront.getProduct.mockRejectedValueOnce(new NotFoundException('Product not found'));
    storefront.listMerchantProducts.mockRejectedValueOnce(
      new NotFoundException('Merchant not found'),
    );

    await request(server).get('/api/storefront/products/draft-product').expect(404);
    await request(server).get('/api/storefront/merchants/another-merchant/products').expect(404);
  });

  it('applies the public distributed rate limit and returns retry headers', async () => {
    redis.incrementRateLimit.mockResolvedValueOnce({ count: 121, resetInMs: 15_000 });

    await request(server).get('/api/storefront/products').expect('Retry-After', '15').expect(429);

    expect(storefront.listProducts).not.toHaveBeenCalled();
  });
});
