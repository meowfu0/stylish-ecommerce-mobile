import { BadRequestException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { DatabaseService } from '../src/database/database.service';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { AuthStore } from '../src/modules/auth/services/auth.store';
import { MerchantCatalogService } from '../src/modules/catalog/services/merchant-catalog.service';

const userId = '6dd661fa-487a-4f99-9f79-8433039cf469';
const merchantId = '70c05986-977b-4434-b1cc-5db81e6df03d';
const otherMerchantId = '17fead4d-639f-4396-b63c-3874d3cb07e2';
const productId = '1225e286-8f17-46a9-a46d-10005ee467ab';
const optionId = '1ebc9a2d-70ba-4129-ac22-c109c8b19b14';
const valueId = '4607995e-7352-4a41-901a-02a53ba1afe7';
const variantId = '4058e896-7261-43e1-a3d1-48d7b84a1794';
const brandId = '75fbcaea-e5ed-44c6-8886-32823c239a22';
const categoryId = 'bd1bc25a-251a-4696-b806-33e199cf411a';
const collectionId = '96b8a5b4-4008-4cf2-9e5a-0207261602c3';
const principal = {
  authVersion: 0,
  email: 'owner@example.com',
  sessionId: '46acb46b-d07f-42c2-b20b-d55821ef811b',
  userId,
};
const product = {
  availableStock: 0,
  brandId: null,
  categoryIds: [categoryId],
  collectionIds: [],
  createdAt: '2026-07-31T00:00:00.000Z',
  description: 'A complete product description.',
  id: productId,
  isFeatured: false,
  merchantId,
  name: 'Linen Wrap Dress',
  options: [],
  primaryCategoryId: categoryId,
  publishedAt: null,
  shortDescription: null,
  slug: 'linen-wrap-dress',
  status: 'DRAFT',
  stockStatus: 'OUT_OF_STOCK',
  updatedAt: '2026-07-31T00:00:00.000Z',
  variants: [],
};
const catalogMethods = [
  'archiveProduct',
  'createBrand',
  'createCollection',
  'createOption',
  'createOptionValue',
  'createProduct',
  'createVariant',
  'deactivateProduct',
  'getBrand',
  'getCategory',
  'getCollection',
  'getProduct',
  'listBrands',
  'listCategories',
  'listCollections',
  'listProducts',
  'publishProduct',
  'updateBrand',
  'updateCollection',
  'updateOption',
  'updateOptionValue',
  'updateProduct',
  'updateVariant',
] as const;
type CatalogServiceMock = Record<(typeof catalogMethods)[number], jest.Mock>;

describe('Merchant catalog endpoints (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let authService: { validateAccessToken: jest.Mock };
  let authStore: { hasMerchantPermissions: jest.Mock; hasPlatformPermissions: jest.Mock };
  let catalogService: CatalogServiceMock;

  beforeAll(async () => {
    authService = { validateAccessToken: jest.fn() };
    authStore = {
      hasMerchantPermissions: jest.fn(),
      hasPlatformPermissions: jest.fn(),
    };
    catalogService = Object.fromEntries(
      catalogMethods.map((method) => [method, jest.fn()]),
    ) as CatalogServiceMock;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({ checkConnection: jest.fn().mockResolvedValue(true) })
      .overrideProvider(AuthService)
      .useValue(authService)
      .overrideProvider(AuthStore)
      .useValue(authStore)
      .overrideProvider(MerchantCatalogService)
      .useValue(catalogService)
      .compile();

    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    authService.validateAccessToken.mockReset().mockResolvedValue(principal);
    authStore.hasMerchantPermissions.mockReset().mockResolvedValue(true);
    authStore.hasPlatformPermissions.mockReset().mockResolvedValue(true);

    for (const mock of Object.values(catalogService)) {
      mock.mockReset();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates an idempotent draft and lists filtered products', async () => {
    catalogService.createProduct.mockResolvedValue(product);
    catalogService.listProducts.mockResolvedValue({ items: [product], nextCursor: null });

    await request(server)
      .post(`/api/merchants/${merchantId}/catalog/products`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'create-product-001')
      .send({
        categoryIds: [categoryId],
        description: 'A complete product description.',
        name: 'Linen Wrap Dress',
        slug: 'linen-wrap-dress',
      })
      .expect(201)
      .expect(({ body }) => {
        const parsed = body as unknown as { data: { id: string; status: string } };
        expect(parsed.data).toEqual(expect.objectContaining({ id: productId, status: 'DRAFT' }));
      });
    await request(server)
      .get(
        `/api/merchants/${merchantId}/catalog/products?status=DRAFT&categoryId=${categoryId}&stockStatus=OUT_OF_STOCK&limit=25`,
      )
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(200);

    expect(catalogService.createProduct).toHaveBeenCalledWith(
      userId,
      merchantId,
      expect.objectContaining({ slug: 'linen-wrap-dress' }),
      'create-product-001',
      expect.any(Object),
    );
    expect(authStore.hasMerchantPermissions).toHaveBeenCalledWith(userId, merchantId, [
      'products.write',
    ]);
  });

  it('supports brands, global category reads, collections, options, values, and variants', async () => {
    catalogService.createBrand.mockResolvedValue({ id: brandId });
    catalogService.listCategories.mockResolvedValue({ items: [{ id: categoryId }] });
    catalogService.createCollection.mockResolvedValue({ id: collectionId });
    catalogService.createOption.mockResolvedValue(product);
    catalogService.createOptionValue.mockResolvedValue(product);
    catalogService.createVariant.mockResolvedValue(product);

    await request(server)
      .post(`/api/merchants/${merchantId}/catalog/brands`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .send({ name: 'Lumiere', slug: 'lumiere' })
      .expect(201);
    await request(server)
      .get(`/api/merchants/${merchantId}/catalog/categories`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(200);
    await request(server)
      .post(`/api/merchants/${merchantId}/catalog/collections`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .send({ name: 'Summer Edit', productIds: [productId], slug: 'summer-edit' })
      .expect(201);
    await request(server)
      .post(`/api/merchants/${merchantId}/catalog/products/${productId}/options`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .send({ name: 'Color' })
      .expect(201);
    await request(server)
      .post(`/api/merchants/${merchantId}/catalog/products/${productId}/options/${optionId}/values`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .send({ displayLabel: 'Black', value: 'black' })
      .expect(201);
    await request(server)
      .post(`/api/merchants/${merchantId}/catalog/products/${productId}/variants`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .send({
        name: 'Black',
        optionValueIds: [valueId],
        priceCentavos: 129_900,
        sku: 'DRESS-BLK',
      })
      .expect(201);
  });

  it('publishes, deactivates, and archives with the publish permission and idempotency key', async () => {
    catalogService.publishProduct.mockResolvedValue({
      ...product,
      publishedAt: '2026-07-31T01:00:00.000Z',
      status: 'ACTIVE',
    });
    catalogService.deactivateProduct.mockResolvedValue({ ...product, status: 'INACTIVE' });
    catalogService.archiveProduct.mockResolvedValue({ ...product, status: 'ARCHIVED' });

    for (const action of ['publish', 'deactivate', 'archive']) {
      await request(server)
        .post(`/api/merchants/${merchantId}/catalog/products/${productId}/${action}`)
        .set('Authorization', 'Bearer owner.access.jwt')
        .set('Idempotency-Key', `${action}-product-001`)
        .expect(200);
    }
    expect(authStore.hasMerchantPermissions).toHaveBeenLastCalledWith(userId, merchantId, [
      'products.publish',
    ]);
  });

  it('returns publication validation errors without leaking internals', async () => {
    catalogService.publishProduct.mockRejectedValue(
      new BadRequestException({
        message: 'Product cannot be published',
        errors: [{ field: 'variants', message: 'At least one active variant is required' }],
      }),
    );

    await request(server)
      .post(`/api/merchants/${merchantId}/catalog/products/${productId}/publish`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'publish-incomplete-001')
      .expect(400)
      .expect(({ body }) => {
        expect(body).toEqual({
          success: false,
          message: 'Product cannot be published',
          errors: [{ field: 'variants', message: 'At least one active variant is required' }],
        });
      });
  });

  it('denies missing permissions and cross-merchant access before service execution', async () => {
    authStore.hasMerchantPermissions.mockResolvedValue(false);

    await request(server)
      .get(`/api/merchants/${otherMerchantId}/catalog/products/${productId}`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(403);
    await request(server)
      .post(`/api/merchants/${merchantId}/catalog/products/${productId}/publish`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'publish-denied-001')
      .expect(403);

    expect(catalogService.getProduct).not.toHaveBeenCalled();
    expect(catalogService.publishProduct).not.toHaveBeenCalled();
  });

  it('preserves the idempotency key across repeated and concurrent lifecycle requests', async () => {
    let resolveShared!: (value: unknown) => void;
    const shared = new Promise((resolve) => {
      resolveShared = resolve;
    });
    catalogService.publishProduct.mockReturnValue(shared);
    const first = request(server)
      .post(`/api/merchants/${merchantId}/catalog/products/${productId}/publish`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'publish-concurrent-001');
    const second = request(server)
      .post(`/api/merchants/${merchantId}/catalog/products/${productId}/publish`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'publish-concurrent-001');

    resolveShared({ ...product, status: 'ACTIVE' });
    const responses = await Promise.all([first, second]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(catalogService.publishProduct).toHaveBeenCalledTimes(2);
    const calls = catalogService.publishProduct.mock.calls as unknown[][];
    expect(calls.every((call) => call[3] === 'publish-concurrent-001')).toBe(true);
  });

  it('rejects invalid product payloads and identifiers', async () => {
    await request(server)
      .post(`/api/merchants/${merchantId}/catalog/products`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'invalid-product-001')
      .send({ name: '', slug: 'INVALID SLUG', status: 'ACTIVE' })
      .expect(400);
    await request(server)
      .patch(`/api/merchants/${merchantId}/catalog/products/${productId}/variants/${variantId}`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .send({ priceCentavos: -1 })
      .expect(400);
  });
});
