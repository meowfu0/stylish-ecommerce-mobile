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
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { users } from '../identity/schema';
import { merchants } from '../merchants/schema';
import {
  auditTimestamps,
  eventTimestamp,
  softDeleteTimestamp,
  uuidPrimaryKey,
} from '../shared/columns';
import { productImageStatusEnum, productStatusEnum } from '../shared/enums';

export const brands = pgTable(
  'brands',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    description: text('description'),
    logoStoragePath: text('logo_storage_path'),
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
    unique('brands_id_merchant_unique').on(table.id, table.merchantId),
    unique('brands_merchant_slug_unique').on(table.merchantId, table.slug),
    uniqueIndex('brands_merchant_name_lower_unique').on(
      table.merchantId,
      sql`lower(${table.name})`,
    ),
    index('brands_merchant_active_name_idx')
      .on(table.merchantId, table.isActive, table.name)
      .where(sql`${table.deletedAt} is null`),
    check(
      'brands_name_slug_not_empty_check',
      sql`length(btrim(${table.name})) > 0 and length(btrim(${table.slug})) > 0`,
    ),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: uuidPrimaryKey(),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    description: text('description'),
    imageStoragePath: text('image_storage_path'),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
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
    unique('categories_slug_unique').on(table.slug),
    index('categories_parent_active_sort_idx').on(table.parentId, table.isActive, table.sortOrder),
    check(
      'categories_name_slug_not_empty_check',
      sql`length(btrim(${table.name})) > 0 and length(btrim(${table.slug})) > 0`,
    ),
    check('categories_sort_order_check', sql`${table.sortOrder} >= 0`),
    check(
      'categories_parent_not_self_check',
      sql`${table.parentId} is null or ${table.parentId} <> ${table.id}`,
    ),
  ],
);

