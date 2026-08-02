import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';

import { DatabaseService } from '../../../database/database.service';
import {
  auditLogs,
  domainEvents,
  inventoryBalances,
  inventoryLocations,
  inventoryMovements,
  inventoryReservations,
  merchants,
  outboxMessages,
  productVariants,
  products,
} from '../../../database/schema';
import { RedisOperationCoordinator } from '../../../infrastructure/redis/redis-operation-coordinator.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { RequestMetadata } from '../../auth/types/auth.types';
import { STOREFRONT_STOCK_REVISION_KEY } from '../../storefront/storefront.constants';
import type {
  CreateInventoryAdjustmentDto,
  CreateInventoryLocationDto,
  InventoryLevelQueryDto,
  InventoryMovementQueryDto,
  LocationListQueryDto,
  UpdateInventoryLocationDto,
} from '../dto/inventory-request.dto';
import type {
  InventoryAdjustmentView,
  InventoryLevelView,
  InventoryLocationView,
  InventoryMovementView,
  InventoryPage,
  InventoryStockStatus,
  InventoryVariantView,
} from '../types/inventory.types';
import { InventoryAdjustmentPolicy } from './inventory-adjustment.policy';
import type { InventoryOperation } from './inventory-adjustment.policy';

type Transaction = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];
type IdempotencyContext = { databaseKey: string; fingerprint: string };
type EventInput = {
  action: string;
  actorUserId: string;
  aggregateId: string;
  aggregateType: string;
  afterData?: Record<string, unknown>;
  beforeData?: Record<string, unknown>;
  eventType: string;
  idempotency: IdempotencyContext;
  merchantId: string;
  metadata: RequestMetadata;
  payload?: Record<string, unknown>;
};

@Injectable()
export class MerchantInventoryService {
  constructor(
    private readonly adjustmentPolicy: InventoryAdjustmentPolicy,
    private readonly databaseService: DatabaseService,
    private readonly operationCoordinator: RedisOperationCoordinator,
    private readonly redisService: RedisService,
  ) {}

  async listLocations(
    merchantId: string,
    query: LocationListQueryDto,
  ): Promise<{ items: InventoryLocationView[] }> {
    const conditions = [eq(inventoryLocations.merchantId, merchantId)];

    if (query.activeOnly) {
      conditions.push(eq(inventoryLocations.isActive, true));
    }
    const rows = await this.databaseService.db
      .select()
      .from(inventoryLocations)
      .where(and(...conditions))
      .orderBy(desc(inventoryLocations.isDefault), asc(inventoryLocations.name));

    return { items: rows.map((row) => this.locationView(row)) };
  }

  async createLocation(
    actorUserId: string,
    merchantId: string,
    dto: CreateInventoryLocationDto,
    metadata: RequestMetadata,
  ): Promise<InventoryLocationView> {
    if (dto.isDefault && dto.isActive === false) {
      throw this.badRequest('isDefault', 'A default location must be active');
    }

    try {
      const locationId = await this.databaseService.db.transaction(async (tx) => {
        await this.lockMerchant(tx, merchantId);
        const existing = await tx
          .select()
          .from(inventoryLocations)
          .where(eq(inventoryLocations.merchantId, merchantId))
          .orderBy(asc(inventoryLocations.id))
          .for('update');
        const isActive = dto.isActive ?? true;
        const shouldBeDefault =
          isActive &&
          (dto.isDefault === true ||
            !existing.some((location) => location.isDefault && location.isActive));

        if (shouldBeDefault) {
          await tx
            .update(inventoryLocations)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(eq(inventoryLocations.merchantId, merchantId));
        }
        const [location] = await tx
          .insert(inventoryLocations)
          .values({
            addressSnapshot: dto.addressSnapshot ?? null,
            code: dto.code,
            createdByUserId: actorUserId,
            isActive,
            isDefault: shouldBeDefault,
            merchantId,
            name: dto.name,
          })
          .returning({ id: inventoryLocations.id });

        if (!location) {
          throw new Error('Inventory location insert failed');
        }
        await this.recordEvent(tx, {
          action: 'inventory.location.created',
          actorUserId,
          aggregateId: location.id,
          aggregateType: 'INVENTORY_LOCATION',
          afterData: { code: dto.code, isDefault: shouldBeDefault, name: dto.name },
          eventType: 'inventory.location_created',
          idempotency: this.serverIdempotency('location.create', actorUserId, location.id),
          merchantId,
          metadata,
        });
        return location.id;
      });

      return this.getLocation(merchantId, locationId);
    } catch (error) {
      this.rethrowUnique(error, 'code', 'Inventory location code is already in use');
    }
  }

