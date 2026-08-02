import { relations } from 'drizzle-orm';

import { carts } from '../carts/schema';
import { productVariants } from '../catalog/schema';
import { users } from '../identity/schema';
import { merchants } from '../merchants/schema';
import { merchantOrders } from '../orders/schema';
import {
  inventoryBalances,
  inventoryLocations,
  inventoryMovements,
  inventoryReservations,
} from './schema';

export const inventoryLocationsRelations = relations(inventoryLocations, ({ many, one }) => ({
  merchant: one(merchants, {
    fields: [inventoryLocations.merchantId],
    references: [merchants.id],
  }),
  balances: many(inventoryBalances),
  reservations: many(inventoryReservations),
}));

export const inventoryBalancesRelations = relations(inventoryBalances, ({ many, one }) => ({
  location: one(inventoryLocations, {
    fields: [inventoryBalances.locationId, inventoryBalances.merchantId],
    references: [inventoryLocations.id, inventoryLocations.merchantId],
  }),
  variant: one(productVariants, {
    fields: [inventoryBalances.variantId, inventoryBalances.merchantId],
    references: [productVariants.id, productVariants.merchantId],
  }),
  movements: many(inventoryMovements),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  balance: one(inventoryBalances, {
    fields: [
      inventoryMovements.merchantId,
      inventoryMovements.locationId,
      inventoryMovements.variantId,
    ],
    references: [
      inventoryBalances.merchantId,
      inventoryBalances.locationId,
      inventoryBalances.variantId,
    ],
  }),
  createdBy: one(users, {
    fields: [inventoryMovements.createdByUserId],
    references: [users.id],
    relationName: 'inventory_movement_created_by',
  }),
}));

export const inventoryReservationsRelations = relations(inventoryReservations, ({ one }) => ({
  cart: one(carts, {
    fields: [inventoryReservations.cartId],
    references: [carts.id],
  }),
  location: one(inventoryLocations, {
    fields: [inventoryReservations.locationId, inventoryReservations.merchantId],
    references: [inventoryLocations.id, inventoryLocations.merchantId],
  }),
  variant: one(productVariants, {
    fields: [inventoryReservations.variantId, inventoryReservations.merchantId],
    references: [productVariants.id, productVariants.merchantId],
  }),
  merchantOrder: one(merchantOrders, {
    fields: [inventoryReservations.merchantOrderId, inventoryReservations.merchantId],
    references: [merchantOrders.id, merchantOrders.merchantId],
  }),
}));
