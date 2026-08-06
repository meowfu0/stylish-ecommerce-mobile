import { pgEnum } from 'drizzle-orm/pg-core';

export const accountStatusEnum = pgEnum('account_status', [
  'PENDING_VERIFICATION',
  'ACTIVE',
  'DISABLED',
]);

export const authActionTokenPurposeEnum = pgEnum('auth_action_token_purpose', [
  'EMAIL_VERIFICATION',
  'PASSWORD_RESET',
]);

export const roleScopeEnum = pgEnum('role_scope', ['PLATFORM', 'MERCHANT']);

export const merchantStatusEnum = pgEnum('merchant_status', [
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'CLOSED',
]);

export const merchantVerificationStatusEnum = pgEnum('merchant_verification_status', [
  'UNVERIFIED',
  'PENDING',
  'CHANGES_REQUESTED',
  'VERIFIED',
  'REJECTED',
]);

export const merchantMembershipStatusEnum = pgEnum('merchant_membership_status', [
  'INVITED',
  'ACTIVE',
  'SUSPENDED',
  'REMOVED',
]);

export const merchantInvitationStatusEnum = pgEnum('merchant_invitation_status', [
  'PENDING',
  'ACCEPTED',
  'REVOKED',
  'EXPIRED',
]);

export const merchantAddressTypeEnum = pgEnum('merchant_address_type', [
  'REGISTERED',
  'BUSINESS',
  'RETURN',
]);

export const productStatusEnum = pgEnum('product_status', [
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
]);

export const productImageStatusEnum = pgEnum('product_image_status', ['PENDING', 'CONFIRMED']);

export const cartStatusEnum = pgEnum('cart_status', [
  'ACTIVE',
  'MERGED',
  'CONVERTED',
  'ABANDONED',
  'EXPIRED',
]);

export const inventoryReservationStatusEnum = pgEnum('inventory_reservation_status', [
  'ACTIVE',
  'CONVERTED',
  'RELEASED',
  'EXPIRED',
]);

export const inventoryMovementTypeEnum = pgEnum('inventory_movement_type', [
  'STOCK_IN',
  'STOCK_OUT',
  'ORDER',
  'CANCELLATION',
  'ADJUSTMENT',
  'RETURN',
  'RESERVATION_HOLD',
  'RESERVATION_RELEASE',
  'TRANSFER_IN',
  'TRANSFER_OUT',
]);

export const inventoryReferenceTypeEnum = pgEnum('inventory_reference_type', [
  'MANUAL',
  'ORDER',
  'RESERVATION',
  'REFUND',
  'TRANSFER',
]);

export const marketplaceOrderStatusEnum = pgEnum('marketplace_order_status', [
  'PENDING',
  'CONFIRMED',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
  'COMPLETED',
  'CANCELLED',
]);

export const merchantOrderStatusEnum = pgEnum('merchant_order_status', [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PARTIALLY_SHIPPED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

export const orderAddressTypeEnum = pgEnum('order_address_type', ['SHIPPING', 'BILLING']);

export const paymentMethodEnum = pgEnum('payment_method', ['CASH_ON_DELIVERY', 'ONLINE_PAYMENT']);

export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'CANCELLED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
]);

export const paymentAllocationStatusEnum = pgEnum('payment_allocation_status', [
  'PENDING',
  'ALLOCATED',
  'SETTLED',
  'REVERSED',
]);

export const refundStatusEnum = pgEnum('refund_status', [
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
]);

export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'PENDING',
  'PACKING',
  'SHIPPED',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
]);

export const discountTypeEnum = pgEnum('discount_type', [
  'FIXED_AMOUNT',
  'PERCENTAGE',
  'FREE_SHIPPING',
]);

export const discountApplicationMethodEnum = pgEnum('discount_application_method', [
  'CODE',
  'AUTOMATIC',
]);

export const discountRedemptionStatusEnum = pgEnum('discount_redemption_status', [
  'APPLIED',
  'REVERSED',
]);

export const reviewStatusEnum = pgEnum('review_status', ['PENDING', 'PUBLISHED', 'REJECTED']);

export const merchantLedgerEntryTypeEnum = pgEnum('merchant_ledger_entry_type', [
  'SALE',
  'COMMISSION',
  'REFUND',
  'COMMISSION_REVERSAL',
  'PAYOUT',
  'ADJUSTMENT',
]);

export const merchantPayoutStatusEnum = pgEnum('merchant_payout_status', [
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED',
]);

export const outboxStatusEnum = pgEnum('outbox_status', [
  'PENDING',
  'PROCESSING',
  'RETRY',
  'PROCESSED',
  'FAILED',
]);
