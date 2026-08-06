import { relations } from 'drizzle-orm';

import { cartItems, wishlistItems } from '../carts/schema';
import { inventoryBalances, inventoryReservations } from '../inventory/schema';
import { merchants } from '../merchants/schema';
import { orderItems } from '../orders/schema';
import {
  discountBrands,
  discountCategories,
  discountCollections,
  discountProducts,
} from '../promotions/schema';
import { reviews } from '../reviews/schema';
import {
  brands,
  categories,
  collectionProducts,
  collections,
  productCategories,
  productImages,
  productOptions,
  productOptionValues,
  productVariants,
  products,
  variantOptionValues,
} from './schema';

export const brandsRelations = relations(brands, ({ many, one }) => ({
  merchant: one(merchants, {
    fields: [brands.merchantId],
    references: [merchants.id],
  }),
  products: many(products),
  discountScopes: many(discountBrands),
}));

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'category_hierarchy',
  }),
  children: many(categories, { relationName: 'category_hierarchy' }),
  productAssignments: many(productCategories),
  discountScopes: many(discountCategories),
}));

export const collectionsRelations = relations(collections, ({ many, one }) => ({
  merchant: one(merchants, {
    fields: [collections.merchantId],
    references: [merchants.id],
  }),
  productAssignments: many(collectionProducts),
  discountScopes: many(discountCollections),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  merchant: one(merchants, {
    fields: [products.merchantId],
    references: [merchants.id],
  }),
  brand: one(brands, {
    fields: [products.brandId, products.merchantId],
    references: [brands.id, brands.merchantId],
  }),
  categoryAssignments: many(productCategories),
  collectionAssignments: many(collectionProducts),
  images: many(productImages),
  options: many(productOptions),
  variants: many(productVariants),
  wishlistItems: many(wishlistItems),
  orderItems: many(orderItems),
  discountScopes: many(discountProducts),
  reviews: many(reviews),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId, productCategories.merchantId],
    references: [products.id, products.merchantId],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const collectionProductsRelations = relations(collectionProducts, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionProducts.collectionId, collectionProducts.merchantId],
    references: [collections.id, collections.merchantId],
  }),
  product: one(products, {
    fields: [collectionProducts.productId, collectionProducts.merchantId],
    references: [products.id, products.merchantId],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId, productImages.merchantId],
    references: [products.id, products.merchantId],
  }),
}));

export const productOptionsRelations = relations(productOptions, ({ many, one }) => ({
  product: one(products, {
    fields: [productOptions.productId, productOptions.merchantId],
    references: [products.id, products.merchantId],
  }),
  values: many(productOptionValues),
}));

export const productOptionValuesRelations = relations(productOptionValues, ({ many, one }) => ({
  option: one(productOptions, {
    fields: [
      productOptionValues.optionId,
      productOptionValues.productId,
      productOptionValues.merchantId,
    ],
    references: [productOptions.id, productOptions.productId, productOptions.merchantId],
  }),
  variantAssignments: many(variantOptionValues),
}));

export const productVariantsRelations = relations(productVariants, ({ many, one }) => ({
  product: one(products, {
    fields: [productVariants.productId, productVariants.merchantId],
    references: [products.id, products.merchantId],
  }),
  optionValues: many(variantOptionValues),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  inventoryBalances: many(inventoryBalances),
  inventoryReservations: many(inventoryReservations),
}));

export const variantOptionValuesRelations = relations(variantOptionValues, ({ one }) => ({
  variant: one(productVariants, {
    fields: [
      variantOptionValues.variantId,
      variantOptionValues.productId,
      variantOptionValues.merchantId,
    ],
    references: [productVariants.id, productVariants.productId, productVariants.merchantId],
  }),
  optionValue: one(productOptionValues, {
    fields: [
      variantOptionValues.optionValueId,
      variantOptionValues.productId,
      variantOptionValues.optionId,
      variantOptionValues.merchantId,
    ],
    references: [
      productOptionValues.id,
      productOptionValues.productId,
      productOptionValues.optionId,
      productOptionValues.merchantId,
    ],
  }),
}));
