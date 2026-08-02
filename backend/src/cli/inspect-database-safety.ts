import 'dotenv/config';

import { Pool } from 'pg';

import { createDatabaseSslConfiguration } from '../database/database-ssl';

type CountRow = {
  merchantVerifications: number;
  merchants: number;
  orders: number;
  products: number;
  users: number;
};

async function inspectDatabaseSafety(): Promise<void> {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    throw new Error('DATABASE_URL is missing');
  }

  const target = new URL(rawUrl);
  const database = decodeURIComponent(target.pathname.replace(/^\//, ''));
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isSupabase = target.hostname.includes('supabase');
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
    const counts = await pool.query<CountRow>(`
      select
        (select count(*)::integer from public.users) as "users",
        (select count(*)::integer from public.merchants) as "merchants",
        (select count(*)::integer from public.products) as "products",
        (select count(*)::integer from public.orders) as "orders",
        (select count(*)::integer from public.merchant_verifications) as "merchantVerifications"
    `);
    const migrations = await pool.query<{ createdAt: number; id: number }>(`
      select id, created_at as "createdAt"
      from drizzle.__drizzle_migrations
      order by id
    `);
    const tables = await pool.query<{ publicTables: number }>(`
      select count(*)::integer as "publicTables"
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
    `);
    const row = counts.rows[0];
    const containsBusinessData =
      !row ||
      row.merchants > 0 ||
      row.products > 0 ||
      row.orders > 0 ||
      row.merchantVerifications > 0;
    const safeForOnboardingMigration = isDevelopment && isSupabase && !containsBusinessData;

    process.stdout.write(
      `${JSON.stringify({
        counts: row,
        migrationHistory: migrations.rows,
        publicTables: tables.rows[0]?.publicTables,
        safeForOnboardingMigration,
        target: { database, host: target.hostname, supabase: isSupabase },
      })}\n`,
    );

    if (!safeForOnboardingMigration) {
      process.exitCode = 2;
    }
  } finally {
    await pool.end();
  }
}

void inspectDatabaseSafety().catch(() => {
  process.stderr.write(
    `${JSON.stringify({ error: 'Development database safety inspection failed' })}\n`,
  );
  process.exitCode = 1;
});