export const collections = pgTable(
  'collections',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    description: text('description'),
    imageStoragePath: text('image_storage_path'),
    isActive: boolean('is_active').default(true).notNull(),
    startsAt: timestamp('starts_at', { mode: 'date', withTimezone: true }),
    endsAt: timestamp('ends_at', { mode: 'date', withTimezone: true }),
    sortOrder: integer('sort_order').default(0).notNull(),
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
    unique('collections_id_merchant_unique').on(table.id, table.merchantId),
    unique('collections_merchant_slug_unique').on(table.merchantId, table.slug),
    uniqueIndex('collections_storefront_active_slug_unique')
      .on(table.slug)
      .where(sql`${table.isActive} and ${table.deletedAt} is null`),
    index('collections_merchant_active_window_idx').on(
      table.merchantId,
      table.isActive,
      table.startsAt,
      table.endsAt,
    ),
    check(
      'collections_name_slug_not_empty_check',
      sql`length(btrim(${table.name})) > 0 and length(btrim(${table.slug})) > 0`,
    ),
    check('collections_sort_order_check', sql`${table.sortOrder} >= 0`),
    check(
      'collections_valid_window_check',
      sql`${table.startsAt} is null or ${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
  ],
);

export const products = pgTable(
  'products',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    brandId: uuid('brand_id'),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 220 }).notNull(),
    shortDescription: varchar('short_description', { length: 500 }),
    description: text('description'),
    status: productStatusEnum('status').default('DRAFT').notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    publishedAt: timestamp('published_at', { mode: 'date', withTimezone: true }),
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
    unique('products_id_merchant_unique').on(table.id, table.merchantId),
    unique('products_merchant_slug_unique').on(table.merchantId, table.slug),
    foreignKey({
      columns: [table.brandId, table.merchantId],
      foreignColumns: [brands.id, brands.merchantId],
      name: 'products_brand_tenant_fk',
    }).onDelete('restrict'),
    index('products_public_listing_idx')
      .on(table.status, table.publishedAt)
      .where(sql`${table.deletedAt} is null`),
    uniqueIndex('products_storefront_active_slug_unique')
      .on(table.slug)
      .where(sql`${table.status} = 'ACTIVE' and ${table.deletedAt} is null`),
    index('products_storefront_featured_published_idx')
      .on(table.isFeatured.desc(), table.publishedAt.desc(), table.id.desc())
      .where(sql`${table.status} = 'ACTIVE' and ${table.deletedAt} is null`),
    index('products_storefront_brand_published_idx')
      .on(table.brandId, table.publishedAt.desc(), table.id.desc())
      .where(
        sql`${table.status} = 'ACTIVE' and ${table.deletedAt} is null and ${table.brandId} is not null`,
      ),
    index('products_merchant_status_published_idx')
      .on(table.merchantId, table.status, table.publishedAt)
      .where(sql`${table.deletedAt} is null`),
    index('products_merchant_brand_status_idx')
      .on(table.merchantId, table.brandId, table.status)
      .where(sql`${table.deletedAt} is null`),
    check(
      'products_name_slug_not_empty_check',
      sql`length(btrim(${table.name})) > 0 and length(btrim(${table.slug})) > 0`,
    ),
    check(
      'products_active_requires_published_at_check',
      sql`${table.status} <> 'ACTIVE' or ${table.publishedAt} is not null`,
    ),
  ],
);

export const productCategories = pgTable(
  'product_categories',
  {
    merchantId: uuid('merchant_id').notNull(),
    productId: uuid('product_id').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    isPrimary: boolean('is_primary').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.merchantId, table.productId, table.categoryId],
      name: 'product_categories_pk',
    }),
    foreignKey({
      columns: [table.productId, table.merchantId],
      foreignColumns: [products.id, products.merchantId],
      name: 'product_categories_product_tenant_fk',
    }).onDelete('cascade'),
    uniqueIndex('product_categories_primary_unique')
      .on(table.merchantId, table.productId)
      .where(sql`${table.isPrimary}`),
    index('product_categories_category_product_idx').on(
      table.categoryId,
      table.merchantId,
      table.productId,
    ),
    check('product_categories_sort_order_check', sql`${table.sortOrder} >= 0`),
  ],
);

export const collectionProducts = pgTable(
  'collection_products',
  {
    merchantId: uuid('merchant_id').notNull(),
    collectionId: uuid('collection_id').notNull(),
    productId: uuid('product_id').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.merchantId, table.collectionId, table.productId],
      name: 'collection_products_pk',
    }),
    foreignKey({
      columns: [table.collectionId, table.merchantId],
      foreignColumns: [collections.id, collections.merchantId],
      name: 'collection_products_collection_tenant_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.productId, table.merchantId],
      foreignColumns: [products.id, products.merchantId],
      name: 'collection_products_product_tenant_fk',
    }).onDelete('restrict'),
    index('collection_products_collection_sort_idx').on(
      table.merchantId,
      table.collectionId,
      table.sortOrder,
    ),
    index('collection_products_product_idx').on(table.merchantId, table.productId),
    check('collection_products_sort_order_check', sql`${table.sortOrder} >= 0`),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id').notNull(),
    productId: uuid('product_id').notNull(),
    storagePath: text('storage_path').notNull(),
    publicUrl: text('public_url'),
    status: productImageStatusEnum('status').default('PENDING').notNull(),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadExpiresAt: timestamp('upload_expires_at', { mode: 'date', withTimezone: true }).notNull(),
    confirmedAt: timestamp('confirmed_at', { mode: 'date', withTimezone: true }),
    altText: varchar('alt_text', { length: 255 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    ...auditTimestamps(),
  },
  (table) => [
    foreignKey({
      columns: [table.productId, table.merchantId],
      foreignColumns: [products.id, products.merchantId],
      name: 'product_images_product_tenant_fk',
    }).onDelete('cascade'),
    unique('product_images_storage_path_unique').on(table.storagePath),
    uniqueIndex('product_images_primary_unique')
      .on(table.merchantId, table.productId)
      .where(sql`${table.isPrimary}`),
    index('product_images_product_sort_idx').on(table.merchantId, table.productId, table.sortOrder),
    index('product_images_pending_expiry_idx')
      .on(table.uploadExpiresAt)
      .where(sql`${table.status} = 'PENDING'`),
    check(
      'product_images_storage_path_not_empty_check',
      sql`length(btrim(${table.storagePath})) > 0`,
    ),
    check('product_images_sort_order_check', sql`${table.sortOrder} >= 0`),
    check(
      'product_images_content_type_check',
      sql`${table.contentType} in ('image/jpeg', 'image/png', 'image/webp')`,
    ),
    check(
      'product_images_size_bytes_check',
      sql`${table.sizeBytes} > 0 and ${table.sizeBytes} <= 5242880`,
    ),
    check(
      'product_images_lifecycle_check',
      sql`
        (
          ${table.status} = 'PENDING'
          and ${table.confirmedAt} is null
          and ${table.isPrimary} = false
        )
        or (
          ${table.status} = 'CONFIRMED'
          and ${table.confirmedAt} is not null
        )
      `,
    ),
    check('product_images_upload_expiry_check', sql`${table.uploadExpiresAt} > ${table.createdAt}`),
  ],
);

export const productOptions = pgTable(
  'product_options',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id').notNull(),
    productId: uuid('product_id').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    ...auditTimestamps(),
  },
  (table) => [
    unique('product_options_id_product_merchant_unique').on(
      table.id,
      table.productId,
      table.merchantId,
    ),
    foreignKey({
      columns: [table.productId, table.merchantId],
      foreignColumns: [products.id, products.merchantId],
      name: 'product_options_product_tenant_fk',
    }).onDelete('cascade'),
    uniqueIndex('product_options_product_name_lower_unique').on(
      table.merchantId,
      table.productId,
      sql`lower(${table.name})`,
    ),
    index('product_options_product_display_order_idx').on(
      table.merchantId,
      table.productId,
      table.displayOrder,
    ),
    check('product_options_name_not_empty_check', sql`length(btrim(${table.name})) > 0`),
    check('product_options_display_order_check', sql`${table.displayOrder} >= 0`),
  ],
);

export const productOptionValues = pgTable(
  'product_option_values',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id').notNull(),
    productId: uuid('product_id').notNull(),
    optionId: uuid('option_id').notNull(),
    value: varchar('value', { length: 100 }).notNull(),
    displayLabel: varchar('display_label', { length: 100 }).notNull(),
    swatchHex: varchar('swatch_hex', { length: 7 }),
    displayOrder: integer('display_order').default(0).notNull(),
    ...auditTimestamps(),
  },
  (table) => [
    foreignKey({
      columns: [table.optionId, table.productId, table.merchantId],
      foreignColumns: [productOptions.id, productOptions.productId, productOptions.merchantId],
      name: 'product_option_values_option_tenant_fk',
    }).onDelete('cascade'),
    unique('product_option_values_id_product_option_merchant_unique').on(
      table.id,
      table.productId,
      table.optionId,
      table.merchantId,
    ),
    uniqueIndex('product_option_values_option_value_lower_unique').on(
      table.merchantId,
      table.optionId,
      sql`lower(${table.value})`,
    ),
    index('product_option_values_product_option_order_idx').on(
      table.merchantId,
      table.productId,
      table.optionId,
      table.displayOrder,
    ),
    check(
      'product_option_values_text_not_empty_check',
      sql`
        length(btrim(${table.value})) > 0
        and length(btrim(${table.displayLabel})) > 0
      `,
    ),
    check(
      'product_option_values_swatch_hex_check',
      sql`${table.swatchHex} is null or ${table.swatchHex} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    check('product_option_values_display_order_check', sql`${table.displayOrder} >= 0`),
  ],
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id').notNull(),
    productId: uuid('product_id').notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    sku: varchar('sku', { length: 100 }).notNull(),
    barcode: varchar('barcode', { length: 100 }),
    optionSignature: text('option_signature').notNull(),
    priceCentavos: integer('price_centavos').notNull(),
    compareAtPriceCentavos: integer('compare_at_price_centavos'),
    isDefault: boolean('is_default').default(false).notNull(),
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
    unique('product_variants_id_merchant_unique').on(table.id, table.merchantId),
    unique('product_variants_id_product_merchant_unique').on(
      table.id,
      table.productId,
      table.merchantId,
    ),
    foreignKey({
      columns: [table.productId, table.merchantId],
      foreignColumns: [products.id, products.merchantId],
      name: 'product_variants_product_tenant_fk',
    }).onDelete('cascade'),
    unique('product_variants_product_signature_unique').on(
      table.merchantId,
      table.productId,
      table.optionSignature,
    ),
    uniqueIndex('product_variants_merchant_sku_lower_unique').on(
      table.merchantId,
      sql`lower(${table.sku})`,
    ),
    uniqueIndex('product_variants_merchant_barcode_unique')
      .on(table.merchantId, table.barcode)
      .where(sql`${table.barcode} is not null`),
    uniqueIndex('product_variants_active_default_unique')
      .on(table.merchantId, table.productId)
      .where(sql`${table.isDefault} and ${table.isActive} and ${table.deletedAt} is null`),
    index('product_variants_product_active_price_idx')
      .on(table.merchantId, table.productId, table.isActive, table.priceCentavos)
      .where(sql`${table.deletedAt} is null`),
    index('product_variants_storefront_active_price_idx')
      .on(table.priceCentavos, table.productId, table.merchantId)
      .where(sql`${table.isActive} and ${table.deletedAt} is null`),
    check(
      'product_variants_required_text_check',
      sql`
        length(btrim(${table.name})) > 0
        and length(btrim(${table.sku})) > 0
        and length(btrim(${table.optionSignature})) > 0
      `,
    ),
    check(
      'product_variants_barcode_not_empty_check',
      sql`${table.barcode} is null or length(btrim(${table.barcode})) > 0`,
    ),
    check('product_variants_price_check', sql`${table.priceCentavos} >= 0`),
    check(
      'product_variants_compare_at_price_check',
      sql`
        ${table.compareAtPriceCentavos} is null
        or ${table.compareAtPriceCentavos} > ${table.priceCentavos}
      `,
    ),
  ],
);

export const variantOptionValues = pgTable(
  'variant_option_values',
  {
    merchantId: uuid('merchant_id').notNull(),
    productId: uuid('product_id').notNull(),
    variantId: uuid('variant_id').notNull(),
    optionId: uuid('option_id').notNull(),
    optionValueId: uuid('option_value_id').notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.merchantId, table.variantId, table.optionId],
      name: 'variant_option_values_pk',
    }),
    foreignKey({
      columns: [table.variantId, table.productId, table.merchantId],
      foreignColumns: [productVariants.id, productVariants.productId, productVariants.merchantId],
      name: 'variant_option_values_variant_tenant_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.optionValueId, table.productId, table.optionId, table.merchantId],
      foreignColumns: [
        productOptionValues.id,
        productOptionValues.productId,
        productOptionValues.optionId,
        productOptionValues.merchantId,
      ],
      name: 'variant_option_values_value_tenant_fk',
    }).onDelete('cascade'),
    index('variant_option_values_filter_idx').on(
      table.merchantId,
      table.optionValueId,
      table.variantId,
    ),
  ],
);
