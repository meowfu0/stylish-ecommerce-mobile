import { relations } from 'drizzle-orm';

import { roles } from '../access-control/schema';
import { brands, collections, products } from '../catalog/schema';
import { users } from '../identity/schema';
import { inventoryLocations } from '../inventory/schema';
import { merchantOrders } from '../orders/schema';
import { merchantPayouts } from '../payments/schema';
import { discounts } from '../promotions/schema';
import {
  merchantAddresses,
  merchantInvitationRoles,
  merchantInvitations,
  merchantMembershipRoles,
  merchantMemberships,
  merchantProfiles,
  merchantStaffProfiles,
  merchantVerifications,
  merchants,
} from './schema';

export const merchantsRelations = relations(merchants, ({ many, one }) => ({
  profile: one(merchantProfiles),
  addresses: many(merchantAddresses),
  verifications: many(merchantVerifications),
  memberships: many(merchantMemberships),
  invitations: many(merchantInvitations),
  brands: many(brands),
  collections: many(collections),
  products: many(products),
  inventoryLocations: many(inventoryLocations),
  orders: many(merchantOrders),
  discounts: many(discounts),
  payouts: many(merchantPayouts),
}));

export const merchantProfilesRelations = relations(merchantProfiles, ({ one }) => ({
  merchant: one(merchants, {
    fields: [merchantProfiles.merchantId],
    references: [merchants.id],
  }),
}));

export const merchantAddressesRelations = relations(merchantAddresses, ({ one }) => ({
  merchant: one(merchants, {
    fields: [merchantAddresses.merchantId],
    references: [merchants.id],
  }),
}));

export const merchantVerificationsRelations = relations(merchantVerifications, ({ one }) => ({
  merchant: one(merchants, {
    fields: [merchantVerifications.merchantId],
    references: [merchants.id],
  }),
  submittedBy: one(users, {
    fields: [merchantVerifications.submittedByUserId],
    references: [users.id],
    relationName: 'merchant_verification_submitted_by',
  }),
  reviewedBy: one(users, {
    fields: [merchantVerifications.reviewedByUserId],
    references: [users.id],
    relationName: 'merchant_verification_reviewed_by',
  }),
}));

export const merchantMembershipsRelations = relations(merchantMemberships, ({ many, one }) => ({
  merchant: one(merchants, {
    fields: [merchantMemberships.merchantId],
    references: [merchants.id],
  }),
  user: one(users, {
    fields: [merchantMemberships.userId],
    references: [users.id],
    relationName: 'merchant_membership_user',
  }),
  invitedBy: one(users, {
    fields: [merchantMemberships.invitedByUserId],
    references: [users.id],
    relationName: 'merchant_membership_invited_by',
  }),
  roles: many(merchantMembershipRoles),
  staffProfile: one(merchantStaffProfiles),
}));

export const merchantMembershipRolesRelations = relations(merchantMembershipRoles, ({ one }) => ({
  membership: one(merchantMemberships, {
    fields: [merchantMembershipRoles.membershipId, merchantMembershipRoles.merchantId],
    references: [merchantMemberships.id, merchantMemberships.merchantId],
  }),
  role: one(roles, {
    fields: [merchantMembershipRoles.roleId, merchantMembershipRoles.roleScope],
    references: [roles.id, roles.scope],
    relationName: 'merchant_assignment_role',
  }),
  assignedBy: one(users, {
    fields: [merchantMembershipRoles.assignedByUserId],
    references: [users.id],
    relationName: 'merchant_membership_role_assigned_by',
  }),
}));

export const merchantInvitationsRelations = relations(merchantInvitations, ({ many, one }) => ({
  merchant: one(merchants, {
    fields: [merchantInvitations.merchantId],
    references: [merchants.id],
  }),
  invitedBy: one(users, {
    fields: [merchantInvitations.invitedByUserId],
    references: [users.id],
    relationName: 'merchant_invitation_invited_by',
  }),
  acceptedMembership: one(merchantMemberships, {
    fields: [merchantInvitations.acceptedByMembershipId, merchantInvitations.merchantId],
    references: [merchantMemberships.id, merchantMemberships.merchantId],
  }),
  roles: many(merchantInvitationRoles),
}));

export const merchantInvitationRolesRelations = relations(merchantInvitationRoles, ({ one }) => ({
  invitation: one(merchantInvitations, {
    fields: [merchantInvitationRoles.invitationId, merchantInvitationRoles.merchantId],
    references: [merchantInvitations.id, merchantInvitations.merchantId],
  }),
  role: one(roles, {
    fields: [merchantInvitationRoles.roleId, merchantInvitationRoles.roleScope],
    references: [roles.id, roles.scope],
    relationName: 'merchant_invitation_assignment_role',
  }),
}));

export const merchantStaffProfilesRelations = relations(merchantStaffProfiles, ({ one }) => ({
  membership: one(merchantMemberships, {
    fields: [merchantStaffProfiles.membershipId, merchantStaffProfiles.merchantId],
    references: [merchantMemberships.id, merchantMemberships.merchantId],
  }),
}));
