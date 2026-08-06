import { sql } from 'drizzle-orm';
import {
  char,
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

import { users } from '../identity/schema';
import { merchants } from '../merchants/schema';
import { merchantOrders, orderItems, orders } from '../orders/schema';
import { auditTimestamps, eventTimestamp, uuidPrimaryKey } from '../shared/columns';
import {
  merchantLedgerEntryTypeEnum,
  merchantPayoutStatusEnum,
  paymentAllocationStatusEnum,
  paymentMethodEnum,
  paymentStatusEnum,
  refundStatusEnum,
} from '../shared/enums';

export const payments = pgTable(
  'payments',
  {
    id: uuidPrimaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    method: paymentMethodEnum('method').notNull(),
    status: paymentStatusEnum('status').default('PENDING').notNull(),
    provider: varchar('provider', { length: 100 }),
    providerPaymentId: varchar('provider_payment_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 100 }).notNull(),
    amountCentavos: integer('amount_centavos').notNull(),
    currency: char('currency', { length: 3 }).default('PHP').notNull(),
    failureCode: varchar('failure_code', { length: 100 }),
    authorizedAt: timestamp('authorized_at', { mode: 'date', withTimezone: true }),
    paidAt: timestamp('paid_at', { mode: 'date', withTimezone: true }),
    ...auditTimestamps(),
  },
  (table) => [
    unique('payments_id_order_unique').on(table.id, table.orderId),
    unique('payments_idempotency_key_unique').on(table.idempotencyKey),
    uniqueIndex('payments_provider_payment_unique')
      .on(table.provider, table.providerPaymentId)
      .where(sql`${table.provider} is not null and ${table.providerPaymentId} is not null`),
    index('payments_order_created_at_idx').on(table.orderId, table.createdAt),
    index('payments_status_created_at_idx').on(table.status, table.createdAt),
    check(
      'payments_idempotency_key_not_empty_check',
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
    check('payments_amount_check', sql`${table.amountCentavos} > 0`),
    check('payments_currency_check', sql`${table.currency} = 'PHP'`),
    check(
      'payments_paid_at_check',
      sql`
        ${table.status} not in ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED')
        or ${table.paidAt} is not null
      `,
    ),
    check(
      'payments_authorized_at_check',
      sql`${table.status} <> 'AUTHORIZED' or ${table.authorizedAt} is not null`,
    ),
    check(
      'payments_online_provider_check',
      sql`
        ${table.method} <> 'ONLINE_PAYMENT'
        or ${table.status} not in ('AUTHORIZED', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED')
        or (${table.provider} is not null and ${table.providerPaymentId} is not null)
      `,
    ),
    check(
      'payments_provider_reference_pair_check',
      sql`
        (${table.provider} is null and ${table.providerPaymentId} is null)
        or (
          ${table.provider} is not null
          and length(btrim(${table.provider})) > 0
          and ${table.providerPaymentId} is not null
          and length(btrim(${table.providerPaymentId})) > 0
        )
      `,
    ),
  ],
);

export const paymentAllocations = pgTable(
  'payment_allocations',
  {
    id: uuidPrimaryKey(),
    paymentId: uuid('payment_id').notNull(),
    orderId: uuid('order_id').notNull(),
    merchantOrderId: uuid('merchant_order_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    status: paymentAllocationStatusEnum('status').default('PENDING').notNull(),
    grossAmountCentavos: integer('gross_amount_centavos').notNull(),
    platformCommissionCentavos: integer('platform_commission_centavos').notNull(),
    merchantAmountCentavos: integer('merchant_amount_centavos').notNull(),
    settledAt: timestamp('settled_at', { mode: 'date', withTimezone: true }),
    ...auditTimestamps(),
  },
  (table) => [
    unique('payment_allocations_id_merchant_unique').on(table.id, table.merchantId),
    unique('payment_allocations_payment_merchant_order_unique').on(
      table.paymentId,
      table.merchantOrderId,
    ),
    foreignKey({
      columns: [table.paymentId, table.orderId],
      foreignColumns: [payments.id, payments.orderId],
      name: 'payment_allocations_payment_order_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.merchantOrderId, table.orderId, table.merchantId],
      foreignColumns: [merchantOrders.id, merchantOrders.orderId, merchantOrders.merchantId],
      name: 'payment_allocations_merchant_order_tenant_fk',
    }).onDelete('restrict'),
    index('payment_allocations_merchant_status_created_at_idx').on(
      table.merchantId,
      table.status,
      table.createdAt,
    ),
    index('payment_allocations_order_idx').on(table.orderId, table.paymentId),
    check(
      'payment_allocations_amounts_check',
      sql`
        ${table.grossAmountCentavos} > 0
        and ${table.platformCommissionCentavos} >= 0
        and ${table.merchantAmountCentavos} >= 0
        and ${table.platformCommissionCentavos} + ${table.merchantAmountCentavos}
          = ${table.grossAmountCentavos}
      `,
    ),
    check(
      'payment_allocations_settled_at_check',
      sql`${table.status} <> 'SETTLED' or ${table.settledAt} is not null`,
    ),
  ],
);

export const refunds = pgTable(
  'refunds',
  {
    id: uuidPrimaryKey(),
    paymentId: uuid('payment_id').notNull(),
    orderId: uuid('order_id').notNull(),
    merchantOrderId: uuid('merchant_order_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    providerRefundId: varchar('provider_refund_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 100 }).notNull(),
    amountCentavos: integer('amount_centavos').notNull(),
    commissionReversalCentavos: integer('commission_reversal_centavos').default(0).notNull(),
    merchantLiabilityCentavos: integer('merchant_liability_centavos').default(0).notNull(),
    reason: text('reason').notNull(),
    status: refundStatusEnum('status').default('PENDING').notNull(),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    processedAt: timestamp('processed_at', { mode: 'date', withTimezone: true }),
    ...auditTimestamps(),
  },
  (table) => [
    unique('refunds_id_merchant_unique').on(table.id, table.merchantId),
    unique('refunds_id_merchant_order_tenant_unique').on(
      table.id,
      table.merchantOrderId,
      table.merchantId,
    ),
    unique('refunds_idempotency_key_unique').on(table.idempotencyKey),
    uniqueIndex('refunds_provider_refund_unique')
      .on(table.providerRefundId)
      .where(sql`${table.providerRefundId} is not null`),
    foreignKey({
      columns: [table.paymentId, table.orderId],
      foreignColumns: [payments.id, payments.orderId],
      name: 'refunds_payment_order_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.merchantOrderId, table.orderId, table.merchantId],
      foreignColumns: [merchantOrders.id, merchantOrders.orderId, merchantOrders.merchantId],
      name: 'refunds_merchant_order_tenant_fk',
    }).onDelete('restrict'),
    index('refunds_payment_status_idx').on(table.paymentId, table.status),
    index('refunds_merchant_status_created_at_idx').on(
      table.merchantId,
      table.status,
      table.createdAt,
    ),
    check(
      'refunds_amount_breakdown_check',
      sql`
        ${table.amountCentavos} > 0
        and ${table.commissionReversalCentavos} >= 0
        and ${table.merchantLiabilityCentavos} >= 0
        and ${table.commissionReversalCentavos} + ${table.merchantLiabilityCentavos}
          = ${table.amountCentavos}
      `,
    ),
    check(
      'refunds_idempotency_key_not_empty_check',
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
    check(
      'refunds_provider_refund_id_not_empty_check',
      sql`
        ${table.providerRefundId} is null
        or length(btrim(${table.providerRefundId})) > 0
      `,
    ),
    check('refunds_reason_not_empty_check', sql`length(btrim(${table.reason})) > 0`),
    check(
      'refunds_processed_at_check',
      sql`${table.status} <> 'SUCCEEDED' or ${table.processedAt} is not null`,
    ),
  ],
);

export const refundItems = pgTable(
  'refund_items',
  {
    refundId: uuid('refund_id').notNull(),
    merchantOrderId: uuid('merchant_order_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    orderItemId: uuid('order_item_id').notNull(),
    quantity: integer('quantity').notNull(),
    amountCentavos: integer('amount_centavos').notNull(),
    commissionReversalCentavos: integer('commission_reversal_centavos').default(0).notNull(),
    merchantLiabilityCentavos: integer('merchant_liability_centavos').default(0).notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.refundId, table.orderItemId],
      name: 'refund_items_pk',
    }),
    foreignKey({
      columns: [table.refundId, table.merchantOrderId, table.merchantId],
      foreignColumns: [refunds.id, refunds.merchantOrderId, refunds.merchantId],
      name: 'refund_items_refund_tenant_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.orderItemId, table.merchantOrderId, table.merchantId],
      foreignColumns: [orderItems.id, orderItems.merchantOrderId, orderItems.merchantId],
      name: 'refund_items_order_item_tenant_fk',
    }).onDelete('restrict'),
    index('refund_items_order_item_idx').on(table.merchantId, table.orderItemId),
    check('refund_items_quantity_check', sql`${table.quantity} > 0`),
    check(
      'refund_items_amount_breakdown_check',
      sql`
        ${table.amountCentavos} > 0
        and ${table.commissionReversalCentavos} >= 0
        and ${table.merchantLiabilityCentavos} >= 0
        and ${table.commissionReversalCentavos} + ${table.merchantLiabilityCentavos}
          = ${table.amountCentavos}
      `,
    ),
  ],
);

export const merchantLedgerEntries = pgTable(
  'merchant_ledger_entries',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    merchantOrderId: uuid('merchant_order_id'),
    paymentAllocationId: uuid('payment_allocation_id'),
    refundId: uuid('refund_id'),
    entryType: merchantLedgerEntryTypeEnum('entry_type').notNull(),
    amountCentavos: integer('amount_centavos').notNull(),
    currency: char('currency', { length: 3 }).default('PHP').notNull(),
    availableAt: timestamp('available_at', { mode: 'date', withTimezone: true }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 150 }).notNull(),
    description: text('description'),
    createdAt: eventTimestamp(),
  },
  (table) => [
    unique('merchant_ledger_entries_id_merchant_unique').on(table.id, table.merchantId),
    unique('merchant_ledger_entries_idempotency_key_unique').on(table.idempotencyKey),
    foreignKey({
      columns: [table.merchantOrderId, table.merchantId],
      foreignColumns: [merchantOrders.id, merchantOrders.merchantId],
      name: 'merchant_ledger_entries_order_tenant_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.paymentAllocationId, table.merchantId],
      foreignColumns: [paymentAllocations.id, paymentAllocations.merchantId],
      name: 'merchant_ledger_entries_allocation_tenant_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.refundId, table.merchantId],
      foreignColumns: [refunds.id, refunds.merchantId],
      name: 'merchant_ledger_entries_refund_tenant_fk',
    }).onDelete('restrict'),
    index('merchant_ledger_entries_available_idx').on(
      table.merchantId,
      table.availableAt,
      table.createdAt,
    ),
    index('merchant_ledger_entries_order_idx').on(table.merchantId, table.merchantOrderId),
    check('merchant_ledger_entries_nonzero_amount_check', sql`${table.amountCentavos} <> 0`),
    check('merchant_ledger_entries_currency_check', sql`${table.currency} = 'PHP'`),
    check(
      'merchant_ledger_entries_reference_count_check',
      sql`
        num_nonnulls(
          ${table.merchantOrderId},
          ${table.paymentAllocationId},
          ${table.refundId}
        ) <= 1
      `,
    ),
    check(
      'merchant_ledger_entries_idempotency_key_not_empty_check',
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
  ],
);

export const merchantPayouts = pgTable(
  'merchant_payouts',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    status: merchantPayoutStatusEnum('status').default('PENDING').notNull(),
    amountCentavos: integer('amount_centavos').notNull(),
    currency: char('currency', { length: 3 }).default('PHP').notNull(),
    provider: varchar('provider', { length: 100 }),
    providerPayoutId: varchar('provider_payout_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 150 }).notNull(),
    periodStartsAt: timestamp('period_starts_at', { mode: 'date', withTimezone: true }),
    periodEndsAt: timestamp('period_ends_at', { mode: 'date', withTimezone: true }),
    processedAt: timestamp('processed_at', { mode: 'date', withTimezone: true }),
    failureReason: text('failure_reason'),
    ...auditTimestamps(),
  },
  (table) => [
    unique('merchant_payouts_id_merchant_unique').on(table.id, table.merchantId),
    unique('merchant_payouts_idempotency_key_unique').on(table.idempotencyKey),
    uniqueIndex('merchant_payouts_provider_reference_unique')
      .on(table.provider, table.providerPayoutId)
      .where(sql`${table.provider} is not null and ${table.providerPayoutId} is not null`),
    index('merchant_payouts_merchant_status_created_at_idx').on(
      table.merchantId,
      table.status,
      table.createdAt,
    ),
    check('merchant_payouts_amount_check', sql`${table.amountCentavos} > 0`),
    check('merchant_payouts_currency_check', sql`${table.currency} = 'PHP'`),
    check(
      'merchant_payouts_period_check',
      sql`
        ${table.periodStartsAt} is null
        or ${table.periodEndsAt} is null
        or ${table.periodEndsAt} > ${table.periodStartsAt}
      `,
    ),
    check(
      'merchant_payouts_provider_reference_pair_check',
      sql`
        (${table.provider} is null and ${table.providerPayoutId} is null)
        or (
          ${table.provider} is not null
          and length(btrim(${table.provider})) > 0
          and ${table.providerPayoutId} is not null
          and length(btrim(${table.providerPayoutId})) > 0
        )
      `,
    ),
    check(
      'merchant_payouts_processed_at_check',
      sql`${table.status} <> 'PAID' or ${table.processedAt} is not null`,
    ),
    check(
      'merchant_payouts_idempotency_key_not_empty_check',
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
  ],
);

export const merchantPayoutItems = pgTable(
  'merchant_payout_items',
  {
    payoutId: uuid('payout_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    ledgerEntryId: uuid('ledger_entry_id').notNull(),
    amountCentavos: integer('amount_centavos').notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.payoutId, table.ledgerEntryId],
      name: 'merchant_payout_items_pk',
    }),
    foreignKey({
      columns: [table.payoutId, table.merchantId],
      foreignColumns: [merchantPayouts.id, merchantPayouts.merchantId],
      name: 'merchant_payout_items_payout_tenant_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.ledgerEntryId, table.merchantId],
      foreignColumns: [merchantLedgerEntries.id, merchantLedgerEntries.merchantId],
      name: 'merchant_payout_items_ledger_tenant_fk',
    }).onDelete('restrict'),
    unique('merchant_payout_items_ledger_entry_unique').on(table.ledgerEntryId),
    index('merchant_payout_items_merchant_payout_idx').on(table.merchantId, table.payoutId),
    check('merchant_payout_items_amount_check', sql`${table.amountCentavos} > 0`),
  ],
);
