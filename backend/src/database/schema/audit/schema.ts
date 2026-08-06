import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from '../identity/schema';
import { merchants } from '../merchants/schema';
import { uuidPrimaryKey } from '../shared/columns';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuidPrimaryKey(),
    merchantId: uuid('merchant_id').references(() => merchants.id, {
      onDelete: 'restrict',
    }),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 150 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id'),
    beforeData: jsonb('before_data').$type<Record<string, unknown>>(),
    afterData: jsonb('after_data').$type<Record<string, unknown>>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    requestId: varchar('request_id', { length: 150 }),
    correlationId: varchar('correlation_id', { length: 150 }),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    occurredAt: timestamp('occurred_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('audit_logs_merchant_occurred_at_idx').on(table.merchantId, table.occurredAt),
    index('audit_logs_actor_occurred_at_idx').on(table.actorUserId, table.occurredAt),
    index('audit_logs_entity_idx').on(table.entityType, table.entityId, table.occurredAt),
    index('audit_logs_correlation_idx')
      .on(table.correlationId)
      .where(sql`${table.correlationId} is not null`),
    check(
      'audit_logs_required_text_check',
      sql`
        length(btrim(${table.action})) > 0
        and length(btrim(${table.entityType})) > 0
      `,
    ),
    check(
      'audit_logs_json_shape_check',
      sql`
        (${table.beforeData} is null or jsonb_typeof(${table.beforeData}) = 'object')
        and (${table.afterData} is null or jsonb_typeof(${table.afterData}) = 'object')
        and jsonb_typeof(${table.metadata}) = 'object'
      `,
    ),
  ],
);
