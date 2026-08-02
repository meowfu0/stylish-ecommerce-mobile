import { relations } from 'drizzle-orm';

import { users } from '../identity/schema';
import { merchantInvitationRoles, merchantMembershipRoles } from '../merchants/schema';
import { permissions, rolePermissions, roles, userPlatformRoles } from './schema';

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  platformAssignments: many(userPlatformRoles, {
    relationName: 'platform_assignment_role',
  }),
  merchantAssignments: many(merchantMembershipRoles, {
    relationName: 'merchant_assignment_role',
  }),
  invitationAssignments: many(merchantInvitationRoles, {
    relationName: 'merchant_invitation_assignment_role',
  }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userPlatformRolesRelations = relations(userPlatformRoles, ({ one }) => ({
  user: one(users, {
    fields: [userPlatformRoles.userId],
    references: [users.id],
    relationName: 'platform_role_user',
  }),
  role: one(roles, {
    fields: [userPlatformRoles.roleId, userPlatformRoles.roleScope],
    references: [roles.id, roles.scope],
    relationName: 'platform_assignment_role',
  }),
  assignedBy: one(users, {
    fields: [userPlatformRoles.assignedByUserId],
    references: [users.id],
    relationName: 'platform_role_assigned_by',
  }),
}));
