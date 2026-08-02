import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { auditTimestamps, softDeleteTimestamp, uuidPrimaryKey } from '../shared/columns';
import { accountStatusEnum, authActionTokenPurposeEnum } from '../shared/enums';

export const users = pgTable(
  'users',
  {
    id: uuidPrimaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    status: accountStatusEnum('status').default('PENDING_VERIFICATION').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { mode: 'date', withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { mode: 'date', withTimezone: true }),
    statusChangedAt: timestamp('status_changed_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    authVersion: integer('auth_version').default(0).notNull(),
    passwordChangedAt: timestamp('password_changed_at', {
      mode: 'date',
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    uniqueIndex('users_email_lower_unique').on(sql`lower(${table.email})`),
    index('users_status_created_at_idx').on(table.status, table.createdAt),
    check(
      'users_email_normalized_check',
      sql`${table.email} = lower(btrim(${table.email})) and length(${table.email}) > 0`,
    ),
    check('users_password_hash_not_empty_check', sql`length(btrim(${table.passwordHash})) > 0`),
    check('users_auth_version_nonnegative_check', sql`${table.authVersion} >= 0`),
  ],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuidPrimaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp('revoked_at', { mode: 'date', withTimezone: true }),
    revokeReason: varchar('revoke_reason', { length: 100 }),
    deviceName: varchar('device_name', { length: 120 }),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    ...auditTimestamps(),
  },
  (table) => [
    unique('auth_sessions_id_user_unique').on(table.id, table.userId),
    index('auth_sessions_user_active_idx').on(table.userId, table.revokedAt, table.expiresAt),
    index('auth_sessions_expires_at_idx').on(table.expiresAt),
    check('auth_sessions_expiry_check', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'auth_sessions_revocation_check',
      sql`
        (${table.revokedAt} is null and ${table.revokeReason} is null)
        or (
          ${table.revokedAt} is not null
          and ${table.revokeReason} is not null
          and length(btrim(${table.revokeReason})) > 0
        )
      `,
    ),
  ],
);

export const authRefreshTokens = pgTable(
  'auth_refresh_tokens',
  {
    id: uuidPrimaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => authSessions.id, { onDelete: 'cascade' }),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    parentTokenId: uuid('parent_token_id').references((): AnyPgColumn => authRefreshTokens.id, {
      onDelete: 'set null',
    }),
    expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { mode: 'date', withTimezone: true }),
    revokedAt: timestamp('revoked_at', { mode: 'date', withTimezone: true }),
    revokeReason: varchar('revoke_reason', { length: 100 }),
    reuseDetectedAt: timestamp('reuse_detected_at', { mode: 'date', withTimezone: true }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('auth_refresh_tokens_token_hash_unique').on(table.tokenHash),
    uniqueIndex('auth_refresh_tokens_parent_unique')
      .on(table.parentTokenId)
      .where(sql`${table.parentTokenId} is not null`),
    index('auth_refresh_tokens_session_created_at_idx').on(table.sessionId, table.createdAt),
    index('auth_refresh_tokens_expires_at_idx').on(table.expiresAt),
    check('auth_refresh_tokens_hash_check', sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check('auth_refresh_tokens_expiry_check', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'auth_refresh_tokens_revocation_check',
      sql`
        (${table.revokedAt} is null and ${table.revokeReason} is null)
        or (
          ${table.revokedAt} is not null
          and ${table.revokeReason} is not null
          and length(btrim(${table.revokeReason})) > 0
        )
      `,
    ),
    check(
      'auth_refresh_tokens_reuse_check',
      sql`${table.reuseDetectedAt} is null or ${table.usedAt} is not null`,
    ),
  ],
);

export const authActionTokens = pgTable(
  'auth_action_tokens',
  {
    id: uuidPrimaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: authActionTokenPurposeEnum('purpose').notNull(),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    idempotencyKey: uuid('idempotency_key').defaultRandom().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { mode: 'date', withTimezone: true }),
    revokedAt: timestamp('revoked_at', { mode: 'date', withTimezone: true }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('auth_action_tokens_token_hash_unique').on(table.tokenHash),
    unique('auth_action_tokens_idempotency_key_unique').on(table.idempotencyKey),
    index('auth_action_tokens_user_purpose_created_at_idx').on(
      table.userId,
      table.purpose,
      table.createdAt,
    ),
    index('auth_action_tokens_expires_at_idx').on(table.expiresAt),
    check('auth_action_tokens_hash_check', sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check('auth_action_tokens_expiry_check', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'auth_action_tokens_terminal_state_check',
      sql`not (${table.consumedAt} is not null and ${table.revokedAt} is not null)`,
    ),
  ],
);

export const userProfiles = pgTable(
  'user_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: varchar('display_name', { length: 120 }),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    phone: varchar('phone', { length: 32 }),
    avatarStoragePath: text('avatar_storage_path'),
    ...auditTimestamps(),
  },
  (table) => [
    check(
      'user_profiles_display_name_not_empty_check',
      sql`${table.displayName} is null or length(btrim(${table.displayName})) > 0`,
    ),
    check(
      'user_profiles_first_name_not_empty_check',
      sql`${table.firstName} is null or length(btrim(${table.firstName})) > 0`,
    ),
    check(
      'user_profiles_last_name_not_empty_check',
      sql`${table.lastName} is null or length(btrim(${table.lastName})) > 0`,
    ),
    check(
      'user_profiles_phone_not_empty_check',
      sql`${table.phone} is null or length(btrim(${table.phone})) > 0`,
    ),
  ],
);

export const addresses = pgTable(
  'addresses',
  {
    id: uuidPrimaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 50 }).notNull(),
    recipientName: varchar('recipient_name', { length: 150 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    addressLine1: varchar('address_line_1', { length: 255 }).notNull(),
    addressLine2: varchar('address_line_2', { length: 255 }),
    barangay: varchar('barangay', { length: 150 }),
    city: varchar('city', { length: 150 }).notNull(),
    province: varchar('province', { length: 150 }).notNull(),
    postalCode: varchar('postal_code', { length: 20 }).notNull(),
    countryCode: char('country_code', { length: 2 }).default('PH').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    unique('addresses_id_user_unique').on(table.id, table.userId),
    uniqueIndex('addresses_one_active_default_per_user_unique')
      .on(table.userId)
      .where(sql`${table.isDefault} and ${table.deletedAt} is null`),
    index('addresses_user_active_updated_at_idx').on(
      table.userId,
      table.deletedAt,
      table.updatedAt,
    ),
    check(
      'addresses_required_text_check',
      sql`
        length(btrim(${table.label})) > 0
        and length(btrim(${table.recipientName})) > 0
        and length(btrim(${table.phone})) > 0
        and length(btrim(${table.addressLine1})) > 0
        and length(btrim(${table.city})) > 0
        and length(btrim(${table.province})) > 0
        and length(btrim(${table.postalCode})) > 0
      `,
    ),
    check('addresses_country_code_check', sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
  ],
);
