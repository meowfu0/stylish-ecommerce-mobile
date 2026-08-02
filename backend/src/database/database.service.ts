import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { createDatabaseSslConfiguration } from './database-ssl';
import * as schema from './schema/index';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;
  private poolClosed = false;

  readonly db: NodePgDatabase<typeof schema>;

  constructor(configService: ConfigService) {
    const useSsl = configService.getOrThrow<boolean>('database.ssl');
    const sslCaPath = configService.get<string>('database.sslCaPath');

    this.pool = new Pool({
      allowExitOnIdle: false,
      application_name: 'stylish-api',
      connectionString: configService.getOrThrow<string>('database.url'),
      connectionTimeoutMillis: configService.getOrThrow<number>('database.connectionTimeoutMs'),
      idleTimeoutMillis: configService.getOrThrow<number>('database.idleTimeoutMs'),
      max: configService.getOrThrow<number>('database.maxConnections'),
      query_timeout: configService.getOrThrow<number>('database.queryTimeoutMs'),
      ssl: createDatabaseSslConfiguration(useSsl, sslCaPath),
    });
    this.db = drizzle({ client: this.pool, schema });

    this.pool.on('error', () => {
      this.logger.error({
        event: 'database.pool.error',
        message: 'An unexpected PostgreSQL pool error occurred',
      });
    });
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.db.execute(sql`select 1`);
      return true;
    } catch {
      this.logger.warn({
        event: 'database.health.unavailable',
        message: 'PostgreSQL connectivity check failed',
      });
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.poolClosed) {
      return;
    }

    this.poolClosed = true;

    try {
      await this.pool.end();
    } catch {
      this.logger.error({
        event: 'database.pool.shutdown-failed',
        message: 'PostgreSQL pool did not close cleanly',
      });
    }
  }
}
