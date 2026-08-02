import { relations } from 'drizzle-orm';

import { productVariants, products } from '../catalog/schema';
import { users } from '../identity/schema';
import { inventoryReservations } from '../inventory/schema';
import { orders } from '../orders/schema';
import { cartItems, carts, wishlistItems } from './schema';

export const cartsRelations = relations(carts, ({ many, one }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  mergedInto: one(carts, {
    fields: [carts.mergedIntoCartId],
    references: [carts.id],
    relationName: 'cart_merge',
  }),
  mergedCarts: many(carts, { relationName: 'cart_merge' }),
  items: many(cartItems),
  reservations: many(inventoryReservations),
  sourceOrder: one(orders),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId, cartItems.productId, cartItems.merchantId],
    references: [productVariants.id, productVariants.productId, productVariants.merchantId],
  }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, {
    fields: [wishlistItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [wishlistItems.productId, wishlistItems.merchantId],
    references: [products.id, products.merchantId],
  }),
}));
