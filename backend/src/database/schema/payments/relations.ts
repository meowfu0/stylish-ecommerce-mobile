import { relations } from 'drizzle-orm';

import { users } from '../identity/schema';
import { merchants } from '../merchants/schema';
import { merchantOrders, orderItems, orders } from '../orders/schema';
import {
  merchantLedgerEntries,
  merchantPayoutItems,
  merchantPayouts,
  paymentAllocations,
  payments,
  refundItems,
  refunds,
} from './schema';

export const paymentsRelations = relations(payments, ({ many, one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  allocations: many(paymentAllocations),
  refunds: many(refunds),
}));

export const paymentAllocationsRelations = relations(paymentAllocations, ({ many, one }) => ({
  payment: one(payments, {
    fields: [paymentAllocations.paymentId, paymentAllocations.orderId],
    references: [payments.id, payments.orderId],
  }),
  merchantOrder: one(merchantOrders, {
    fields: [
      paymentAllocations.merchantOrderId,
      paymentAllocations.orderId,
      paymentAllocations.merchantId,
    ],
    references: [merchantOrders.id, merchantOrders.orderId, merchantOrders.merchantId],
  }),
  ledgerEntries: many(merchantLedgerEntries),
}));

export const refundsRelations = relations(refunds, ({ many, one }) => ({
  payment: one(payments, {
    fields: [refunds.paymentId, refunds.orderId],
    references: [payments.id, payments.orderId],
  }),
  merchantOrder: one(merchantOrders, {
    fields: [refunds.merchantOrderId, refunds.orderId, refunds.merchantId],
    references: [merchantOrders.id, merchantOrders.orderId, merchantOrders.merchantId],
  }),
  requestedBy: one(users, {
    fields: [refunds.requestedByUserId],
    references: [users.id],
    relationName: 'refund_requested_by',
  }),
  items: many(refundItems),
  ledgerEntries: many(merchantLedgerEntries),
}));

export const refundItemsRelations = relations(refundItems, ({ one }) => ({
  refund: one(refunds, {
    fields: [refundItems.refundId, refundItems.merchantOrderId, refundItems.merchantId],
    references: [refunds.id, refunds.merchantOrderId, refunds.merchantId],
  }),
  orderItem: one(orderItems, {
    fields: [refundItems.orderItemId, refundItems.merchantOrderId, refundItems.merchantId],
    references: [orderItems.id, orderItems.merchantOrderId, orderItems.merchantId],
  }),
}));

export const merchantLedgerEntriesRelations = relations(merchantLedgerEntries, ({ many, one }) => ({
  merchant: one(merchants, {
    fields: [merchantLedgerEntries.merchantId],
    references: [merchants.id],
  }),
  merchantOrder: one(merchantOrders, {
    fields: [merchantLedgerEntries.merchantOrderId, merchantLedgerEntries.merchantId],
    references: [merchantOrders.id, merchantOrders.merchantId],
  }),
  paymentAllocation: one(paymentAllocations, {
    fields: [merchantLedgerEntries.paymentAllocationId, merchantLedgerEntries.merchantId],
    references: [paymentAllocations.id, paymentAllocations.merchantId],
  }),
  refund: one(refunds, {
    fields: [merchantLedgerEntries.refundId, merchantLedgerEntries.merchantId],
    references: [refunds.id, refunds.merchantId],
  }),
  payoutItems: many(merchantPayoutItems),
}));

export const merchantPayoutsRelations = relations(merchantPayouts, ({ many, one }) => ({
  merchant: one(merchants, {
    fields: [merchantPayouts.merchantId],
    references: [merchants.id],
  }),
  items: many(merchantPayoutItems),
}));

export const merchantPayoutItemsRelations = relations(merchantPayoutItems, ({ one }) => ({
  payout: one(merchantPayouts, {
    fields: [merchantPayoutItems.payoutId, merchantPayoutItems.merchantId],
    references: [merchantPayouts.id, merchantPayouts.merchantId],
  }),
  ledgerEntry: one(merchantLedgerEntries, {
    fields: [merchantPayoutItems.ledgerEntryId, merchantPayoutItems.merchantId],
    references: [merchantLedgerEntries.id, merchantLedgerEntries.merchantId],
  }),
}));
