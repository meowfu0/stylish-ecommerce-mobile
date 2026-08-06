import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { products } from '../catalog/schema';
import { users } from '../identity/schema';
import { orderItems } from '../orders/schema';
import { auditTimestamps, softDeleteTimestamp, uuidPrimaryKey } from '../shared/columns';
import { reviewStatusEnum } from '../shared/enums';

export const reviews = pgTable(
  'reviews',
  {
    id: uuidPrimaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    merchantId: uuid('merchant_id').notNull(),
    productId: uuid('product_id').notNull(),
    orderItemId: uuid('order_item_id').notNull(),
    rating: smallint('rating').notNull(),
    title: varchar('title', { length: 150 }),
    body: text('body'),
    status: reviewStatusEnum('status').default('PENDING').notNull(),
    moderatedByUserId: uuid('moderated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    moderationNote: text('moderation_note'),
    publishedAt: timestamp('published_at', { mode: 'date', withTimezone: true }),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    unique('reviews_order_item_unique').on(table.orderItemId),
    unique('reviews_user_product_tenant_unique').on(
      table.userId,
      table.merchantId,
      table.productId,
    ),
    foreignKey({
      columns: [table.productId, table.merchantId],
      foreignColumns: [products.id, products.merchantId],
      name: 'reviews_product_tenant_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.orderItemId, table.productId, table.merchantId],
      foreignColumns: [orderItems.id, orderItems.productId, orderItems.merchantId],
      name: 'reviews_order_item_tenant_fk',
    }).onDelete('restrict'),
    index('reviews_product_published_created_at_idx')
      .on(table.merchantId, table.productId, table.createdAt)
      .where(sql`${table.status} = 'PUBLISHED' and ${table.deletedAt} is null`),
    index('reviews_product_published_rating_idx')
      .on(table.merchantId, table.productId, table.rating)
      .where(sql`${table.status} = 'PUBLISHED' and ${table.deletedAt} is null`),
    index('reviews_merchant_moderation_queue_idx').on(
      table.merchantId,
      table.status,
      table.createdAt,
    ),
    index('reviews_user_created_at_idx').on(table.userId, table.createdAt),
    check('reviews_rating_check', sql`${table.rating} between 1 and 5`),
    check(
      'reviews_title_not_empty_check',
      sql`${table.title} is null or length(btrim(${table.title})) > 0`,
    ),
    check(
      'reviews_published_at_check',
      sql`
        (${table.status} = 'PUBLISHED' and ${table.publishedAt} is not null)
        or (${table.status} <> 'PUBLISHED' and ${table.publishedAt} is null)
      `,
    ),
  ],
);