  async updateLocation(
    actorUserId: string,
    merchantId: string,
    locationId: string,
    dto: UpdateInventoryLocationDto,
    metadata: RequestMetadata,
  ): Promise<InventoryLocationView> {
    this.assertNonemptyDto(dto);

    if (dto.isDefault !== undefined) {
      throw this.badRequest(
        'isDefault',
        'Use the set-default endpoint to change the default location',
      );
    }

    try {
      await this.databaseService.db.transaction(async (tx) => {
        await this.lockMerchant(tx, merchantId);
        const location = await this.lockLocation(tx, merchantId, locationId);

        if (dto.isActive === false && location.isActive) {
          if (location.isDefault) {
            throw this.conflict(
              'isActive',
              'Set another active default location before deactivating this location',
            );
          }
          await this.assertLocationCanDeactivate(tx, merchantId, locationId);
        }
        await tx
          .update(inventoryLocations)
          .set({
            ...(dto.code !== undefined ? { code: dto.code } : {}),
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.addressSnapshot !== undefined
              ? { addressSnapshot: dto.addressSnapshot || null }
              : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            updatedAt: new Date(),
          })
          .where(eq(inventoryLocations.id, locationId));
        await this.recordEvent(tx, {
          action: 'inventory.location.updated',
          actorUserId,
          aggregateId: locationId,
          aggregateType: 'INVENTORY_LOCATION',
          afterData: { fields: Object.keys(dto).sort() },
          beforeData: { code: location.code, isActive: location.isActive, name: location.name },
          eventType: 'inventory.location_updated',
          idempotency: this.serverIdempotency('location.update', actorUserId, locationId),
          merchantId,
          metadata,
        });
      });

      return this.getLocation(merchantId, locationId);
    } catch (error) {
      this.rethrowUnique(error, 'code', 'Inventory location code is already in use');
    }
  }

  async setDefaultLocation(
    actorUserId: string,
    merchantId: string,
    locationId: string,
    metadata: RequestMetadata,
  ): Promise<InventoryLocationView> {
    await this.databaseService.db.transaction(async (tx) => {
      await this.lockMerchant(tx, merchantId);
      const locations = await tx
        .select()
        .from(inventoryLocations)
        .where(eq(inventoryLocations.merchantId, merchantId))
        .orderBy(asc(inventoryLocations.id))
        .for('update');
      const target = locations.find((location) => location.id === locationId);

      if (!target) {
        throw this.notFound('Inventory location not found');
      }
      if (!target.isActive) {
        throw this.conflict('isActive', 'Only an active location can be set as default');
      }
      if (!target.isDefault) {
        await tx
          .update(inventoryLocations)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(inventoryLocations.merchantId, merchantId));
        await tx
          .update(inventoryLocations)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(
            and(
              eq(inventoryLocations.id, locationId),
              eq(inventoryLocations.merchantId, merchantId),
            ),
          );
      }
      await this.recordEvent(tx, {
        action: 'inventory.location.default-changed',
        actorUserId,
        aggregateId: locationId,
        aggregateType: 'INVENTORY_LOCATION',
        afterData: { isDefault: true },
        beforeData: { isDefault: target.isDefault },
        eventType: 'inventory.location_default_changed',
        idempotency: this.serverIdempotency('location.set-default', actorUserId, locationId),
        merchantId,
        metadata,
      });
    });

