import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { roles } from '../access-control/schema';
import { users } from '../identity/schema';
import {
  auditTimestamps,
  eventTimestamp,
  softDeleteTimestamp,
  uuidPrimaryKey,
} from '../shared/columns';
import {
  merchantAddressTypeEnum,
  merchantInvitationStatusEnum,
  merchantMembershipStatusEnum,
  merchantStatusEnum,
  merchantVerificationStatusEnum,
  roleScopeEnum,
} from '../shared/enums';

export const merchants = pgTable(
  'merchants',
  {
    id: uuidPrimaryKey(),
    slug: varchar('slug', { length: 180 }).notNull(),
    legalName: varchar('legal_name', { length: 200 }).notNull(),
    displayName: varchar('display_name', { length: 200 }).notNull(),
    status: merchantStatusEnum('status').default('PENDING').notNull(),
    verificationStatus: merchantVerificationStatusEnum('verification_status')
      .default('UNVERIFIED')
      .notNull(),
    currency: char('currency', { length: 3 }).default('PHP').notNull(),
    commissionRateBasisPoints: smallint('commission_rate_basis_points').default(0).notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    deletedByUserId: uuid('deleted_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    unique('merchants_slug_unique').on(table.slug),
    index('merchants_status_verification_created_at_idx').on(
      table.status,
      table.verificationStatus,
      table.createdAt,
    ),
    uniqueIndex('merchants_applicant_open_application_unique')
      .on(table.createdByUserId)
      .where(
        sql`
          ${table.createdByUserId} is not null
          and ${table.deletedAt} is null
          and ${table.status} = 'PENDING'
          and ${table.verificationStatus} not in ('VERIFIED', 'REJECTED')
        `,
      ),
    index('merchants_applicant_created_at_idx')
      .on(table.createdByUserId, table.createdAt.desc())
      .where(sql`${table.createdByUserId} is not null and ${table.deletedAt} is null`),
    check(
      'merchants_required_text_check',
      sql`
        length(btrim(${table.slug})) > 0
        and length(btrim(${table.legalName})) > 0
        and length(btrim(${table.displayName})) > 0
      `,
    ),
    check('merchants_currency_check', sql`${table.currency} = 'PHP'`),
    check(
      'merchants_commission_rate_check',
      sql`${table.commissionRateBasisPoints} between 0 and 10000`,
    ),
  ],
);

export const merchantProfiles = pgTable(
  'merchant_profiles',
  {
    merchantId: uuid('merchant_id')
      .primaryKey()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    description: text('description'),
    supportEmail: varchar('support_email', { length: 320 }),
    supportPhone: varchar('support_phone', { length: 32 }),
    websiteUrl: text('website_url'),
    logoStoragePath: text('logo_storage_path'),
    bannerStoragePath: text('banner_storage_path'),
    ...auditTimestamps(),
  },
  (table) => [
    check(
      'merchant_profiles_support_email_normalized_check',
      sql`
        ${table.supportEmail} is null
        or (
          ${table.supportEmail} = lower(btrim(${table.supportEmail}))
          and length(${table.supportEmail}) > 0
        )
      `,
    ),
  ],
);

export const merchantAddresses = pgTable(
  'merchant_addresses',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    addressType: merchantAddressTypeEnum('address_type').notNull(),
    contactName: varchar('contact_name', { length: 150 }).notNull(),
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
    unique('merchant_addresses_id_merchant_unique').on(table.id, table.merchantId),
    uniqueIndex('merchant_addresses_default_type_unique')
      .on(table.merchantId, table.addressType)
      .where(sql`${table.isDefault} and ${table.deletedAt} is null`),
    index('merchant_addresses_merchant_type_active_idx').on(
      table.merchantId,
      table.addressType,
      table.deletedAt,
    ),
    check(
      'merchant_addresses_required_text_check',
      sql`
        length(btrim(${table.contactName})) > 0
        and length(btrim(${table.phone})) > 0
        and length(btrim(${table.addressLine1})) > 0
        and length(btrim(${table.city})) > 0
        and length(btrim(${table.province})) > 0
        and length(btrim(${table.postalCode})) > 0
      `,
    ),
    check('merchant_addresses_country_code_check', sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
  ],
);

export const merchantVerifications = pgTable(
  'merchant_verifications',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    status: merchantVerificationStatusEnum('status').default('PENDING').notNull(),
    documentReferences: jsonb('document_references').$type<string[]>().default([]).notNull(),
    submittedByUserId: uuid('submitted_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    submittedAt: timestamp('submitted_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp('reviewed_at', { mode: 'date', withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    reviewNote: text('review_note'),
    ...auditTimestamps(),
  },
  (table) => [
    uniqueIndex('merchant_verifications_pending_merchant_unique')
      .on(table.merchantId)
      .where(sql`${table.status} = 'PENDING'`),
    index('merchant_verifications_merchant_submitted_at_idx').on(
      table.merchantId,
      table.submittedAt,
    ),
    index('merchant_verifications_status_submitted_at_idx').on(table.status, table.submittedAt),
    check(
      'merchant_verifications_documents_array_check',
      sql`jsonb_typeof(${table.documentReferences}) = 'array'`,
    ),
    check(
      'merchant_verifications_review_fields_check',
      sql`
        (
          (
            ${table.status} in ('VERIFIED', 'REJECTED')
            or ${table.status}::text = 'CHANGES_REQUESTED'
          )
          and ${table.reviewedAt} is not null
          and ${table.reviewedByUserId} is not null
        )
        or ${table.status} in ('UNVERIFIED', 'PENDING')
      `,
    ),
    check(
      'merchant_verifications_rejection_reason_check',
      sql`
        ${table.status} <> 'REJECTED'
        or (
          ${table.rejectionReason} is not null
          and length(btrim(${table.rejectionReason})) > 0
        )
      `,
    ),
    check(
      'merchant_verifications_review_note_check',
      sql`
        ${table.status}::text <> 'CHANGES_REQUESTED'
        or (
          ${table.reviewNote} is not null
          and length(btrim(${table.reviewNote})) > 0
        )
      `,
    ),
  ],
);

export const merchantMemberships = pgTable(
  'merchant_memberships',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: merchantMembershipStatusEnum('status').default('INVITED').notNull(),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    joinedAt: timestamp('joined_at', { mode: 'date', withTimezone: true }),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    unique('merchant_memberships_id_merchant_unique').on(table.id, table.merchantId),
    unique('merchant_memberships_merchant_user_unique').on(table.merchantId, table.userId),
    index('merchant_memberships_user_status_idx').on(table.userId, table.status),
    index('merchant_memberships_merchant_status_idx').on(table.merchantId, table.status),
    check(
      'merchant_memberships_joined_at_check',
      sql`${table.status} <> 'ACTIVE' or ${table.joinedAt} is not null`,
    ),
  ],
);

export const merchantMembershipRoles = pgTable(
  'merchant_membership_roles',
  {
    membershipId: uuid('membership_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    roleId: uuid('role_id').notNull(),
    roleScope: roleScopeEnum('role_scope').default('MERCHANT').notNull(),
    assignedByUserId: uuid('assigned_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.membershipId, table.roleId],
      name: 'merchant_membership_roles_pk',
    }),
    foreignKey({
      columns: [table.membershipId, table.merchantId],
      foreignColumns: [merchantMemberships.id, merchantMemberships.merchantId],
      name: 'merchant_membership_roles_membership_tenant_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.roleId, table.roleScope],
      foreignColumns: [roles.id, roles.scope],
      name: 'merchant_membership_roles_role_scope_fk',
    }).onDelete('cascade'),
    index('merchant_membership_roles_role_membership_idx').on(table.roleId, table.membershipId),
    check('merchant_membership_roles_scope_check', sql`${table.roleScope} = 'MERCHANT'`),
  ],
);

export const merchantInvitations = pgTable(
  'merchant_invitations',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    email: varchar('email', { length: 320 }).notNull(),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    status: merchantInvitationStatusEnum('status').default('PENDING').notNull(),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    acceptedByMembershipId: uuid('accepted_by_membership_id'),
    expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { mode: 'date', withTimezone: true }),
    revokedAt: timestamp('revoked_at', { mode: 'date', withTimezone: true }),
    ...auditTimestamps(),
  },
  (table) => [
    unique('merchant_invitations_id_merchant_unique').on(table.id, table.merchantId),
    unique('merchant_invitations_token_hash_unique').on(table.tokenHash),
    uniqueIndex('merchant_invitations_pending_email_unique')
      .on(table.merchantId, sql`lower(${table.email})`)
      .where(sql`${table.status} = 'PENDING'`),
    foreignKey({
      columns: [table.acceptedByMembershipId, table.merchantId],
      foreignColumns: [merchantMemberships.id, merchantMemberships.merchantId],
      name: 'merchant_invitations_accepted_membership_tenant_fk',
    }).onDelete('restrict'),
    index('merchant_invitations_merchant_status_expires_at_idx').on(
      table.merchantId,
      table.status,
      table.expiresAt,
    ),
    check(
      'merchant_invitations_email_normalized_check',
      sql`${table.email} = lower(btrim(${table.email})) and length(${table.email}) > 0`,
    ),
    check('merchant_invitations_token_hash_check', sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check('merchant_invitations_expiry_check', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'merchant_invitations_acceptance_check',
      sql`
        (
          ${table.status} = 'ACCEPTED'
          and ${table.acceptedAt} is not null
          and ${table.acceptedByMembershipId} is not null
        )
        or (
          ${table.status} <> 'ACCEPTED'
          and ${table.acceptedAt} is null
          and ${table.acceptedByMembershipId} is null
        )
      `,
    ),
    check(
      'merchant_invitations_revocation_check',
      sql`
        (${table.status} = 'REVOKED' and ${table.revokedAt} is not null)
        or (${table.status} <> 'REVOKED' and ${table.revokedAt} is null)
      `,
    ),
  ],
);

export const merchantInvitationRoles = pgTable(
  'merchant_invitation_roles',
  {
    invitationId: uuid('invitation_id').notNull(),
    merchantId: uuid('merchant_id').notNull(),
    roleId: uuid('role_id').notNull(),
    roleScope: roleScopeEnum('role_scope').default('MERCHANT').notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    primaryKey({
      columns: [table.invitationId, table.roleId],
      name: 'merchant_invitation_roles_pk',
    }),
    foreignKey({
      columns: [table.invitationId, table.merchantId],
      foreignColumns: [merchantInvitations.id, merchantInvitations.merchantId],
      name: 'merchant_invitation_roles_invitation_tenant_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.roleId, table.roleScope],
      foreignColumns: [roles.id, roles.scope],
      name: 'merchant_invitation_roles_role_scope_fk',
    }).onDelete('cascade'),
    index('merchant_invitation_roles_role_invitation_idx').on(table.roleId, table.invitationId),
    check('merchant_invitation_roles_scope_check', sql`${table.roleScope} = 'MERCHANT'`),
  ],
);

export const merchantStaffProfiles = pgTable(
  'merchant_staff_profiles',
  {
    membershipId: uuid('membership_id').primaryKey(),
    merchantId: uuid('merchant_id').notNull(),
    employeeCode: varchar('employee_code', { length: 100 }),
    jobTitle: varchar('job_title', { length: 150 }),
    workPhone: varchar('work_phone', { length: 32 }),
    ...auditTimestamps(),
  },
  (table) => [
    foreignKey({
      columns: [table.membershipId, table.merchantId],
      foreignColumns: [merchantMemberships.id, merchantMemberships.merchantId],
      name: 'merchant_staff_profiles_membership_tenant_fk',
    }).onDelete('cascade'),
    uniqueIndex('merchant_staff_profiles_employee_code_unique')
      .on(table.merchantId, sql`lower(${table.employeeCode})`)
      .where(sql`${table.employeeCode} is not null`),
    index('merchant_staff_profiles_merchant_idx').on(table.merchantId),
    check(
      'merchant_staff_profiles_employee_code_not_empty_check',
      sql`${table.employeeCode} is null or length(btrim(${table.employeeCode})) > 0`,
    ),
  ],
);
