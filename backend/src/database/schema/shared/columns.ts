import { timestamp, uuid } from 'drizzle-orm/pg-core';
import type { PgTimestampBuilderInitial, PgUUIDBuilderInitial } from 'drizzle-orm/pg-core';

type UuidPrimaryKeyBuilder = ReturnType<
  ReturnType<PgUUIDBuilderInitial<'id'>['defaultRandom']>['primaryKey']
>;

type RequiredTimestamp<TName extends string> = ReturnType<
  ReturnType<PgTimestampBuilderInitial<TName>['defaultNow']>['notNull']
>;

export const uuidPrimaryKey = (): UuidPrimaryKeyBuilder => uuid('id').defaultRandom().primaryKey();

export const auditTimestamps = (): {
  createdAt: RequiredTimestamp<'created_at'>;
  updatedAt: RequiredTimestamp<'updated_at'>;
} => ({
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export const softDeleteTimestamp = (): PgTimestampBuilderInitial<'deleted_at'> =>
  timestamp('deleted_at', { mode: 'date', withTimezone: true });

export const eventTimestamp = (): RequiredTimestamp<'created_at'> =>
  timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull();
