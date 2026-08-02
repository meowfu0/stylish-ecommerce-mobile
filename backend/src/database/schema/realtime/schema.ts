import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { merchants } from '../merchants/schema';
import { auditTimestamps, eventTimestamp, uuidPrimaryKey } from '../shared/columns';
import { outboxStatusEnum } from '../shared/enums';

export const domainEvents = pgTable(
  'domain_events',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id').references(() => merchants.id, {
      onDelete: 'restrict',
    }),
    aggregateType: varchar('aggregate_type', { length: 100 }).notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    eventType: varchar('event_type', { length: 150 }).notNull(),
    eventVersion: smallint('event_version').default(1).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 180 }).notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: eventTimestamp(),
  },
  (table) => [
    unique('domain_events_idempotency_key_unique').on(table.idempotencyKey),
    index('domain_events_aggregate_occurred_at_idx').on(
      table.aggregateType,
      table.aggregateId,
      table.occurredAt,
    ),
    index('domain_events_merchant_occurred_at_idx').on(table.merchantId, table.occurredAt),
    check(
      'domain_events_required_text_check',
      sql`
        length(btrim(${table.aggregateType})) > 0
        and length(btrim(${table.eventType})) > 0
        and length(btrim(${table.idempotencyKey})) > 0
      `,
    ),
    check('domain_events_version_check', sql`${table.eventVersion} > 0`),
    check('domain_events_payload_object_check', sql`jsonb_typeof(${table.payload}) = 'object'`),
  ],
);

export const outboxMessages = pgTable(
  'outbox_messages',
  {
    id: uuidPrimaryKey(),
    domainEventId: uuid('domain_event_id')
      .notNull()
      .references(() => domainEvents.id, { onDelete: 'restrict' }),
    topic: varchar('topic', { length: 150 }).notNull(),
    status: outboxStatusEnum('status').default('PENDING').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(10).notNull(),
    availableAt: timestamp('available_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    lockedAt: timestamp('locked_at', { mode: 'date', withTimezone: true }),
    lockedBy: varchar('locked_by', { length: 150 }),
    processedAt: timestamp('processed_at', { mode: 'date', withTimezone: true }),
    lastError: text('last_error'),
    idempotencyKey: varchar('idempotency_key', { length: 180 }).notNull(),
    ...auditTimestamps(),
  },
  (table) => [
    unique('outbox_messages_domain_event_unique').on(table.domainEventId),
    unique('outbox_messages_idempotency_key_unique').on(table.idempotencyKey),
    index('outbox_messages_processing_idx')
      .on(table.availableAt, table.createdAt)
      .where(
        sql`
          ${table.status} in ('PENDING', 'RETRY')
          and ${table.attempts} < ${table.maxAttempts}
        `,
      ),
    index('outbox_messages_stale_lock_idx')
      .on(table.lockedAt)
      .where(sql`${table.status} = 'PROCESSING'`),
    check('outbox_messages_topic_not_empty_check', sql`length(btrim(${table.topic})) > 0`),
    check(
      'outbox_messages_attempts_check',
      sql`
        ${table.attempts} >= 0
        and ${table.maxAttempts} > 0
        and ${table.attempts} <= ${table.maxAttempts}
      `,
    ),
    check(
      'outbox_messages_processing_lock_check',
      sql`
        ${table.status} <> 'PROCESSING'
        or (
          ${table.lockedAt} is not null
          and ${table.lockedBy} is not null
          and length(btrim(${table.lockedBy})) > 0
        )
      `,
    ),
    check(
      'outbox_messages_processed_at_check',
      sql`
        (${table.status} in ('PROCESSED', 'FAILED') and ${table.processedAt} is not null)
        or (${table.status} not in ('PROCESSED', 'FAILED') and ${table.processedAt} is null)
      `,
    ),
    check(
      'outbox_messages_idempotency_key_not_empty_check',
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
  ],
);
