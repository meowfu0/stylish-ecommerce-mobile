import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { brands, categories, collections, products } from '../catalog/schema';
import { users } from '../identity/schema';
import { merchants } from '../merchants/schema';
import { merchantOrders } from '../orders/schema';
import {
  auditTimestamps,
  eventTimestamp,
  softDeleteTimestamp,
  uuidPrimaryKey,
} from '../shared/columns';
import {
  discountApplicationMethodEnum,
  discountRedemptionStatusEnum,
  discountTypeEnum,
} from '../shared/enums';

export const discounts = pgTable(
  'discounts',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 150 }).notNull(),
    code: varchar('code', { length: 64 }),
    description: text('description'),
    discountType: discountTypeEnum('discount_type').notNull(),
    applicationMethod: discountApplicationMethodEnum('application_method')
      .default('CODE')
      .notNull(),
    fixedAmountCentavos: integer('fixed_amount_centavos'),
    percentageBasisPoints: smallint('percentage_basis_points'),
    maximumDiscountCentavos: integer('maximum_discount_centavos'),
    minimumSubtotalCentavos: integer('minimum_subtotal_centavos').default(0).notNull(),
    minimumItemQuantity: integer('minimum_item_quantity').default(1).notNull(),
    firstOrderOnly: boolean('first_order_only').default(false).notNull(),
    totalUsageLimit: integer('total_usage_limit'),
    perUserUsageLimit: integer('per_user_usage_limit'),
    redeemedCount: integer('redeemed_count').default(0).notNull(),
    startsAt: timestamp('starts_at', { mode: 'date', withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { mode: 'date', withTimezone: true }),
    isActive: boolean('is_active').default(true).notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    deletedByUserId: uuid('deleted_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    unique('discounts_id_merchant_unique').on(table.id, table.merchantId),
    uniqueIndex('discounts_merchant_code_upper_unique')
      .on(table.merchantId, sql`upper(${table.code})`)
      .where(sql`${table.code} is not null`),
    index('discounts_merchant_active_window_idx').on(
      table.merchantId,
      table.isActive,
      table.startsAt,
      table.endsAt,
    ),
    index('discounts_merchant_method_active_idx').on(
      table.merchantId,
      table.applicationMethod,
      table.isActive,
    ),
    check('discounts_name_not_empty_check', sql`length(btrim(${table.name})) > 0`),
    check(
      'discounts_code_method_check',
      sql`
        (
          ${table.applicationMethod} = 'CODE'
          and ${table.code} is not null
          and ${table.code} = upper(btrim(${table.code}))
          and length(${table.code}) > 0
        )
        or (
          ${table.applicationMethod} = 'AUTOMATIC'
          and ${table.code} is null
        )
      `,
    ),
    check(
      'discounts_value_shape_check',
      sql`
        (
          ${table.discountType} = 'FIXED_AMOUNT'
          and ${table.fixedAmountCentavos} > 0
          and ${table.percentageBasisPoints} is null
          and ${table.maximumDiscountCentavos} is null
        )
        or (
          ${table.discountType} = 'PERCENTAGE'
          and ${table.fixedAmountCentavos} is null
          and ${table.percentageBasisPoints} between 1 and 10000
        )
        or (
          ${table.discountType} = 'FREE_SHIPPING'
          and ${table.fixedAmountCentavos} is null
          and ${table.percentageBasisPoints} is null
        )
      `,
    ),
    check(
      'discounts_nonnegative_thresholds_check',
      sql`
        ${table.minimumSubtotalCentavos} >= 0
        and ${table.minimumItemQuantity} >= 1
        and ${table.redeemedCount} >= 0
        and (
          ${table.maximumDiscountCentavos} is null
          or ${table.maximumDiscountCentavos} >= 0
        )
      `,
    ),
    check(
      'discounts_positive_usage_limits_check',
      sql`
        (${table.totalUsageLimit} is null or ${table.totalUsageLimit} > 0)
        and (${table.perUserUsageLimit} is null or ${table.perUserUsageLimit} > 0)
      `,
    ),
    check(
      'discounts_redeemed_within_limit_check',
      sql`
        ${table.totalUsageLimit} is null
        or ${table.redeemedCount} <= ${table.totalUsageLimit}
      `,
    ),
    check(
      'discounts_valid_window_check',
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
  ],
);

export const discountProducts = pgTable(
  'discount_products',
  {
    discountId: uuid('discount_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    productId: uuid('product_id').notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.discountId, table.merchantId, table.productId],
      name: 'discount_products_pk',
    }),
    foreignKey({
      columns: [table.discountId, table.merchantId],
      foreignColumns: [discounts.id, discounts.merchantId],
      name: 'discount_products_discount_tenant_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.productId, table.merchantId],
      foreignColumns: [products.id, products.merchantId],
      name: 'discount_products_product_tenant_fk',
    }).onDelete('restrict'),
    index('discount_products_product_discount_idx').on(
      table.merchantId,
      table.productId,
      table.discountId,
    ),
  ],
);

