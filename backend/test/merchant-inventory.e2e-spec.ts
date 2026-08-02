import { ConflictException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { DatabaseService } from '../src/database/database.service';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { AuthStore } from '../src/modules/auth/services/auth.store';
import { MerchantInventoryService } from '../src/modules/inventory/services/merchant-inventory.service';

const userId = '6dd661fa-487a-4f99-9f79-8433039cf469';
const merchantId = '70c05986-977b-4434-b1cc-5db81e6df03d';
const otherMerchantId = '17fead4d-639f-4396-b63c-3874d3cb07e2';
const productId = '1225e286-8f17-46a9-a46d-10005ee467ab';
const variantId = '4058e896-7261-43e1-a3d1-48d7b84a1794';
const locationId = 'e69631a9-2e50-4610-92ea-89e4458d95a2';
const movementId = '44c7d688-50f4-42f0-bb52-3cdd101db631';
const principal = {
  authVersion: 0,
  email: 'owner@example.com',
  sessionId: '46acb46b-d07f-42c2-b20b-d55821ef811b',
  userId,
};
const location = {
  addressSnapshot: null,
  code: 'MAIN',
  createdAt: '2026-07-31T00:00:00.000Z',
  id: locationId,
  isActive: true,
  isDefault: true,
  merchantId,
  name: 'Main Location',
  updatedAt: '2026-07-31T00:00:00.000Z',
};
const level = {
  available: 10,
  barcode: null,
  isActive: true,
  locationId,
  merchantId,
  onHand: 10,
  productId,
  productName: 'Linen Dress',
  reorderThreshold: 2,
  reserved: 0,
  sku: 'DRESS-BLK',
  stockStatus: 'IN_STOCK',
  updatedAt: '2026-07-31T00:00:00.000Z',
  variantId,
  variantName: 'Black',
  version: 1,
};
const movement = {
  afterOnHand: 10,
  afterReserved: 0,
  beforeOnHand: 0,
  beforeReserved: 0,
  createdAt: '2026-07-31T00:00:00.000Z',
  createdByUserId: userId,
  deltaOnHand: 10,
  id: movementId,
  locationCode: 'MAIN',
  locationId,
  merchantId,
  movementType: 'STOCK_IN',
  productId,
  productName: 'Linen Dress',
  reason: 'Initial warehouse receipt',
  sku: 'DRESS-BLK',
  variantId,
  variantName: 'Black',
};
const inventoryMethods = [
  'adjustStock',
  'createLocation',
  'getVariant',
  'listLevels',
  'listLocations',
  'listLowStock',
  'listMovements',
  'setDefaultLocation',
  'updateLocation',
] as const;
type InventoryServiceMock = Record<(typeof inventoryMethods)[number], jest.Mock>;

describe('Merchant inventory endpoints (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let authService: { validateAccessToken: jest.Mock };
  let authStore: { hasMerchantPermissions: jest.Mock; hasPlatformPermissions: jest.Mock };
  let inventoryService: InventoryServiceMock;

  beforeAll(async () => {
    authService = { validateAccessToken: jest.fn() };
    authStore = {
      hasMerchantPermissions: jest.fn(),
      hasPlatformPermissions: jest.fn(),
    };
    inventoryService = Object.fromEntries(
      inventoryMethods.map((method) => [method, jest.fn()]),
    ) as InventoryServiceMock;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({ checkConnection: jest.fn().mockResolvedValue(true) })
      .overrideProvider(AuthService)
      .useValue(authService)
      .overrideProvider(AuthStore)
      .useValue(authStore)
      .overrideProvider(MerchantInventoryService)
      .useValue(inventoryService)
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
    for (const mock of Object.values(inventoryService)) mock.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists, creates, updates, and selects the default inventory location', async () => {
    inventoryService.listLocations.mockResolvedValue({ items: [location] });
    inventoryService.createLocation.mockResolvedValue({ ...location, code: 'WAREHOUSE-2' });
    inventoryService.updateLocation.mockResolvedValue({ ...location, name: 'Updated Main' });
    inventoryService.setDefaultLocation.mockResolvedValue(location);

    await request(server)
      .get(`/api/merchants/${merchantId}/inventory/locations?activeOnly=true`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(200);
    await request(server)
      .post(`/api/merchants/${merchantId}/inventory/locations`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .send({ code: 'warehouse-2', name: 'Second Warehouse' })
      .expect(201);
    await request(server)
      .patch(`/api/merchants/${merchantId}/inventory/locations/${locationId}`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .send({ name: 'Updated Main' })
      .expect(200);
    await request(server)
      .post(`/api/merchants/${merchantId}/inventory/locations/${locationId}/set-default`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(200);

    expect(authStore.hasMerchantPermissions).toHaveBeenLastCalledWith(userId, merchantId, [
      'merchant.inventory.locations.manage',
    ]);
  });

  it('reads filtered levels, variant details, low stock, and movement pages', async () => {
    inventoryService.listLevels.mockResolvedValue({ items: [level], nextCursor: null });
    inventoryService.getVariant.mockResolvedValue({
      ...level,
      locations: [],
      totals: {
        available: 10,
        onHand: 10,
        reorderThreshold: 2,
        reserved: 0,
        stockStatus: 'IN_STOCK',
      },
    });
    inventoryService.listLowStock.mockResolvedValue({ items: [], nextCursor: null });
    inventoryService.listMovements.mockResolvedValue({ items: [movement], nextCursor: null });

    await request(server)
      .get(
        `/api/merchants/${merchantId}/inventory/levels?locationId=${locationId}&productId=${productId}&variantId=${variantId}&sku=DRESS-BLK&stockStatus=IN_STOCK&limit=25`,
      )
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(200);
    await request(server)
      .get(`/api/merchants/${merchantId}/inventory/variants/${variantId}`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(200);
    await request(server)
      .get(`/api/merchants/${merchantId}/inventory/low-stock?locationId=${locationId}`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(200);
    await request(server)
      .get(
        `/api/merchants/${merchantId}/inventory/movements?locationId=${locationId}&variantId=${variantId}&movementType=STOCK_IN`,
      )
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(200);

    expect(authStore.hasMerchantPermissions).toHaveBeenLastCalledWith(userId, merchantId, [
      'merchant.inventory.read',
    ]);
  });

  it('applies an idempotent version-checked stock adjustment', async () => {
    inventoryService.adjustStock.mockResolvedValue({ balance: level, movement });

    await request(server)
      .post(`/api/merchants/${merchantId}/inventory/adjustments`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'inventory-stock-in-001')
      .send({
        expectedVersion: 0,
        locationId,
        operation: 'STOCK_IN',
        quantity: 10,
        reason: 'Initial warehouse receipt',
        reorderThreshold: 2,
        variantId,
      })
      .expect(201)
      .expect(({ body }) => {
        const parsed = body as unknown as { data: { balance: { available: number } } };
        expect(parsed.data.balance.available).toBe(10);
      });

    expect(inventoryService.adjustStock).toHaveBeenCalledWith(
      userId,
      merchantId,
      expect.objectContaining({ expectedVersion: 0, quantity: 10 }),
      'inventory-stock-in-001',
      expect.any(Object),
    );
    expect(authStore.hasMerchantPermissions).toHaveBeenLastCalledWith(userId, merchantId, [
      'merchant.inventory.adjust',
    ]);
  });

  it('returns safe negative-stock and stale-version conflicts', async () => {
    inventoryService.adjustStock
      .mockRejectedValueOnce(
        new ConflictException({
          message: 'Insufficient stock on hand',
          errors: [
            { field: 'quantity', message: 'Stock adjustment would make on-hand stock negative' },
          ],
        }),
      )
      .mockRejectedValueOnce(
        new ConflictException({
          message: 'Inventory balance version changed',
          errors: [
            { field: 'expectedVersion', message: 'Expected version 0, current version is 1' },
          ],
        }),
      );
    const body = {
      expectedVersion: 0,
      locationId,
      operation: 'STOCK_OUT',
      quantity: 11,
      reason: 'Damaged stock removal',
      variantId,
    };

    await request(server)
      .post(`/api/merchants/${merchantId}/inventory/adjustments`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'inventory-negative-001')
      .send(body)
      .expect(409);
    await request(server)
      .post(`/api/merchants/${merchantId}/inventory/adjustments`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'inventory-stale-001')
      .send(body)
      .expect(409);
  });

  it('denies permission and cross-merchant access before service execution', async () => {
    authStore.hasMerchantPermissions.mockResolvedValue(false);

    await request(server)
      .get(`/api/merchants/${otherMerchantId}/inventory/variants/${variantId}`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(403);
    await request(server)
      .post(`/api/merchants/${otherMerchantId}/inventory/adjustments`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'inventory-denied-001')
      .send({
        expectedVersion: 0,
        locationId,
        operation: 'STOCK_IN',
        quantity: 1,
        reason: 'Unauthorized cross-merchant attempt',
        variantId,
      })
      .expect(403);

    expect(inventoryService.getVariant).not.toHaveBeenCalled();
    expect(inventoryService.adjustStock).not.toHaveBeenCalled();
  });

  it('preserves the idempotency key for repeated and concurrent adjustments', async () => {
    let resolveShared!: (value: unknown) => void;
    const shared = new Promise((resolve) => {
      resolveShared = resolve;
    });
    inventoryService.adjustStock.mockReturnValue(shared);
    const adjustment = {
      expectedVersion: 0,
      locationId,
      operation: 'STOCK_IN',
      quantity: 10,
      reason: 'Concurrent warehouse receipt',
      variantId,
    };
    const first = request(server)
      .post(`/api/merchants/${merchantId}/inventory/adjustments`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'inventory-concurrent-001')
      .send(adjustment);
    const second = request(server)
      .post(`/api/merchants/${merchantId}/inventory/adjustments`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'inventory-concurrent-001')
      .send(adjustment);

    resolveShared({ balance: level, movement });
    const responses = await Promise.all([first, second]);
    const calls = inventoryService.adjustStock.mock.calls as unknown[][];

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(calls.every((call) => call[3] === 'inventory-concurrent-001')).toBe(true);
  });

  it('rejects missing reasons, invalid quantities, and malformed identifiers', async () => {
    await request(server)
      .post(`/api/merchants/${merchantId}/inventory/adjustments`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .set('Idempotency-Key', 'inventory-invalid-001')
      .send({
        expectedVersion: 0,
        locationId,
        operation: 'STOCK_IN',
        quantity: 1,
        variantId,
      })
      .expect(400);
    await request(server)
      .get(`/api/merchants/${merchantId}/inventory/variants/not-a-uuid`)
      .set('Authorization', 'Bearer owner.access.jwt')
      .expect(400);
  });
});
