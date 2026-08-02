import { relations } from 'drizzle-orm';

import { carts } from '../carts/schema';
import { productVariants, products } from '../catalog/schema';
import { addresses, users } from '../identity/schema';
import { inventoryReservations } from '../inventory/schema';
import { merchantAddresses, merchants } from '../merchants/schema';
import { paymentAllocations, payments, refundItems, refunds } from '../payments/schema';
import { discountRedemptions } from '../promotions/schema';
import { reviews } from '../reviews/schema';
import {
  fulfillmentItems,
  fulfillments,
  merchantOrderStatusHistory,
  merchantOrders,
  orderAddresses,
  orderItems,
  orderStatusHistory,
  orders,
} from './schema';

export const ordersRelations = relations(orders, ({ many, one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  sourceCart: one(carts, {
    fields: [orders.sourceCartId],
    references: [carts.id],
  }),
  sourceAddress: one(addresses, {
    fields: [orders.sourceAddressId],
    references: [addresses.id],
  }),
  merchantOrders: many(merchantOrders),
  addresses: many(orderAddresses),
  statusHistory: many(orderStatusHistory),
  payments: many(payments),
}));

export const orderAddressesRelations = relations(orderAddresses, ({ one }) => ({
  order: one(orders, {
    fields: [orderAddresses.orderId],
    references: [orders.id],
  }),
}));

export const merchantOrdersRelations = relations(merchantOrders, ({ many, one }) => ({
  order: one(orders, {
    fields: [merchantOrders.orderId],
    references: [orders.id],
  }),
  merchant: one(merchants, {
    fields: [merchantOrders.merchantId],
    references: [merchants.id],
  }),
  items: many(orderItems),
  statusHistory: many(merchantOrderStatusHistory),
  fulfillments: many(fulfillments),
  inventoryReservations: many(inventoryReservations),
  paymentAllocations: many(paymentAllocations),
  refunds: many(refunds),
  discountRedemption: one(discountRedemptions),
}));

export const orderItemsRelations = relations(orderItems, ({ many, one }) => ({
  merchantOrder: one(merchantOrders, {
    fields: [orderItems.merchantOrderId, orderItems.orderId, orderItems.merchantId],
    references: [merchantOrders.id, merchantOrders.orderId, merchantOrders.merchantId],
  }),
  product: one(products, {
    fields: [orderItems.productId, orderItems.merchantId],
    references: [products.id, products.merchantId],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId, orderItems.productId, orderItems.merchantId],
    references: [productVariants.id, productVariants.productId, productVariants.merchantId],
  }),
  fulfillmentItems: many(fulfillmentItems),
  refundItems: many(refundItems),
  review: one(reviews),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
  changedBy: one(users, {
    fields: [orderStatusHistory.changedByUserId],
    references: [users.id],
    relationName: 'marketplace_order_status_changed_by',
  }),
}));

export const merchantOrderStatusHistoryRelations = relations(
  merchantOrderStatusHistory,
  ({ one }) => ({
    merchantOrder: one(merchantOrders, {
      fields: [merchantOrderStatusHistory.merchantOrderId, merchantOrderStatusHistory.merchantId],
      references: [merchantOrders.id, merchantOrders.merchantId],
    }),
    changedBy: one(users, {
      fields: [merchantOrderStatusHistory.changedByUserId],
      references: [users.id],
      relationName: 'merchant_order_status_changed_by',
    }),
  }),
);

export const fulfillmentsRelations = relations(fulfillments, ({ many, one }) => ({
  merchantOrder: one(merchantOrders, {
    fields: [fulfillments.merchantOrderId, fulfillments.merchantId],
    references: [merchantOrders.id, merchantOrders.merchantId],
  }),
  shipFromAddress: one(merchantAddresses, {
    fields: [fulfillments.shipFromAddressId, fulfillments.merchantId],
    references: [merchantAddresses.id, merchantAddresses.merchantId],
  }),
  items: many(fulfillmentItems),
}));

export const fulfillmentItemsRelations = relations(fulfillmentItems, ({ one }) => ({
  fulfillment: one(fulfillments, {
    fields: [
      fulfillmentItems.fulfillmentId,
      fulfillmentItems.merchantOrderId,
      fulfillmentItems.merchantId,
    ],
    references: [fulfillments.id, fulfillments.merchantOrderId, fulfillments.merchantId],
  }),
  orderItem: one(orderItems, {
    fields: [
      fulfillmentItems.orderItemId,
      fulfillmentItems.merchantOrderId,
      fulfillmentItems.merchantId,
    ],
    references: [orderItems.id, orderItems.merchantOrderId, orderItems.merchantId],
  }),
}));