export const discountCategories = pgTable(
  'discount_categories',
  {
    discountId: uuid('discount_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.discountId, table.merchantId, table.categoryId],
      name: 'discount_categories_pk',
    }),
    foreignKey({
      columns: [table.discountId, table.merchantId],
      foreignColumns: [discounts.id, discounts.merchantId],
      name: 'discount_categories_discount_tenant_fk',
    }).onDelete('cascade'),
    index('discount_categories_category_discount_idx').on(
      table.categoryId,
      table.merchantId,
      table.discountId,
    ),
  ],
);

export const discountCollections = pgTable(
  'discount_collections',
  {
    discountId: uuid('discount_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    collectionId: uuid('collection_id').notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.discountId, table.merchantId, table.collectionId],
      name: 'discount_collections_pk',
    }),
    foreignKey({
      columns: [table.discountId, table.merchantId],
      foreignColumns: [discounts.id, discounts.merchantId],
      name: 'discount_collections_discount_tenant_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.collectionId, table.merchantId],
      foreignColumns: [collections.id, collections.merchantId],
      name: 'discount_collections_collection_tenant_fk',
    }).onDelete('restrict'),
    index('discount_collections_collection_discount_idx').on(
      table.merchantId,
      table.collectionId,
      table.discountId,
    ),
  ],
);

export const discountBrands = pgTable(
  'discount_brands',
  {
    discountId: uuid('discount_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    brandId: uuid('brand_id').notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.discountId, table.merchantId, table.brandId],
      name: 'discount_brands_pk',
    }),
    foreignKey({
      columns: [table.discountId, table.merchantId],
      foreignColumns: [discounts.id, discounts.merchantId],
      name: 'discount_brands_discount_tenant_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.brandId, table.merchantId],
      foreignColumns: [brands.id, brands.merchantId],
      name: 'discount_brands_brand_tenant_fk',
    }).onDelete('restrict'),
    index('discount_brands_brand_discount_idx').on(
      table.merchantId,
      table.brandId,
      table.discountId,
    ),
  ],
);

export const discountRedemptions = pgTable(
  'discount_redemptions',
  {
    id: uuidPrimaryKey(),
    discountId: uuid('discount_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    merchantOrderId: uuid('merchant_order_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    codeSnapshot: varchar('code_snapshot', { length: 64 }),
    amountCentavos: integer('amount_centavos').notNull(),
    status: discountRedemptionStatusEnum('status').default('APPLIED').notNull(),
    redeemedAt: timestamp('redeemed_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    reversedAt: timestamp('reversed_at', { mode: 'date', withTimezone: true }),
  },
  (table) => [
    unique('discount_redemptions_merchant_order_unique').on(table.merchantOrderId),
    foreignKey({
      columns: [table.discountId, table.merchantId],
      foreignColumns: [discounts.id, discounts.merchantId],
      name: 'discount_redemptions_discount_tenant_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.merchantOrderId, table.merchantId],
      foreignColumns: [merchantOrders.id, merchantOrders.merchantId],
      name: 'discount_redemptions_order_tenant_fk',
    }).onDelete('restrict'),
    index('discount_redemptions_discount_status_redeemed_idx').on(
      table.merchantId,
      table.discountId,
      table.status,
      table.redeemedAt,
    ),
    index('discount_redemptions_user_discount_status_idx').on(
      table.userId,
      table.discountId,
      table.status,
    ),
    check('discount_redemptions_amount_check', sql`${table.amountCentavos} >= 0`),
    check(
      'discount_redemptions_reversed_at_check',
      sql`
        (${table.status} = 'REVERSED' and ${table.reversedAt} is not null)
        or (${table.status} <> 'REVERSED' and ${table.reversedAt} is null)
      `,
    ),
  ],
);
