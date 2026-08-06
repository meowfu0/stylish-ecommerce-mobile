import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  connectionTimeoutMs: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 5000),
  idleTimeoutMs: Number(process.env.DATABASE_IDLE_TIMEOUT_MS ?? 10000),
  maxConnections: Number(process.env.DATABASE_MAX_CONNECTIONS ?? 10),
  queryTimeoutMs: Number(process.env.DATABASE_QUERY_TIMEOUT_MS ?? 5000),
  ssl: process.env.DATABASE_SSL !== 'false',
  sslCaPath: process.env.DATABASE_SSL_CA_PATH?.trim() || undefined,
  url: process.env.DATABASE_URL,
}));