    return this.getLocation(merchantId, locationId);
  }

  async listLevels(
    merchantId: string,
    query: InventoryLevelQueryDto,
  ): Promise<InventoryPage<InventoryLevelView>> {
    await this.assertReadFiltersOwned(merchantId, query);
    return this.queryLevels(merchantId, query, false);
  }

  async listLowStock(
    merchantId: string,
    query: InventoryLevelQueryDto,
  ): Promise<InventoryPage<InventoryLevelView>> {
    await this.assertReadFiltersOwned(merchantId, query);
    return this.queryLevels(merchantId, { ...query, stockStatus: undefined }, true);
  }

  async getVariant(merchantId: string, variantId: string): Promise<InventoryVariantView> {
    const variant = await this.findOwnedVariant(merchantId, variantId);
    const [locations, balances] = await Promise.all([
      this.databaseService.db
        .select()
        .from(inventoryLocations)
        .where(eq(inventoryLocations.merchantId, merchantId))
        .orderBy(desc(inventoryLocations.isDefault), asc(inventoryLocations.name)),
      this.databaseService.db
        .select()
        .from(inventoryBalances)
        .where(
          and(
            eq(inventoryBalances.merchantId, merchantId),
            eq(inventoryBalances.variantId, variantId),
          ),
        ),
    ]);
    const balanceByLocation = new Map(balances.map((balance) => [balance.locationId, balance]));
    const locationViews = locations.map((location) => {
      const balance = balanceByLocation.get(location.id);
      const onHand = balance?.stockOnHand ?? 0;
      const reserved = balance?.stockReserved ?? 0;
      const available = onHand - reserved;
      const threshold = balance?.reorderThreshold ?? 0;
      return {
        available,
        isActive: location.isActive,
        isDefault: location.isDefault,
        locationCode: location.code,
        locationId: location.id,
        locationName: location.name,
        onHand,
        reorderThreshold: threshold,
        reserved,
        stockStatus: this.stockStatus(available, threshold),
        version: balance?.version ?? 0,
      };
    });
    const totals = locationViews.reduce(
      (result, location) => ({
        available: result.available + location.available,
        onHand: result.onHand + location.onHand,
        reorderThreshold: result.reorderThreshold + location.reorderThreshold,
        reserved: result.reserved + location.reserved,
      }),
      { available: 0, onHand: 0, reorderThreshold: 0, reserved: 0 },
    );

    return {
      barcode: variant.barcode,
      isActive: variant.isActive,
      locations: locationViews,
      merchantId,
      productId: variant.productId,
      productName: variant.productName,
      sku: variant.sku,
      totals: {
        ...totals,
        stockStatus: this.stockStatus(totals.available, totals.reorderThreshold),
      },
      variantId,
      variantName: variant.name,
    };
  }

  async adjustStock(
    actorUserId: string,
    merchantId: string,
    dto: CreateInventoryAdjustmentDto,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<InventoryAdjustmentView> {
    const idempotency = this.idempotency(
      'adjustment',
      actorUserId,
      merchantId,
      rawIdempotencyKey,
      dto,
    );
    const replay = await this.findAdjustmentReplay(idempotency);

    if (replay) {
      return this.getAdjustmentResult(merchantId, replay.movementId);
    }

    return this.operationCoordinator.run(
      `inventory-adjustment:${merchantId}:${dto.locationId}:${dto.variantId}:${idempotency.databaseKey}`,
      async () => {
        try {
          const movementId = await this.databaseService.db.transaction(async (tx) => {
            const initialReplay = await this.findAdjustmentReplayInTransaction(tx, idempotency);

            if (initialReplay) {
              return initialReplay.movementId;
            }
            await this.lockActiveLocation(tx, merchantId, dto.locationId);
            const variant = await this.lockOwnedVariant(tx, merchantId, dto.variantId);
            await tx
              .insert(inventoryBalances)
              .values({
                locationId: dto.locationId,
                merchantId,
                variantId: dto.variantId,
              })
              .onConflictDoNothing();
            const [balance] = await tx
              .select()
              .from(inventoryBalances)
              .where(
                and(
                  eq(inventoryBalances.merchantId, merchantId),
                  eq(inventoryBalances.locationId, dto.locationId),
                  eq(inventoryBalances.variantId, dto.variantId),
                ),
              )
              .for('update')
              .limit(1);

            if (!balance) {
              throw new Error('Inventory balance provisioning failed');
            }
            const replayAfterLock = await this.findAdjustmentReplayInTransaction(tx, idempotency);

            if (replayAfterLock) {
              return replayAfterLock.movementId;
            }
            const calculated = this.adjustmentPolicy.calculate({
              beforeOnHand: balance.stockOnHand,
              beforeReserved: balance.stockReserved,
              currentVersion: balance.version,
              expectedVersion: dto.expectedVersion,
              operation: dto.operation,
              quantity: dto.quantity,
            });
            const reorderThreshold = dto.reorderThreshold ?? balance.reorderThreshold;
            const [updated] = await tx
              .update(inventoryBalances)
              .set({
                reorderThreshold,
                stockOnHand: calculated.afterOnHand,
                updatedAt: new Date(),
                version: balance.version + 1,
              })
              .where(
                and(
                  eq(inventoryBalances.merchantId, merchantId),
                  eq(inventoryBalances.locationId, dto.locationId),
                  eq(inventoryBalances.variantId, dto.variantId),
                  eq(inventoryBalances.version, balance.version),
                ),
              )
              .returning({ version: inventoryBalances.version });

            if (!updated) {
              throw this.conflict(
                'expectedVersion',
                'Inventory balance changed while the adjustment was being processed',
              );
            }
            const [movement] = await tx
              .insert(inventoryMovements)
              .values({
                afterOnHand: calculated.afterOnHand,
                afterReserved: calculated.afterReserved,
                beforeOnHand: balance.stockOnHand,
                beforeReserved: balance.stockReserved,
                createdByUserId: actorUserId,
                deltaOnHand: calculated.deltaOnHand,
                deltaReserved: 0,
                idempotencyKey: idempotency.databaseKey,
                locationId: dto.locationId,
                merchantId,
                movementType: dto.operation,
                note: dto.reason,
                variantId: dto.variantId,
              })
              .returning({ id: inventoryMovements.id });

            if (!movement) {
              throw new Error('Inventory movement insert failed');
            }
            const available = calculated.afterOnHand - calculated.afterReserved;
            await this.recordEvent(tx, {
              action: 'inventory.adjusted',
              actorUserId,
              aggregateId: dto.variantId,
              aggregateType: 'INVENTORY_VARIANT',
              afterData: {
                available,
                onHand: calculated.afterOnHand,
                version: updated.version,
              },
              beforeData: { onHand: balance.stockOnHand, version: balance.version },
              eventType: 'inventory.updated',
              idempotency,
              merchantId,
              metadata,
              payload: {
                deltaOnHand: calculated.deltaOnHand,
                locationId: dto.locationId,
                movementId: movement.id,
                operation: dto.operation,
                productId: variant.productId,
              },
            });

            if (available <= reorderThreshold) {
              await this.recordEvent(tx, {
                action: 'inventory.low-stock-detected',
                actorUserId,
                aggregateId: dto.variantId,
                aggregateType: 'INVENTORY_VARIANT',
                afterData: { available, reorderThreshold },
                eventType: 'inventory.low_stock',
                idempotency: this.serverIdempotency(
                  'inventory.low-stock',
                  actorUserId,
                  movement.id,
                ),
                merchantId,
                metadata,
                payload: {
                  available,
                  locationId: dto.locationId,
                  movementId: movement.id,
                  productId: variant.productId,
                  reorderThreshold,
                },
              });
            }
            return movement.id;
          });

          const result = await this.getAdjustmentResult(merchantId, movementId);
          await this.invalidateStockCaches(merchantId, result.movement.productId, dto.variantId);
          return result;
        } catch (error) {
          const replayAfterConflict = await this.findAdjustmentReplay(idempotency);

          if (replayAfterConflict) {
            return this.getAdjustmentResult(merchantId, replayAfterConflict.movementId);
          }
          if (this.isUniqueViolation(error)) {
            throw this.conflict(
              'idempotency-key',
              'The inventory adjustment is already being processed',
            );
          }
          throw error;
        }
      },
    );
  }

  async listMovements(
    merchantId: string,
    query: InventoryMovementQueryDto,
  ): Promise<InventoryPage<InventoryMovementView>> {
    await this.assertMovementFiltersOwned(merchantId, query);
    const limit = query.limit ?? 25;
    const conditions = [
      eq(inventoryMovements.merchantId, merchantId),
      inArray(inventoryMovements.movementType, ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT']),
    ];

    if (query.locationId) conditions.push(eq(inventoryMovements.locationId, query.locationId));
    if (query.productId) conditions.push(eq(productVariants.productId, query.productId));
    if (query.variantId) conditions.push(eq(inventoryMovements.variantId, query.variantId));
    if (query.movementType) {
      conditions.push(eq(inventoryMovements.movementType, query.movementType));
    }
    if (query.createdFrom) {
      conditions.push(gte(inventoryMovements.createdAt, new Date(query.createdFrom)));
    }
    if (query.createdTo) {
      conditions.push(lte(inventoryMovements.createdAt, new Date(query.createdTo)));
    }
    if (query.cursor) {
      const cursor = this.decodeMovementCursor(query.cursor);
      conditions.push(
        or(
          lt(inventoryMovements.createdAt, cursor.createdAt),
          and(
            eq(inventoryMovements.createdAt, cursor.createdAt),
            lt(inventoryMovements.id, cursor.id),
          ),
        )!,
      );
    }
    const rows = await this.databaseService.db
      .select({
        movement: inventoryMovements,
        locationCode: inventoryLocations.code,
        productId: productVariants.productId,
        productName: products.name,
        sku: productVariants.sku,
        variantName: productVariants.name,
      })
      .from(inventoryMovements)
      .innerJoin(
        productVariants,
        and(
          eq(productVariants.id, inventoryMovements.variantId),
          eq(productVariants.merchantId, inventoryMovements.merchantId),
        ),
      )
      .innerJoin(
        products,
        and(
          eq(products.id, productVariants.productId),
          eq(products.merchantId, productVariants.merchantId),
        ),
      )
      .innerJoin(
        inventoryLocations,
        and(
          eq(inventoryLocations.id, inventoryMovements.locationId),
          eq(inventoryLocations.merchantId, inventoryMovements.merchantId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(inventoryMovements.createdAt), desc(inventoryMovements.id))
      .limit(limit + 1);
    const page = rows.slice(0, limit);
    const last = page.at(-1);

    return {
      items: page.map((row) => this.movementView(row)),
      nextCursor:
        rows.length > limit && last
          ? this.encodeMovementCursor({
              createdAt: last.movement.createdAt,
              id: last.movement.id,
            })
          : null,
    };
  }

  private async queryLevels(
    merchantId: string,
    query: InventoryLevelQueryDto,
    lowStockOnly: boolean,
  ): Promise<InventoryPage<InventoryLevelView>> {
    const limit = query.limit ?? 25;
    const balanceJoin = and(
      eq(inventoryBalances.merchantId, productVariants.merchantId),
      eq(inventoryBalances.variantId, productVariants.id),
      query.locationId ? eq(inventoryBalances.locationId, query.locationId) : undefined,
    );
    const onHand = sql<number>`coalesce(sum(${inventoryBalances.stockOnHand}), 0)::integer`;
    const reserved = sql<number>`coalesce(sum(${inventoryBalances.stockReserved}), 0)::integer`;
    const available = sql<number>`coalesce(sum(${inventoryBalances.stockOnHand} - ${inventoryBalances.stockReserved}), 0)::integer`;
    const threshold = sql<number>`coalesce(sum(${inventoryBalances.reorderThreshold}), 0)::integer`;
    const version = query.locationId
      ? sql<number | null>`coalesce(max(${inventoryBalances.version}), 0)::integer`
      : sql<number | null>`null::integer`;
    const updatedAt = sql<Date>`coalesce(max(${inventoryBalances.updatedAt}), ${productVariants.updatedAt})`;
    const conditions = [
      eq(productVariants.merchantId, merchantId),
      isNull(productVariants.deletedAt),
      isNull(products.deletedAt),
    ];

    if (query.activeOnly ?? true) conditions.push(eq(productVariants.isActive, true));
    if (query.productId) conditions.push(eq(productVariants.productId, query.productId));
    if (query.variantId) conditions.push(eq(productVariants.id, query.variantId));
    if (query.sku) conditions.push(ilike(productVariants.sku, query.sku));
    if (query.barcode) conditions.push(ilike(productVariants.barcode, query.barcode));
    if (query.search) {
      conditions.push(
        or(
          ilike(products.name, `%${query.search}%`),
          ilike(productVariants.name, `%${query.search}%`),
          ilike(productVariants.sku, `%${query.search}%`),
          ilike(productVariants.barcode, `%${query.search}%`),
        )!,
      );
    }
    if (query.cursor) {
      conditions.push(gt(productVariants.id, this.decodeLevelCursor(query.cursor)));
    }
    let stockCondition = lowStockOnly ? sql`${available} <= ${threshold}` : undefined;

    if (!lowStockOnly && query.stockStatus === 'OUT_OF_STOCK') {
      stockCondition = sql`${available} <= 0`;
    } else if (!lowStockOnly && query.stockStatus === 'LOW_STOCK') {
      stockCondition = sql`${available} > 0 and ${available} <= ${threshold}`;
    } else if (!lowStockOnly && query.stockStatus === 'IN_STOCK') {
      stockCondition = sql`${available} > ${threshold}`;
    }
    const rows = await this.databaseService.db
      .select({
        available,
        barcode: productVariants.barcode,
        isActive: productVariants.isActive,
        onHand,
        productId: productVariants.productId,
        productName: products.name,
        reorderThreshold: threshold,
        reserved,
        sku: productVariants.sku,
        updatedAt,
        variantId: productVariants.id,
        variantName: productVariants.name,
        version,
      })
      .from(productVariants)
      .innerJoin(
        products,
        and(
          eq(products.id, productVariants.productId),
          eq(products.merchantId, productVariants.merchantId),
        ),
      )
      .leftJoin(inventoryBalances, balanceJoin)
      .where(and(...conditions))
      .groupBy(
        productVariants.id,
        productVariants.merchantId,
        productVariants.productId,
        productVariants.name,
        productVariants.sku,
        productVariants.barcode,
        productVariants.isActive,
        productVariants.updatedAt,
        products.name,
      )
      .having(stockCondition)
      .orderBy(asc(productVariants.id))
      .limit(limit + 1);
    const page = rows.slice(0, limit);
    const last = page.at(-1);

    return {
      items: page.map((row) => ({
        available: Number(row.available),
        barcode: row.barcode,
        isActive: row.isActive,
        locationId: query.locationId ?? null,
        merchantId,
        onHand: Number(row.onHand),
        productId: row.productId,
        productName: row.productName,
        reorderThreshold: Number(row.reorderThreshold),
        reserved: Number(row.reserved),
        sku: row.sku,
        stockStatus: this.stockStatus(Number(row.available), Number(row.reorderThreshold)),
        updatedAt: new Date(row.updatedAt).toISOString(),
        variantId: row.variantId,
        variantName: row.variantName,
        version: row.version === null ? null : Number(row.version),
      })),
      nextCursor: rows.length > limit && last ? this.encodeLevelCursor(last.variantId) : null,
    };
  }

  private async getLocation(
    merchantId: string,
    locationId: string,
  ): Promise<InventoryLocationView> {
    const [location] = await this.databaseService.db
      .select()
      .from(inventoryLocations)
      .where(
        and(eq(inventoryLocations.id, locationId), eq(inventoryLocations.merchantId, merchantId)),
      )
      .limit(1);

    if (!location) {
      throw this.notFound('Inventory location not found');
    }
    return this.locationView(location);
  }

  private async getAdjustmentResult(
    merchantId: string,
    movementId: string,
  ): Promise<InventoryAdjustmentView> {
    const movement = await this.getMovement(merchantId, movementId);
    const levels = await this.queryLevels(
      merchantId,
      {
        activeOnly: false,
        limit: 1,
        locationId: movement.locationId,
        variantId: movement.variantId,
      },
      false,
    );
    const balance = levels.items[0];

    if (!balance) {
      throw new Error('Adjusted inventory balance is unavailable');
    }
    return { balance, movement };
  }

  private async getMovement(
    merchantId: string,
    movementId: string,
  ): Promise<InventoryMovementView> {
    const [row] = await this.databaseService.db
      .select({
        movement: inventoryMovements,
        locationCode: inventoryLocations.code,
        productId: productVariants.productId,
        productName: products.name,
        sku: productVariants.sku,
        variantName: productVariants.name,
      })
      .from(inventoryMovements)
      .innerJoin(
        productVariants,
        and(
          eq(productVariants.id, inventoryMovements.variantId),
          eq(productVariants.merchantId, inventoryMovements.merchantId),
        ),
      )
      .innerJoin(
        products,
        and(
          eq(products.id, productVariants.productId),
          eq(products.merchantId, productVariants.merchantId),
        ),
      )
      .innerJoin(
        inventoryLocations,
        and(
          eq(inventoryLocations.id, inventoryMovements.locationId),
          eq(inventoryLocations.merchantId, inventoryMovements.merchantId),
        ),
      )
      .where(
        and(eq(inventoryMovements.id, movementId), eq(inventoryMovements.merchantId, merchantId)),
      )
      .limit(1);

    if (!row) {
      throw this.notFound('Inventory movement not found');
    }
    return this.movementView(row);
  }

  private movementView(row: {
    movement: typeof inventoryMovements.$inferSelect;
    locationCode: string;
    productId: string;
    productName: string;
    sku: string;
    variantName: string;
  }): InventoryMovementView {
    return {
      afterOnHand: row.movement.afterOnHand,
      afterReserved: row.movement.afterReserved,
      beforeOnHand: row.movement.beforeOnHand,
      beforeReserved: row.movement.beforeReserved,
      createdAt: row.movement.createdAt.toISOString(),
      createdByUserId: row.movement.createdByUserId,
      deltaOnHand: row.movement.deltaOnHand,
      id: row.movement.id,
      locationCode: row.locationCode,
      locationId: row.movement.locationId,
      merchantId: row.movement.merchantId,
      movementType: this.phaseMovementType(row.movement.movementType),
      productId: row.productId,
      productName: row.productName,
      reason: row.movement.note ?? '',
      sku: row.sku,
      variantId: row.movement.variantId,
      variantName: row.variantName,
    };
  }

  private async assertReadFiltersOwned(
    merchantId: string,
    query: InventoryLevelQueryDto,
  ): Promise<void> {
    await Promise.all([
      query.locationId ? this.assertLocationOwned(merchantId, query.locationId) : undefined,
      query.productId ? this.assertProductOwned(merchantId, query.productId) : undefined,
      query.variantId
        ? this.findOwnedVariant(merchantId, query.variantId).then(() => undefined)
        : undefined,
    ]);
  }

  private async assertMovementFiltersOwned(
    merchantId: string,
    query: InventoryMovementQueryDto,
  ): Promise<void> {
    await Promise.all([
      query.locationId ? this.assertLocationOwned(merchantId, query.locationId) : undefined,
      query.productId ? this.assertProductOwned(merchantId, query.productId) : undefined,
      query.variantId
        ? this.findOwnedVariant(merchantId, query.variantId).then(() => undefined)
        : undefined,
    ]);
  }

  private async assertLocationOwned(merchantId: string, locationId: string): Promise<void> {
    const [location] = await this.databaseService.db
      .select({ id: inventoryLocations.id })
      .from(inventoryLocations)
      .where(
        and(eq(inventoryLocations.id, locationId), eq(inventoryLocations.merchantId, merchantId)),
      )
      .limit(1);

    if (!location) throw this.notFound('Inventory location not found');
  }

  private async assertProductOwned(merchantId: string, productId: string): Promise<void> {
    const [product] = await this.databaseService.db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.merchantId, merchantId),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);

    if (!product) throw this.notFound('Product not found');
  }

  private async findOwnedVariant(
    merchantId: string,
    variantId: string,
  ): Promise<{
    barcode: string | null;
    isActive: boolean;
    name: string;
    productId: string;
    productName: string;
    sku: string;
  }> {
    const [variant] = await this.databaseService.db
      .select({
        barcode: productVariants.barcode,
        isActive: productVariants.isActive,
        name: productVariants.name,
        productId: productVariants.productId,
        productName: products.name,
        sku: productVariants.sku,
      })
      .from(productVariants)
      .innerJoin(
        products,
        and(
          eq(products.id, productVariants.productId),
          eq(products.merchantId, productVariants.merchantId),
        ),
      )
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.merchantId, merchantId),
          isNull(productVariants.deletedAt),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);

    if (!variant) throw this.notFound('Product variant not found');
    return variant;
  }

  private async lockMerchant(tx: Transaction, merchantId: string): Promise<void> {
    const [merchant] = await tx
      .select({ id: merchants.id })
      .from(merchants)
      .where(eq(merchants.id, merchantId))
      .for('update')
      .limit(1);

    if (!merchant) throw this.notFound('Merchant not found');
  }

  private async lockLocation(
    tx: Transaction,
    merchantId: string,
    locationId: string,
  ): Promise<typeof inventoryLocations.$inferSelect> {
    const [location] = await tx
      .select()
      .from(inventoryLocations)
      .where(
        and(eq(inventoryLocations.id, locationId), eq(inventoryLocations.merchantId, merchantId)),
      )
      .for('update')
      .limit(1);

    if (!location) throw this.notFound('Inventory location not found');
    return location;
  }

  private async lockActiveLocation(
    tx: Transaction,
    merchantId: string,
    locationId: string,
  ): Promise<void> {
    const location = await this.lockLocation(tx, merchantId, locationId);

    if (!location.isActive) {
      throw this.conflict('locationId', 'Stock cannot be adjusted at an inactive location');
    }
  }

  private async lockOwnedVariant(
    tx: Transaction,
    merchantId: string,
    variantId: string,
  ): Promise<{ productId: string }> {
    const [variant] = await tx
      .select({ productId: productVariants.productId })
      .from(productVariants)
      .innerJoin(
        products,
        and(
          eq(products.id, productVariants.productId),
          eq(products.merchantId, productVariants.merchantId),
        ),
      )
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.merchantId, merchantId),
          isNull(productVariants.deletedAt),
          isNull(products.deletedAt),
        ),
      )
      .for('update', { of: productVariants })
      .limit(1);

    if (!variant) throw this.notFound('Product variant not found');
    return variant;
  }

  private async assertLocationCanDeactivate(
    tx: Transaction,
    merchantId: string,
    locationId: string,
  ): Promise<void> {
    const [stock] = await tx
      .select({ id: inventoryBalances.variantId })
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.merchantId, merchantId),
          eq(inventoryBalances.locationId, locationId),
          or(gt(inventoryBalances.stockOnHand, 0), gt(inventoryBalances.stockReserved, 0)),
        ),
      )
      .limit(1);
    const [reservation] = await tx
      .select({ id: inventoryReservations.id })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.merchantId, merchantId),
          eq(inventoryReservations.locationId, locationId),
          eq(inventoryReservations.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    if (stock || reservation) {
      throw this.conflict(
        'isActive',
        'A location with stock or active reservations cannot be deactivated',
      );
    }
  }

  private async findAdjustmentReplay(
    idempotency: IdempotencyContext,
  ): Promise<{ movementId: string } | null> {
    const [event] = await this.databaseService.db
      .select({ payload: domainEvents.payload })
      .from(domainEvents)
      .where(eq(domainEvents.idempotencyKey, idempotency.databaseKey))
      .limit(1);

    if (!event) return null;
    this.assertFingerprint(event.payload, idempotency);
    const [movement] = await this.databaseService.db
      .select({ id: inventoryMovements.id })
      .from(inventoryMovements)
      .where(eq(inventoryMovements.idempotencyKey, idempotency.databaseKey))
      .limit(1);

    if (!movement) throw new Error('Inventory idempotency record is incomplete');
    return { movementId: movement.id };
  }

  private async findAdjustmentReplayInTransaction(
    tx: Transaction,
    idempotency: IdempotencyContext,
  ): Promise<{ movementId: string } | null> {
    const [event] = await tx
      .select({ payload: domainEvents.payload })
      .from(domainEvents)
      .where(eq(domainEvents.idempotencyKey, idempotency.databaseKey))
      .limit(1);

    if (!event) return null;
    this.assertFingerprint(event.payload, idempotency);
    const [movement] = await tx
      .select({ id: inventoryMovements.id })
      .from(inventoryMovements)
      .where(eq(inventoryMovements.idempotencyKey, idempotency.databaseKey))
      .limit(1);

    if (!movement) throw new Error('Inventory idempotency record is incomplete');
    return { movementId: movement.id };
  }

  private async recordEvent(tx: Transaction, input: EventInput): Promise<void> {
    await tx.insert(auditLogs).values({
      action: input.action,
      actorUserId: input.actorUserId,
      afterData: input.afterData,
      beforeData: input.beforeData,
      correlationId: input.metadata.correlationId,
      entityId: input.aggregateId,
      entityType: input.aggregateType,
      ipAddress: input.metadata.ipAddress,
      merchantId: input.merchantId,
      metadata: { outcome: 'SUCCESS' },
      requestId: input.metadata.requestId,
      userAgent: input.metadata.userAgent,
    });
    const [event] = await tx
      .insert(domainEvents)
      .values({
        aggregateId: input.aggregateId,
        aggregateType: input.aggregateType,
        eventType: input.eventType,
        idempotencyKey: input.idempotency.databaseKey,
        merchantId: input.merchantId,
        payload: {
          ...input.payload,
          actorUserId: input.actorUserId,
          requestFingerprint: input.idempotency.fingerprint,
        },
      })
      .returning({ id: domainEvents.id });

    if (!event) throw new Error('Inventory domain event insert failed');
    await tx.insert(outboxMessages).values({
      domainEventId: event.id,
      idempotencyKey: `outbox:${event.id}`,
      topic: input.eventType,
    });
  }

  private idempotency(
    action: string,
    actorUserId: string,
    resourceId: string,
    rawKey: string | undefined,
    request: unknown,
  ): IdempotencyContext {
    const key = rawKey?.trim();

    if (!key || key.length < 8 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
      throw this.badRequest(
        'idempotency-key',
        'Idempotency-Key must contain 8-128 safe characters',
      );
    }
    return {
      databaseKey: `merchant-inventory:${this.hash(`${action}:${actorUserId}:${resourceId}:${key}`)}`,
      fingerprint: this.hash(this.stableStringify(request)),
    };
  }

  private serverIdempotency(
    action: string,
    actorUserId: string,
    resourceId: string,
  ): IdempotencyContext {
    return {
      databaseKey: `merchant-inventory:${this.hash(`${action}:${actorUserId}:${resourceId}:${randomUUID()}`)}`,
      fingerprint: this.hash('{}'),
    };
  }

  private assertFingerprint(
    payload: Record<string, unknown>,
    idempotency: IdempotencyContext,
  ): void {
    if (payload.requestFingerprint !== idempotency.fingerprint) {
      throw this.conflict(
        'idempotency-key',
        'Idempotency-Key was already used with a different inventory request',
      );
    }
  }

  private invalidateStockCaches(
    merchantId: string,
    productId: string,
    variantId: string,
  ): Promise<void[]> {
    return Promise.all(
      [
        `catalog:merchant:${merchantId}:published-products`,
        `catalog:product:${productId}:published`,
        `storefront:merchant:${merchantId}:stock`,
        `storefront:variant:${variantId}:stock`,
      ]
        .map((key) => this.redisService.delete(key))
        .concat(this.redisService.increment(STOREFRONT_STOCK_REVISION_KEY).then(() => undefined)),
    );
  }

  private locationView(location: typeof inventoryLocations.$inferSelect): InventoryLocationView {
    return {
      addressSnapshot: location.addressSnapshot,
      code: location.code,
      createdAt: location.createdAt.toISOString(),
      id: location.id,
      isActive: location.isActive,
      isDefault: location.isDefault,
      merchantId: location.merchantId,
      name: location.name,
      updatedAt: location.updatedAt.toISOString(),
    };
  }

  private stockStatus(available: number, threshold: number): InventoryStockStatus {
    if (available <= 0) return 'OUT_OF_STOCK';
    return available <= threshold ? 'LOW_STOCK' : 'IN_STOCK';
  }

  private phaseMovementType(value: string): InventoryOperation {
    if (value === 'STOCK_IN' || value === 'STOCK_OUT' || value === 'ADJUSTMENT') return value;
    throw new Error('Unsupported inventory movement type');
  }

  private encodeLevelCursor(id: string): string {
    return Buffer.from(JSON.stringify({ id })).toString('base64url');
  }

  private decodeLevelCursor(value: string): string {
    try {
      const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
        id?: unknown;
      };

      if (
        typeof parsed.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.id)
      ) {
        throw new Error('invalid');
      }
      return parsed.id;
    } catch {
      throw this.badRequest('cursor', 'Cursor is invalid');
    }
  }

  private encodeMovementCursor(cursor: { createdAt: Date; id: string }): string {
    return Buffer.from(
      JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id }),
    ).toString('base64url');
  }

  private decodeMovementCursor(value: string): { createdAt: Date; id: string } {
    try {
      const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
        createdAt?: unknown;
        id?: unknown;
      };
      const createdAt = new Date(String(parsed.createdAt));

      if (
        typeof parsed.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.id) ||
        Number.isNaN(createdAt.getTime())
      ) {
        throw new Error('invalid');
      }
      return { createdAt, id: parsed.id };
    } catch {
      throw this.badRequest('cursor', 'Cursor is invalid');
    }
  }

  private assertNonemptyDto(dto: object): void {
    if (Object.keys(dto).length === 0) {
      throw this.badRequest('request', 'At least one field is required');
    }
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
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

  private rethrowUnique(error: unknown, field: string, message: string): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }
    if (this.isUniqueViolation(error)) throw this.conflict(field, message);
    throw error;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === '23505'
    );
  }

  private badRequest(field: string, message: string): BadRequestException {
    return new BadRequestException({ message: 'Validation failed', errors: [{ field, message }] });
  }

  private conflict(field: string, message: string): ConflictException {
    return new ConflictException({ message, errors: [{ field, message }] });
  }

  private notFound(message: string): NotFoundException {
    return new NotFoundException({ message, errors: [{ field: 'resource', message }] });
  }
}
