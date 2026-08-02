import { relations } from 'drizzle-orm';

import { merchants } from '../merchants/schema';
import { domainEvents, outboxMessages } from './schema';

export const domainEventsRelations = relations(domainEvents, ({ one }) => ({
  merchant: one(merchants, {
    fields: [domainEvents.merchantId],
    references: [merchants.id],
  }),
  outboxMessage: one(outboxMessages),
}));

export const outboxMessagesRelations = relations(outboxMessages, ({ one }) => ({
  domainEvent: one(domainEvents, {
    fields: [outboxMessages.domainEventId],
    references: [domainEvents.id],
  }),
}));
