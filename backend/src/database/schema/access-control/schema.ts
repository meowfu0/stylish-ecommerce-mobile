import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from '../identity/schema';
import {
  auditTimestamps,
  eventTimestamp,
  softDeleteTimestamp,
  uuidPrimaryKey,
} from '../shared/columns';
import { roleScopeEnum } from '../shared/enums';

export const roles = pgTable(
  'roles',
  {
    id: uuidPrimaryKey(),
    key: varchar('key', { length: 100 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    scope: roleScopeEnum('scope').notNull(),
    description: text('description'),
    isSystem: boolean('is_system').default(true).notNull(),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    unique('roles_id_scope_unique').on(table.id, table.scope),
    uniqueIndex('roles_scope_key_lower_unique').on(table.scope, sql`lower(${table.key})`),
    index('roles_scope_active_name_idx')
      .on(table.scope, table.name)
      .where(sql`${table.deletedAt} is null`),
    check(
      'roles_key_name_not_empty_check',
      sql`length(btrim(${table.key})) > 0 and length(btrim(${table.name})) > 0`,
    ),
  ],
);

export const permissions = pgTable(
  'permissions',
  {
    id: uuidPrimaryKey(),
    key: varchar('key', { length: 150 }).notNull(),
    resource: varchar('resource', { length: 100 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    description: text('description'),
    ...auditTimestamps(),
  },
  (table) => [
    uniqueIndex('permissions_key_lower_unique').on(sql`lower(${table.key})`),
    unique('permissions_resource_action_unique').on(table.resource, table.action),
    check(
      'permissions_required_text_check',
      sql`
        length(btrim(${table.key})) > 0
        and length(btrim(${table.resource})) > 0
        and length(btrim(${table.action})) > 0
      `,
    ),
  ],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.roleId, table.permissionId],
      name: 'role_permissions_pk',
    }),
    index('role_permissions_permission_role_idx').on(table.permissionId, table.roleId),
  ],
);

export const userPlatformRoles = pgTable(
  'user_platform_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').notNull(),
    roleScope: roleScopeEnum('role_scope').default('PLATFORM').notNull(),
    assignedByUserId: uuid('assigned_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.roleId],
      name: 'user_platform_roles_pk',
    }),
    foreignKey({
      columns: [table.roleId, table.roleScope],
      foreignColumns: [roles.id, roles.scope],
      name: 'user_platform_roles_role_scope_fk',
    }).onDelete('cascade'),
    index('user_platform_roles_role_user_idx').on(table.roleId, table.userId),
    check('user_platform_roles_scope_check', sql`${table.roleScope} = 'PLATFORM'`),
  ],
);
