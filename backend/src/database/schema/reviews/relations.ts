import { relations } from 'drizzle-orm';

import { products } from '../catalog/schema';
import { users } from '../identity/schema';
import { orderItems } from '../orders/schema';
import { reviews } from './schema';

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
    relationName: 'review_author',
  }),
  product: one(products, {
    fields: [reviews.productId, reviews.merchantId],
    references: [products.id, products.merchantId],
  }),
  orderItem: one(orderItems, {
    fields: [reviews.orderItemId, reviews.merchantId],
    references: [orderItems.id, orderItems.merchantId],
  }),
  moderatedBy: one(users, {
    fields: [reviews.moderatedByUserId],
    references: [users.id],
    relationName: 'review_moderated_by',
  }),
}));
