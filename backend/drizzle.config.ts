import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

import { createDatabaseSslConfiguration } from './src/database/database-ssl';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run Drizzle commands.');
}

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/database/schema/index.ts',
  dbCredentials: {
    url: databaseUrl,
    ssl: createDatabaseSslConfiguration(
      process.env.DATABASE_SSL !== 'false',
      process.env.DATABASE_SSL_CA_PATH,
    ),
  },
  strict: true,
  verbose: true,
});
