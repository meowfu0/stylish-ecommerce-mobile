import { sql } from 'drizzle-orm';
import {
  char,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
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
import { productVariants, products } from '../catalog/schema';
import { addresses, users } from '../identity/schema';
import { merchantAddresses, merchants } from '../merchants/schema';
import { auditTimestamps, eventTimestamp, uuidPrimaryKey } from '../shared/columns';
import {
  fulfillmentStatusEnum,
  marketplaceOrderStatusEnum,
  merchantOrderStatusEnum,
  orderAddressTypeEnum,
  paymentMethodEnum,
  paymentStatusEnum,
} from '../shared/enums';

export const orders = pgTable(
  'orders',
  {
    id: uuidPrimaryKey(),
    orderNumber: varchar('order_number', { length: 32 }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    sourceCartId: uuid('source_cart_id'),
    sourceAddressId: uuid('source_address_id'),
    idempotencyKey: varchar('idempotency_key', { length: 100 }).notNull(),
    customerEmailSnapshot: varchar('customer_email_snapshot', { length: 320 }).notNull(),
    status: marketplaceOrderStatusEnum('status').default('PENDING').notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    paymentStatus: paymentStatusEnum('payment_status').default('PENDING').notNull(),
    currency: char('currency', { length: 3 }).default('PHP').notNull(),
    itemsSubtotalCentavos: integer('items_subtotal_centavos').notNull(),
    discountCentavos: integer('discount_centavos').default(0).notNull(),
    shippingCentavos: integer('shipping_centavos').default(0).notNull(),
    taxCentavos: integer('tax_centavos').default(0).notNull(),
    totalCentavos: integer('total_centavos').notNull(),
    customerNote: text('customer_note'),
    placedAt: timestamp('placed_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at', { mode: 'date', withTimezone: true }),
    ...auditTimestamps(),
  },
  (table) => [
    unique('orders_order_number_unique').on(table.orderNumber),
    unique('orders_idempotency_key_unique').on(table.idempotencyKey),
    uniqueIndex('orders_source_cart_unique')
      .on(table.sourceCartId)
      .where(sql`${table.sourceCartId} is not null`),
    foreignKey({
      columns: [table.sourceCartId, table.userId],
      foreignColumns: [carts.id, carts.userId],
      name: 'orders_source_cart_owner_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.sourceAddressId, table.userId],
      foreignColumns: [addresses.id, addresses.userId],
      name: 'orders_source_address_owner_fk',
    }).onDelete('restrict'),
    index('orders_user_created_at_idx').on(table.userId, table.createdAt),
    index('orders_status_created_at_idx').on(table.status, table.createdAt),
    index('orders_payment_status_created_at_idx').on(table.paymentStatus, table.createdAt),
    index('orders_source_address_idx').on(table.sourceAddressId),
    check(
      'orders_required_text_check',
      sql`
        length(btrim(${table.orderNumber})) > 0
        and length(btrim(${table.idempotencyKey})) > 0
        and length(btrim(${table.customerEmailSnapshot})) > 0
      `,
    ),
    check(
      'orders_nonnegative_amounts_check',
      sql`
        ${table.itemsSubtotalCentavos} >= 0
        and ${table.discountCentavos} >= 0
        and ${table.shippingCentavos} >= 0
        and ${table.taxCentavos} >= 0
        and ${table.totalCentavos} >= 0
      `,
    ),
    check(
      'orders_discount_not_above_subtotal_check',
      sql`${table.discountCentavos} <= ${table.itemsSubtotalCentavos}`,
    ),
    check(
      'orders_total_check',
      sql`
        ${table.totalCentavos}
        = ${table.itemsSubtotalCentavos}
          - ${table.discountCentavos}
          + ${table.shippingCentavos}
          + ${table.taxCentavos}
      `,
    ),
    check('orders_currency_check', sql`${table.currency} = 'PHP'`),
    check(
      'orders_cancelled_at_check',
      sql`
        (${table.status} = 'CANCELLED' and ${table.cancelledAt} is not null)
        or (${table.status} <> 'CANCELLED' and ${table.cancelledAt} is null)
      `,
    ),
  ],
);

export const orderAddresses = pgTable(
  'order_addresses',
  {
    id: uuidPrimaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    addressType: orderAddressTypeEnum('address_type').notNull(),
    labelSnapshot: varchar('label_snapshot', { length: 50 }),
    recipientName: varchar('recipient_name', { length: 150 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    addressLine1: varchar('address_line_1', { length: 255 }).notNull(),
    addressLine2: varchar('address_line_2', { length: 255 }),
    barangay: varchar('barangay', { length: 150 }),
    city: varchar('city', { length: 150 }).notNull(),
    province: varchar('province', { length: 150 }).notNull(),
    postalCode: varchar('postal_code', { length: 20 }).notNull(),
    countryCode: char('country_code', { length: 2 }).default('PH').notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    unique('order_addresses_order_type_unique').on(table.orderId, table.addressType),
    check(
      'order_addresses_required_text_check',
      sql`
        length(btrim(${table.recipientName})) > 0
        and length(btrim(${table.phone})) > 0
        and length(btrim(${table.addressLine1})) > 0
        and length(btrim(${table.city})) > 0
        and length(btrim(${table.province})) > 0
        and length(btrim(${table.postalCode})) > 0
      `,
    ),
    check('order_addresses_country_code_check', sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
  ],
);

export const merchantOrders = pgTable(
  'merchant_orders',
  {
    id: uuidPrimaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    merchantOrderNumber: varchar('merchant_order_number', { length: 40 }).notNull(),
    status: merchantOrderStatusEnum('status').default('PENDING').notNull(),
    itemsSubtotalCentavos: integer('items_subtotal_centavos').notNull(),
    discountCentavos: integer('discount_centavos').default(0).notNull(),
    shippingCentavos: integer('shipping_centavos').default(0).notNull(),
    taxCentavos: integer('tax_centavos').default(0).notNull(),
    grossTotalCentavos: integer('gross_total_centavos').notNull(),
    platformCommissionCentavos: integer('platform_commission_centavos').default(0).notNull(),
    merchantEarningsCentavos: integer('merchant_earnings_centavos').notNull(),
    refundedCentavos: integer('refunded_centavos').default(0).notNull(),
    commissionReversedCentavos: integer('commission_reversed_centavos').default(0).notNull(),
    merchantRefundLiabilityCentavos: integer('merchant_refund_liability_centavos')
      .default(0)
      .notNull(),
    netMerchantEarningsCentavos: integer('net_merchant_earnings_centavos').notNull(),
    confirmedAt: timestamp('confirmed_at', { mode: 'date', withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { mode: 'date', withTimezone: true }),
    ...auditTimestamps(),
  },
  (table) => [
    unique('merchant_orders_id_merchant_unique').on(table.id, table.merchantId),
    unique('merchant_orders_id_order_merchant_unique').on(
      table.id,
      table.orderId,
      table.merchantId,
    ),
    unique('merchant_orders_parent_merchant_unique').on(table.orderId, table.merchantId),
    unique('merchant_orders_number_unique').on(table.merchantOrderNumber),
    index('merchant_orders_merchant_status_created_at_idx').on(
      table.merchantId,
      table.status,
      table.createdAt,
    ),
    index('merchant_orders_parent_status_idx').on(table.orderId, table.status),
    check(
      'merchant_orders_number_not_empty_check',
      sql`length(btrim(${table.merchantOrderNumber})) > 0`,
    ),
    check(
      'merchant_orders_nonnegative_amounts_check',
      sql`
        ${table.itemsSubtotalCentavos} >= 0
        and ${table.discountCentavos} >= 0
        and ${table.shippingCentavos} >= 0
        and ${table.taxCentavos} >= 0
        and ${table.grossTotalCentavos} >= 0
        and ${table.platformCommissionCentavos} >= 0
        and ${table.merchantEarningsCentavos} >= 0
        and ${table.refundedCentavos} >= 0
        and ${table.commissionReversedCentavos} >= 0
        and ${table.merchantRefundLiabilityCentavos} >= 0
        and ${table.netMerchantEarningsCentavos} >= 0
      `,
    ),
    check(
      'merchant_orders_total_check',
      sql`
        ${table.grossTotalCentavos}
        = ${table.itemsSubtotalCentavos}
          - ${table.discountCentavos}
          + ${table.shippingCentavos}
          + ${table.taxCentavos}
      `,
    ),
    check(
      'merchant_orders_discount_not_above_subtotal_check',
      sql`${table.discountCentavos} <= ${table.itemsSubtotalCentavos}`,
    ),
    check(
      'merchant_orders_earnings_check',
      sql`
        ${table.merchantEarningsCentavos}
        = ${table.grossTotalCentavos} - ${table.platformCommissionCentavos}
      `,
    ),
    check(
      'merchant_orders_refund_bounds_check',
      sql`
        ${table.refundedCentavos} <= ${table.grossTotalCentavos}
        and ${table.commissionReversedCentavos} <= ${table.platformCommissionCentavos}
        and ${table.merchantRefundLiabilityCentavos} <= ${table.merchantEarningsCentavos}
      `,
    ),
    check(
      'merchant_orders_net_earnings_check',
      sql`
        ${table.netMerchantEarningsCentavos}
        = ${table.merchantEarningsCentavos} - ${table.merchantRefundLiabilityCentavos}
      `,
    ),
    check(
      'merchant_orders_confirmed_at_check',
      sql`
        ${table.status} = 'PENDING'
        or ${table.confirmedAt} is not null
        or ${table.status} = 'CANCELLED'
      `,
    ),
    check(
      'merchant_orders_cancelled_at_check',
      sql`
        (${table.status} = 'CANCELLED' and ${table.cancelledAt} is not null)
        or (${table.status} <> 'CANCELLED' and ${table.cancelledAt} is null)
      `,
    ),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuidPrimaryKey(),
    orderId: uuid('order_id').notNull(),
    merchantOrderId: uuid('merchant_order_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    lineNumber: integer('line_number').notNull(),
    productId: uuid('product_id').notNull(),
    variantId: uuid('variant_id').notNull(),
    productNameSnapshot: varchar('product_name_snapshot', { length: 200 }).notNull(),
    variantNameSnapshot: varchar('variant_name_snapshot', { length: 150 }).notNull(),
    skuSnapshot: varchar('sku_snapshot', { length: 100 }).notNull(),
    optionValuesSnapshot: jsonb('option_values_snapshot')
      .$type<Record<string, string>>()
      .default({})
      .notNull(),
    imageStoragePathSnapshot: text('image_storage_path_snapshot'),
    imageUrlSnapshot: text('image_url_snapshot'),
    unitPriceCentavos: integer('unit_price_centavos').notNull(),
    quantity: integer('quantity').notNull(),
    lineSubtotalCentavos: integer('line_subtotal_centavos').notNull(),
    lineDiscountCentavos: integer('line_discount_centavos').default(0).notNull(),
    lineTaxCentavos: integer('line_tax_centavos').default(0).notNull(),
    lineTotalCentavos: integer('line_total_centavos').notNull(),
    platformCommissionCentavos: integer('platform_commission_centavos').default(0).notNull(),
    merchantEarningsCentavos: integer('merchant_earnings_centavos').notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    unique('order_items_id_merchant_unique').on(table.id, table.merchantId),
    unique('order_items_id_product_merchant_unique').on(
      table.id,
      table.productId,
      table.merchantId,
    ),
    unique('order_items_id_merchant_order_tenant_unique').on(
      table.id,
      table.merchantOrderId,
      table.merchantId,
    ),
    unique('order_items_merchant_order_line_unique').on(table.merchantOrderId, table.lineNumber),
    foreignKey({
      columns: [table.merchantOrderId, table.orderId, table.merchantId],
      foreignColumns: [merchantOrders.id, merchantOrders.orderId, merchantOrders.merchantId],
      name: 'order_items_merchant_order_tenant_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.productId, table.merchantId],
      foreignColumns: [products.id, products.merchantId],
      name: 'order_items_product_tenant_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.variantId, table.productId, table.merchantId],
      foreignColumns: [productVariants.id, productVariants.productId, productVariants.merchantId],
      name: 'order_items_variant_tenant_fk',
    }).onDelete('restrict'),
    index('order_items_order_merchant_idx').on(table.orderId, table.merchantId),
    index('order_items_product_created_at_idx').on(
      table.merchantId,
      table.productId,
      table.createdAt,
    ),
    index('order_items_variant_created_at_idx').on(
      table.merchantId,
      table.variantId,
      table.createdAt,
    ),
    check('order_items_line_number_check', sql`${table.lineNumber} > 0`),
    check('order_items_quantity_check', sql`${table.quantity} > 0`),
    check(
      'order_items_snapshot_text_check',
      sql`
        length(btrim(${table.productNameSnapshot})) > 0
        and length(btrim(${table.variantNameSnapshot})) > 0
        and length(btrim(${table.skuSnapshot})) > 0
      `,
    ),
    check(
      'order_items_nonnegative_amounts_check',
      sql`
        ${table.unitPriceCentavos} >= 0
        and ${table.lineSubtotalCentavos} >= 0
        and ${table.lineDiscountCentavos} >= 0
        and ${table.lineTaxCentavos} >= 0
        and ${table.lineTotalCentavos} >= 0
        and ${table.platformCommissionCentavos} >= 0
        and ${table.merchantEarningsCentavos} >= 0
      `,
    ),
    check(
      'order_items_subtotal_check',
      sql`${table.lineSubtotalCentavos} = ${table.unitPriceCentavos} * ${table.quantity}`,
    ),
    check(
      'order_items_discount_check',
      sql`${table.lineDiscountCentavos} <= ${table.lineSubtotalCentavos}`,
    ),
    check(
      'order_items_total_check',
      sql`
        ${table.lineTotalCentavos}
        = ${table.lineSubtotalCentavos}
          - ${table.lineDiscountCentavos}
          + ${table.lineTaxCentavos}
      `,
    ),
    check(
      'order_items_earnings_check',
      sql`
        ${table.merchantEarningsCentavos}
        = ${table.lineTotalCentavos} - ${table.platformCommissionCentavos}
      `,
    ),
    check(
      'order_items_options_object_check',
      sql`jsonb_typeof(${table.optionValuesSnapshot}) = 'object'`,
    ),
  ],
);

export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: uuidPrimaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    previousStatus: marketplaceOrderStatusEnum('previous_status'),
    newStatus: marketplaceOrderStatusEnum('new_status').notNull(),
    changedByUserId: uuid('changed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    note: text('note'),
    createdAt: eventTimestamp(),
  },
  (table) => [
    index('order_status_history_order_created_at_idx').on(table.orderId, table.createdAt),
    check(
      'order_status_history_changed_status_check',
      sql`${table.previousStatus} is null or ${table.previousStatus} <> ${table.newStatus}`,
    ),
  ],
);

export const merchantOrderStatusHistory = pgTable(
  'merchant_order_status_history',
  {
    id: uuidPrimaryKey(),
    merchantOrderId: uuid('merchant_order_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    previousStatus: merchantOrderStatusEnum('previous_status'),
    newStatus: merchantOrderStatusEnum('new_status').notNull(),
    changedByUserId: uuid('changed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    note: text('note'),
    createdAt: eventTimestamp(),
  },
  (table) => [
    foreignKey({
      columns: [table.merchantOrderId, table.merchantId],
      foreignColumns: [merchantOrders.id, merchantOrders.merchantId],
      name: 'merchant_order_status_history_order_tenant_fk',
    }).onDelete('restrict'),
    index('merchant_order_status_history_order_created_at_idx').on(
      table.merchantId,
      table.merchantOrderId,
      table.createdAt,
    ),
    index('merchant_order_status_history_queue_idx').on(
      table.merchantId,
      table.newStatus,
      table.createdAt,
    ),
    check(
      'merchant_order_status_history_changed_status_check',
      sql`${table.previousStatus} is null or ${table.previousStatus} <> ${table.newStatus}`,
    ),
  ],
);

export const fulfillments = pgTable(
  'fulfillments',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id').notNull(),
    merchantOrderId: uuid('merchant_order_id').notNull(),
    shipFromAddressId: uuid('ship_from_address_id'),
    status: fulfillmentStatusEnum('status').default('PENDING').notNull(),
    carrier: varchar('carrier', { length: 100 }),
    service: varchar('service', { length: 100 }),
    trackingNumber: varchar('tracking_number', { length: 150 }),
    note: text('note'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    shippedAt: timestamp('shipped_at', { mode: 'date', withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { mode: 'date', withTimezone: true }),
    ...auditTimestamps(),
  },
  (table) => [
    unique('fulfillments_id_merchant_order_tenant_unique').on(
      table.id,
      table.merchantOrderId,
      table.merchantId,
    ),
    foreignKey({
      columns: [table.merchantOrderId, table.merchantId],
      foreignColumns: [merchantOrders.id, merchantOrders.merchantId],
      name: 'fulfillments_merchant_order_tenant_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.shipFromAddressId, table.merchantId],
      foreignColumns: [merchantAddresses.id, merchantAddresses.merchantId],
      name: 'fulfillments_ship_from_address_tenant_fk',
    }).onDelete('restrict'),
    uniqueIndex('fulfillments_tracking_unique')
      .on(table.merchantId, table.carrier, table.trackingNumber)
      .where(sql`${table.carrier} is not null and ${table.trackingNumber} is not null`),
    index('fulfillments_merchant_status_updated_at_idx').on(
      table.merchantId,
      table.status,
      table.updatedAt,
    ),
    index('fulfillments_order_status_idx').on(table.merchantOrderId, table.status),
    check(
      'fulfillments_shipped_at_check',
      sql`
        ${table.status} not in ('SHIPPED', 'DELIVERED')
        or ${table.shippedAt} is not null
      `,
    ),
    check(
      'fulfillments_delivered_at_check',
      sql`${table.status} <> 'DELIVERED' or ${table.deliveredAt} is not null`,
    ),
    check(
      'fulfillments_delivery_order_check',
      sql`
        ${table.deliveredAt} is null
        or (${table.shippedAt} is not null and ${table.deliveredAt} >= ${table.shippedAt})
      `,
    ),
  ],
);

export const fulfillmentItems = pgTable(
  'fulfillment_items',
  {
    fulfillmentId: uuid('fulfillment_id').notNull(),
    merchantOrderId: uuid('merchant_order_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    orderItemId: uuid('order_item_id').notNull(),
    quantity: integer('quantity').notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.fulfillmentId, table.orderItemId],
      name: 'fulfillment_items_pk',
    }),
    foreignKey({
      columns: [table.fulfillmentId, table.merchantOrderId, table.merchantId],
      foreignColumns: [fulfillments.id, fulfillments.merchantOrderId, fulfillments.merchantId],
      name: 'fulfillment_items_fulfillment_tenant_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.orderItemId, table.merchantOrderId, table.merchantId],
      foreignColumns: [orderItems.id, orderItems.merchantOrderId, orderItems.merchantId],
      name: 'fulfillment_items_order_item_tenant_fk',
    }).onDelete('restrict'),
    index('fulfillment_items_order_item_idx').on(table.merchantId, table.orderItemId),
    check('fulfillment_items_quantity_check', sql`${table.quantity} > 0`),
  ],
);
