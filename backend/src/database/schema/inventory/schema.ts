import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { carts } from '../carts/schema';
import { productVariants } from '../catalog/schema';
import { users } from '../identity/schema';
import { merchants } from '../merchants/schema';
import { merchantOrders } from '../orders/schema';
import { auditTimestamps, eventTimestamp, uuidPrimaryKey } from '../shared/columns';
import {
  inventoryMovementTypeEnum,
  inventoryReferenceTypeEnum,
  inventoryReservationStatusEnum,
} from '../shared/enums';

export const inventoryLocations = pgTable(
  'inventory_locations',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    code: varchar('code', { length: 100 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    addressSnapshot: text('address_snapshot'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...auditTimestamps(),
  },
  (table) => [
    unique('inventory_locations_id_merchant_unique').on(table.id, table.merchantId),
    uniqueIndex('inventory_locations_merchant_code_lower_unique').on(
      table.merchantId,
      sql`lower(${table.code})`,
    ),
    uniqueIndex('inventory_locations_default_unique')
      .on(table.merchantId)
      .where(sql`${table.isDefault} and ${table.isActive}`),
    index('inventory_locations_merchant_active_name_idx').on(
      table.merchantId,
      table.isActive,
      table.name,
    ),
    check(
      'inventory_locations_code_name_not_empty_check',
      sql`length(btrim(${table.code})) > 0 and length(btrim(${table.name})) > 0`,
    ),
    check(
      'inventory_locations_default_requires_active_check',
      sql`not ${table.isDefault} or ${table.isActive}`,
    ),
  ],
);

export const inventoryBalances = pgTable(
  'inventory_balances',
  {
    merchantId: uuid('merchant_id').notNull(),
    locationId: uuid('location_id').notNull(),
    variantId: uuid('variant_id').notNull(),
    stockOnHand: integer('stock_on_hand').default(0).notNull(),
    stockReserved: integer('stock_reserved').default(0).notNull(),
    reorderThreshold: integer('reorder_threshold').default(0).notNull(),
    version: integer('version').default(0).notNull(),
    ...auditTimestamps(),
  },
  (table) => [
    primaryKey({
      columns: [table.merchantId, table.locationId, table.variantId],
      name: 'inventory_balances_pk',
    }),
    foreignKey({
      columns: [table.locationId, table.merchantId],
      foreignColumns: [inventoryLocations.id, inventoryLocations.merchantId],
      name: 'inventory_balances_location_tenant_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.variantId, table.merchantId],
      foreignColumns: [productVariants.id, productVariants.merchantId],
      name: 'inventory_balances_variant_tenant_fk',
    }).onDelete('restrict'),
    index('inventory_balances_variant_availability_idx').on(
      table.merchantId,
      table.variantId,
      table.stockOnHand,
      table.stockReserved,
    ),
    index('inventory_balances_location_low_stock_idx').on(
      table.merchantId,
      table.locationId,
      table.stockOnHand,
      table.reorderThreshold,
    ),
    check(
      'inventory_balances_nonnegative_check',
      sql`
        ${table.stockOnHand} >= 0
        and ${table.stockReserved} >= 0
        and ${table.reorderThreshold} >= 0
        and ${table.version} >= 0
      `,
    ),
    check(
      'inventory_balances_reserved_not_above_on_hand_check',
      sql`${table.stockReserved} <= ${table.stockOnHand}`,
    ),
  ],
);

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id').notNull(),
    locationId: uuid('location_id').notNull(),
    variantId: uuid('variant_id').notNull(),
    movementType: inventoryMovementTypeEnum('movement_type').notNull(),
    deltaOnHand: integer('delta_on_hand').default(0).notNull(),
    deltaReserved: integer('delta_reserved').default(0).notNull(),
    beforeOnHand: integer('before_on_hand').notNull(),
    afterOnHand: integer('after_on_hand').notNull(),
    beforeReserved: integer('before_reserved').notNull(),
    afterReserved: integer('after_reserved').notNull(),
    referenceType: inventoryReferenceTypeEnum('reference_type'),
    referenceId: uuid('reference_id'),
    idempotencyKey: varchar('idempotency_key', { length: 150 }).notNull(),
    note: text('note'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: eventTimestamp(),
  },
  (table) => [
    foreignKey({
      columns: [table.merchantId, table.locationId, table.variantId],
      foreignColumns: [
        inventoryBalances.merchantId,
        inventoryBalances.locationId,
        inventoryBalances.variantId,
      ],
      name: 'inventory_movements_balance_tenant_fk',
    }).onDelete('restrict'),
    unique('inventory_movements_idempotency_key_unique').on(table.idempotencyKey),
    index('inventory_movements_merchant_created_at_idx').on(
      table.merchantId,
      table.createdAt,
      table.id,
    ),
    index('inventory_movements_balance_created_at_idx').on(
      table.merchantId,
      table.locationId,
      table.variantId,
      table.createdAt,
    ),
    index('inventory_movements_reference_idx').on(table.referenceType, table.referenceId),
    check(
      'inventory_movements_nonzero_delta_check',
      sql`${table.deltaOnHand} <> 0 or ${table.deltaReserved} <> 0`,
    ),
    check(
      'inventory_movements_on_hand_arithmetic_check',
      sql`${table.afterOnHand} = ${table.beforeOnHand} + ${table.deltaOnHand}`,
    ),
    check(
      'inventory_movements_reserved_arithmetic_check',
      sql`${table.afterReserved} = ${table.beforeReserved} + ${table.deltaReserved}`,
    ),
    check(
      'inventory_movements_nonnegative_balances_check',
      sql`
        ${table.beforeOnHand} >= 0
        and ${table.afterOnHand} >= 0
        and ${table.beforeReserved} >= 0
        and ${table.afterReserved} >= 0
      `,
    ),
    check(
      'inventory_movements_reserved_not_above_on_hand_check',
      sql`
        ${table.beforeReserved} <= ${table.beforeOnHand}
        and ${table.afterReserved} <= ${table.afterOnHand}
      `,
    ),
    check(
      'inventory_movements_reference_pair_check',
      sql`
        (${table.referenceType} is null and ${table.referenceId} is null)
        or (${table.referenceType} is not null and ${table.referenceId} is not null)
      `,
    ),
    check(
      'inventory_movements_idempotency_key_not_empty_check',
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
  ],
);

export const inventoryReservations = pgTable(
  'inventory_reservations',
  {
    id: uuidPrimaryKey(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'restrict' }),
    merchantId: uuid('merchant_id').notNull(),
    locationId: uuid('location_id').notNull(),
    variantId: uuid('variant_id').notNull(),
    merchantOrderId: uuid('merchant_order_id'),
    idempotencyKey: varchar('idempotency_key', { length: 150 }).notNull(),
    quantity: integer('quantity').notNull(),
    status: inventoryReservationStatusEnum('status').default('ACTIVE').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
    convertedAt: timestamp('converted_at', { mode: 'date', withTimezone: true }),
    releasedAt: timestamp('released_at', { mode: 'date', withTimezone: true }),
    releaseReason: varchar('release_reason', { length: 255 }),
    ...auditTimestamps(),
  },
  (table) => [
    foreignKey({
      columns: [table.merchantId, table.locationId, table.variantId],
      foreignColumns: [
        inventoryBalances.merchantId,
        inventoryBalances.locationId,
        inventoryBalances.variantId,
      ],
      name: 'inventory_reservations_balance_tenant_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.merchantOrderId, table.merchantId],
      foreignColumns: [merchantOrders.id, merchantOrders.merchantId],
      name: 'inventory_reservations_merchant_order_tenant_fk',
    }).onDelete('restrict'),
    uniqueIndex('inventory_reservations_active_cart_balance_unique')
      .on(table.cartId, table.merchantId, table.locationId, table.variantId)
      .where(sql`${table.status} = 'ACTIVE'`),
    unique('inventory_reservations_idempotency_key_unique').on(table.idempotencyKey),
    index('inventory_reservations_processing_idx').on(table.status, table.expiresAt),
    index('inventory_reservations_balance_status_idx').on(
      table.merchantId,
      table.locationId,
      table.variantId,
      table.status,
    ),
    index('inventory_reservations_order_idx').on(table.merchantId, table.merchantOrderId),
    check('inventory_reservations_quantity_check', sql`${table.quantity} > 0`),
    check(
      'inventory_reservations_idempotency_key_not_empty_check',
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
    check(
      'inventory_reservations_expiry_after_creation_check',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      'inventory_reservations_status_fields_check',
      sql`
        (
          ${table.status} = 'ACTIVE'
          and ${table.merchantOrderId} is null
          and ${table.convertedAt} is null
          and ${table.releasedAt} is null
        )
        or (
          ${table.status} = 'CONVERTED'
          and ${table.merchantOrderId} is not null
          and ${table.convertedAt} is not null
          and ${table.releasedAt} is null
        )
        or (
          ${table.status} in ('RELEASED', 'EXPIRED')
          and ${table.convertedAt} is null
          and ${table.releasedAt} is not null
        )
      `,
    ),
  ],
);
