import { relations } from 'drizzle-orm';

import { users } from '../identity/schema';
import { merchants } from '../merchants/schema';
import { auditLogs } from './schema';

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  merchant: one(merchants, {
    fields: [auditLogs.merchantId],
    references: [merchants.id],
  }),
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
    relationName: 'audit_actor',
  }),
}));
