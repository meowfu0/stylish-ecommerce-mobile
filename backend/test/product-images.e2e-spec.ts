import { ServiceUnavailableException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { DatabaseService } from '../src/database/database.service';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { AuthStore } from '../src/modules/auth/services/auth.store';
import { ProductImagesService } from '../src/modules/catalog/images/services/product-images.service';

const userId = '6dd661fa-487a-4f99-9f79-8433039cf469';
const merchantId = '70c05986-977b-4434-b1cc-5db81e6df03d';
const otherMerchantId = '17fead4d-639f-4396-b63c-3874d3cb07e2';
const productId = '1225e286-8f17-46a9-a46d-10005ee467ab';
const imageId = '8078fa64-b928-4de2-9056-4cbe839879ee';
const principal = {
  authVersion: 0,
  email: 'owner@example.com',
  sessionId: '46acb46b-d07f-42c2-b20b-d55821ef811b',
  userId,
};
const image = {
  altText: 'Black linen dress',
  confirmedAt: '2026-07-31T00:00:00.000Z',
  contentType: 'image/jpeg',
  createdAt: '2026-07-31T00:00:00.000Z',
  displayOrder: 0,
  id: imageId,
  isPrimary: true,
  merchantId,
  productId,
  readUrlExpiresAt: '2026-07-31T00:05:00.000Z',
  signedUrl: 'https://signed.example.test/read',
  sizeBytes: 2048,
  updatedAt: '2026-07-31T00:00:00.000Z',
};
const serviceMethods = [
  'confirmUpload',
  'createSignedReadUrl',
  'deleteImage',
  'initializeUpload',
  'listImages',
  'reorderImages',
  'setPrimary',
  'updateImage',
] as const;
type ProductImagesServiceMock = Record<(typeof serviceMethods)[number], jest.Mock>;

describe('Merchant product image endpoints (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let authService: { validateAccessToken: jest.Mock };
  let authStore: { hasMerchantPermissions: jest.Mock; hasPlatformPermissions: jest.Mock };
  let imageService: ProductImagesServiceMock;

  beforeAll(async () => {
    authService = { validateAccessToken: jest.fn() };
    authStore = {
      hasMerchantPermissions: jest.fn(),
      hasPlatformPermissions: jest.fn(),
    };
    imageService = Object.fromEntries(
      serviceMethods.map((method) => [method, jest.fn()]),
    ) as ProductImagesServiceMock;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({ checkConnection: jest.fn().mockResolvedValue(true) })
      .overrideProvider(AuthService)
      .useValue(authService)
      .overrideProvider(AuthStore)
      .useValue(authStore)
      .overrideProvider(ProductImagesService)
      .useValue(imageService)
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
    Object.values(imageService).forEach((mock) => mock.mockReset());
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists confirmed images using products.read', async () => {
    imageService.listImages.mockResolvedValue({ items: [image] });

    await request(server)
      .get(`/api/merchants/${merchantId}/catalog/products/${productId}/images`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(200)
      .expect(({ body }) => {
        expect((body as { data: { items: unknown[] } }).data.items).toHaveLength(1);
      });

    expect(authStore.hasMerchantPermissions).toHaveBeenCalledWith(userId, merchantId, [
      'products.read',
    ]);
  });

  it('initializes a validated idempotent signed upload without accepting a filename or path', async () => {
    imageService.initializeUpload.mockResolvedValue({
      contentType: 'image/jpeg',
      expiresAt: '2026-07-31T02:00:00.000Z',
      fileSizeBytes: 2048,
      imageId,
      productId,
      storagePath: `merchants/${merchantId}/products/${productId}/server-generated.jpg`,
      uploadToken: 'short-lived-upload-token',
      uploadUrl: 'https://signed.example.test/upload',
    });

    await request(server)
      .post(`/api/merchants/${merchantId}/catalog/products/${productId}/images/upload-requests`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'product-image-upload-001')
      .send({ altText: 'Black linen dress', contentType: 'image/jpeg', fileSizeBytes: 2048 })
      .expect(201);

    const call = (imageService.initializeUpload.mock.calls as unknown[][])[0];
    const forwardedDto = call?.[3] as Record<string, unknown>;

    expect(call?.slice(0, 3)).toEqual([userId, merchantId, productId]);
    expect(forwardedDto).toEqual({
      altText: 'Black linen dress',
      contentType: 'image/jpeg',
      fileSizeBytes: 2048,
    });
    expect(forwardedDto).not.toHaveProperty('filename');
    expect(forwardedDto).not.toHaveProperty('storagePath');
    expect(call?.[4]).toBe('product-image-upload-001');
    expect(authStore.hasMerchantPermissions).toHaveBeenCalledWith(userId, merchantId, [
      'products.write',
    ]);
  });

  it('rejects invalid formats, oversized files, and unknown request fields', async () => {
    const endpoint = `/api/merchants/${merchantId}/catalog/products/${productId}/images/upload-requests`;

    await request(server)
      .post(endpoint)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'invalid-image-upload-001')
      .send({ contentType: 'image/gif', fileSizeBytes: 100 })
      .expect(400);
    await request(server)
      .post(endpoint)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'invalid-image-upload-002')
      .send({ contentType: 'image/png', fileSizeBytes: 5 * 1024 * 1024 + 1 })
      .expect(400);
    await request(server)
      .post(endpoint)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'invalid-image-upload-003')
      .send({
        contentType: 'image/png',
        fileSizeBytes: 100,
        storagePath: 'client/controlled/path.png',
      })
      .expect(400);

    expect(imageService.initializeUpload).not.toHaveBeenCalled();
  });

  it('confirms, updates, reorders, sets primary, signs reads, and deletes', async () => {
    imageService.confirmUpload.mockResolvedValue(image);
    imageService.updateImage.mockResolvedValue({ ...image, altText: 'Updated' });
    imageService.reorderImages.mockResolvedValue({ items: [image] });
    imageService.setPrimary.mockResolvedValue(image);
    imageService.createSignedReadUrl.mockResolvedValue({
      expiresAt: '2026-07-31T00:05:00.000Z',
      imageId,
      signedUrl: 'https://signed.example.test/read',
    });
    imageService.deleteImage.mockResolvedValue({ deleted: true, imageId });
    const base = `/api/merchants/${merchantId}/catalog/products/${productId}/images`;

    await request(server)
      .post(`${base}/${imageId}/confirm`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(200);
    await request(server)
      .patch(`${base}/${imageId}`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .send({ altText: 'Updated', displayOrder: 1 })
      .expect(200);
    await request(server)
      .patch(`${base}/reorder`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .send({ imageIds: [imageId] })
      .expect(200);
    await request(server)
      .post(`${base}/${imageId}/set-primary`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(200);
    await request(server)
      .get(`${base}/${imageId}/signed-url`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(200);
    await request(server)
      .delete(`${base}/${imageId}`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'product-image-delete-001')
      .expect(200);
  });

  it('denies permission and cross-merchant access before the image service', async () => {
    authStore.hasMerchantPermissions.mockResolvedValue(false);

    await request(server)
      .get(`/api/merchants/${otherMerchantId}/catalog/products/${productId}/images`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(403);
    await request(server)
      .post(
        `/api/merchants/${otherMerchantId}/catalog/products/${productId}/images/upload-requests`,
      )
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'cross-merchant-image-001')
      .send({ contentType: 'image/jpeg', fileSizeBytes: 100 })
      .expect(403);

    expect(imageService.listImages).not.toHaveBeenCalled();
    expect(imageService.initializeUpload).not.toHaveBeenCalled();
  });

  it('preserves one idempotency key across concurrent initialization requests', async () => {
    let resolveShared!: (value: unknown) => void;
    const shared = new Promise((resolve) => {
      resolveShared = resolve;
    });
    imageService.initializeUpload.mockReturnValue(shared);
    const endpoint = `/api/merchants/${merchantId}/catalog/products/${productId}/images/upload-requests`;
    const payload = { contentType: 'image/webp', fileSizeBytes: 1024 };
    const first = request(server)
      .post(endpoint)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'concurrent-image-upload-001')
      .send(payload);
    const second = request(server)
      .post(endpoint)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'concurrent-image-upload-001')
      .send(payload);

    resolveShared({
      contentType: 'image/webp',
      expiresAt: '2026-07-31T02:00:00.000Z',
      fileSizeBytes: 1024,
      imageId,
      productId,
      storagePath: 'server/generated/path.webp',
      uploadToken: 'temporary',
      uploadUrl: 'https://signed.example.test/upload',
    });
    const responses = await Promise.all([first, second]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(
      imageService.initializeUpload.mock.calls.every(
        (call: unknown[]) => call[4] === 'concurrent-image-upload-001',
      ),
    ).toBe(true);
  });

  it('returns a sanitized storage failure', async () => {
    imageService.confirmUpload.mockRejectedValue(
      new ServiceUnavailableException({
        errors: [{ field: 'storage', message: 'Storage service is unavailable' }],
        message: 'Storage service is temporarily unavailable',
      }),
    );

    await request(server)
      .post(`/api/merchants/${merchantId}/catalog/products/${productId}/images/${imageId}/confirm`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(503)
      .expect(({ body }) => {
        expect(JSON.stringify(body)).not.toContain('service-role');
        expect(JSON.stringify(body)).not.toContain('supabase.co');
      });
  });
});
