import { relations } from 'drizzle-orm';

import { brands, categories, collections, products } from '../catalog/schema';
import { users } from '../identity/schema';
import { merchants } from '../merchants/schema';
import { merchantOrders } from '../orders/schema';
import {
  discountBrands,
  discountCategories,
  discountCollections,
  discountProducts,
  discountRedemptions,
  discounts,
} from './schema';

export const discountsRelations = relations(discounts, ({ many, one }) => ({
  merchant: one(merchants, {
    fields: [discounts.merchantId],
    references: [merchants.id],
  }),
  products: many(discountProducts),
  categories: many(discountCategories),
  collections: many(discountCollections),
  brands: many(discountBrands),
  redemptions: many(discountRedemptions),
}));

export const discountProductsRelations = relations(discountProducts, ({ one }) => ({
  discount: one(discounts, {
    fields: [discountProducts.discountId, discountProducts.merchantId],
    references: [discounts.id, discounts.merchantId],
  }),
  product: one(products, {
    fields: [discountProducts.productId, discountProducts.merchantId],
    references: [products.id, products.merchantId],
  }),
}));

export const discountCategoriesRelations = relations(discountCategories, ({ one }) => ({
  discount: one(discounts, {
    fields: [discountCategories.discountId, discountCategories.merchantId],
    references: [discounts.id, discounts.merchantId],
  }),
  category: one(categories, {
    fields: [discountCategories.categoryId],
    references: [categories.id],
  }),
}));

export const discountCollectionsRelations = relations(discountCollections, ({ one }) => ({
  discount: one(discounts, {
    fields: [discountCollections.discountId, discountCollections.merchantId],
    references: [discounts.id, discounts.merchantId],
  }),
  collection: one(collections, {
    fields: [discountCollections.collectionId, discountCollections.merchantId],
    references: [collections.id, collections.merchantId],
  }),
}));

export const discountBrandsRelations = relations(discountBrands, ({ one }) => ({
  discount: one(discounts, {
    fields: [discountBrands.discountId, discountBrands.merchantId],
    references: [discounts.id, discounts.merchantId],
  }),
  brand: one(brands, {
    fields: [discountBrands.brandId, discountBrands.merchantId],
    references: [brands.id, brands.merchantId],
  }),
}));

export const discountRedemptionsRelations = relations(discountRedemptions, ({ one }) => ({
  discount: one(discounts, {
    fields: [discountRedemptions.discountId, discountRedemptions.merchantId],
    references: [discounts.id, discounts.merchantId],
  }),
  merchantOrder: one(merchantOrders, {
    fields: [discountRedemptions.merchantOrderId, discountRedemptions.merchantId],
    references: [merchantOrders.id, merchantOrders.merchantId],
  }),
  user: one(users, {
    fields: [discountRedemptions.userId],
    references: [users.id],
  }),
}));
