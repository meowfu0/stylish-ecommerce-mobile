import { sql } from 'drizzle-orm';
import {
  char,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { productVariants, products } from '../catalog/schema';
import { users } from '../identity/schema';
import { auditTimestamps, eventTimestamp, uuidPrimaryKey } from '../shared/columns';
import { cartStatusEnum } from '../shared/enums';

export const carts = pgTable(
  'carts',
  {
    id: uuidPrimaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'restrict' }),
    guestTokenHash: char('guest_token_hash', { length: 64 }),
    status: cartStatusEnum('status').default('ACTIVE').notNull(),
    mergedIntoCartId: uuid('merged_into_cart_id').references((): AnyPgColumn => carts.id, {
      onDelete: 'restrict',
    }),
    expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }),
    convertedAt: timestamp('converted_at', { mode: 'date', withTimezone: true }),
    ...auditTimestamps(),
  },
  (table) => [
    unique('carts_id_user_unique').on(table.id, table.userId),
    uniqueIndex('carts_active_user_unique')
      .on(table.userId)
      .where(sql`${table.userId} is not null and ${table.status} = 'ACTIVE'`),
    uniqueIndex('carts_guest_token_hash_unique')
      .on(table.guestTokenHash)
      .where(sql`${table.guestTokenHash} is not null`),
    index('carts_status_expires_at_idx').on(table.status, table.expiresAt),
    index('carts_user_status_idx').on(table.userId, table.status),
    check(
      'carts_exactly_one_owner_check',
      sql`
        (${table.userId} is not null and ${table.guestTokenHash} is null)
        or (${table.userId} is null and ${table.guestTokenHash} is not null)
      `,
    ),
    check(
      'carts_guest_requires_expiry_check',
      sql`${table.guestTokenHash} is null or ${table.expiresAt} is not null`,
    ),
    check(
      'carts_guest_token_hash_format_check',
      sql`${table.guestTokenHash} is null or ${table.guestTokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'carts_merged_target_check',
      sql`
        (${table.status} = 'MERGED' and ${table.mergedIntoCartId} is not null)
        or (${table.status} <> 'MERGED' and ${table.mergedIntoCartId} is null)
      `,
    ),
    check(
      'carts_converted_at_check',
      sql`
        (${table.status} = 'CONVERTED' and ${table.convertedAt} is not null)
        or (${table.status} <> 'CONVERTED' and ${table.convertedAt} is null)
      `,
    ),
    check(
      'carts_merge_not_self_check',
      sql`${table.mergedIntoCartId} is null or ${table.mergedIntoCartId} <> ${table.id}`,
    ),
  ],
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuidPrimaryKey(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    merchantId: uuid('merchant_id').notNull(),
    productId: uuid('product_id').notNull(),
    variantId: uuid('variant_id').notNull(),
    quantity: integer('quantity').notNull(),
    ...auditTimestamps(),
  },
  (table) => [
    unique('cart_items_cart_variant_unique').on(table.cartId, table.variantId),
    foreignKey({
      columns: [table.variantId, table.productId, table.merchantId],
      foreignColumns: [productVariants.id, productVariants.productId, productVariants.merchantId],
      name: 'cart_items_variant_tenant_fk',
    }).onDelete('restrict'),
    index('cart_items_cart_merchant_idx').on(table.cartId, table.merchantId),
    index('cart_items_variant_cart_idx').on(table.merchantId, table.variantId, table.cartId),
    check('cart_items_quantity_check', sql`${table.quantity} between 1 and 999`),
  ],
);

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    merchantId: uuid('merchant_id').notNull(),
    productId: uuid('product_id').notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.merchantId, table.productId],
      name: 'wishlist_items_pk',
    }),
    foreignKey({
      columns: [table.productId, table.merchantId],
      foreignColumns: [products.id, products.merchantId],
      name: 'wishlist_items_product_tenant_fk',
    }).onDelete('restrict'),
    index('wishlist_items_product_created_at_idx').on(
      table.merchantId,
      table.productId,
      table.createdAt,
    ),
  ],
);
