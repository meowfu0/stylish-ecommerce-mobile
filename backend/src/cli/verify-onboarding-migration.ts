import 'dotenv/config';

import { Pool } from 'pg';

import { createDatabaseSslConfiguration } from '../database/database-ssl';

async function verifyOnboardingMigration(): Promise<void> {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    throw new Error('DATABASE_URL is missing');
  }

  const pool = new Pool({
    connectionString: rawUrl,
    connectionTimeoutMillis: 10_000,
    max: 1,
    query_timeout: 10_000,
    ssl: createDatabaseSslConfiguration(
      process.env.DATABASE_SSL !== 'false',
      process.env.DATABASE_SSL_CA_PATH,
    ),
  });

  try {
    const result = await pool.query<{
      checks: number;
      enumValue: boolean;
      indexes: number;
      migrationCount: number;
      onboardingPermissions: number;
      customerPermissionMappings: number;
      reviewNote: boolean;
      tableCount: number;
    }>(`
      select
        exists (
          select 1
          from pg_enum e
          join pg_type t on t.oid = e.enumtypid
          where t.typname = 'merchant_verification_status'
            and e.enumlabel = 'CHANGES_REQUESTED'
        ) as "enumValue",
        exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'merchant_verifications'
            and column_name = 'review_note'
        ) as "reviewNote",
        (
          select count(*)::integer
          from pg_indexes
          where schemaname = 'public'
            and indexname in (
              'merchant_verifications_pending_merchant_unique',
              'merchants_applicant_open_application_unique',
              'merchants_applicant_created_at_idx'
            )
        ) as "indexes",
        (
          select count(*)::integer
          from pg_constraint
          where conname in (
            'merchant_verifications_review_note_check',
            'merchant_verifications_review_fields_check'
          )
        ) as "checks",
        (select count(*)::integer from drizzle.__drizzle_migrations) as "migrationCount",
        (
          select count(*)::integer
          from permissions
          where key in (
            'account.merchant_application.create',
            'account.merchant_application.read',
            'account.merchant_application.update',
            'account.merchant_application.submit'
          )
        ) as "onboardingPermissions",
        (
          select count(*)::integer
          from role_permissions rp
          join roles r on r.id = rp.role_id and r.scope = 'PLATFORM' and r.key = 'customer'
          join permissions p on p.id = rp.permission_id
          where p.key in (
            'account.merchant_application.create',
            'account.merchant_application.read',
            'account.merchant_application.update',
            'account.merchant_application.submit'
          )
        ) as "customerPermissionMappings",
        (
          select count(*)::integer
          from information_schema.tables
          where table_schema = 'public' and table_type = 'BASE TABLE'
        ) as "tableCount"
    `);
    const verification = result.rows[0];
    const verified =
      verification?.enumValue === true &&
      verification.reviewNote === true &&
      verification.indexes === 3 &&
      verification.checks === 2 &&
      verification.migrationCount === 3 &&
      verification.onboardingPermissions === 4 &&
      verification.customerPermissionMappings === 4 &&
      verification.tableCount === 62;

    process.stdout.write(`${JSON.stringify({ verified, ...verification })}\n`);

    if (!verified) {
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

void verifyOnboardingMigration().catch(() => {
  process.stderr.write(
    `${JSON.stringify({ error: 'Onboarding migration verification failed' })}\n`,
  );
  process.exitCode = 1;
});
