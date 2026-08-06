import { relations } from 'drizzle-orm';

import { userPlatformRoles } from '../access-control/schema';
import { auditLogs } from '../audit/schema';
import { wishlistItems } from '../carts/schema';
import { merchantMemberships } from '../merchants/schema';
import { orders } from '../orders/schema';
import { reviews } from '../reviews/schema';
import {
  addresses,
  authActionTokens,
  authRefreshTokens,
  authSessions,
  userProfiles,
  users,
} from './schema';

export const usersRelations = relations(users, ({ many, one }) => ({
  profile: one(userProfiles),
  addresses: many(addresses),
  platformRoles: many(userPlatformRoles, { relationName: 'platform_role_user' }),
  merchantMemberships: many(merchantMemberships, {
    relationName: 'merchant_membership_user',
  }),
  orders: many(orders),
  wishlistItems: many(wishlistItems),
  authoredReviews: many(reviews, { relationName: 'review_author' }),
  auditLogs: many(auditLogs, { relationName: 'audit_actor' }),
  authSessions: many(authSessions),
  authActionTokens: many(authActionTokens),
}));

export const authSessionsRelations = relations(authSessions, ({ many, one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
  refreshTokens: many(authRefreshTokens),
}));

export const authRefreshTokensRelations = relations(authRefreshTokens, ({ one }) => ({
  session: one(authSessions, {
    fields: [authRefreshTokens.sessionId],
    references: [authSessions.id],
  }),
  parent: one(authRefreshTokens, {
    fields: [authRefreshTokens.parentTokenId],
    references: [authRefreshTokens.id],
    relationName: 'refresh_token_rotation',
  }),
}));

export const authActionTokensRelations = relations(authActionTokens, ({ one }) => ({
  user: one(users, {
    fields: [authActionTokens.userId],
    references: [users.id],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const addressesRelations = relations(addresses, ({ many, one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
  sourceOrders: many(orders),
}));
