import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { auditLogs } from '../../../database/schema';
import type { RequestMetadata } from '../types/auth.types';

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async record(
    action: string,
    metadata: RequestMetadata,
    options: {
      actorUserId?: string;
      entityId?: string;
      outcome: 'SUCCESS' | 'DENIED' | 'FAILED';
      reason?: string;
    },
  ): Promise<void> {
    try {
      await this.databaseService.db.insert(auditLogs).values({
        action,
        entityType: 'AUTHENTICATION',
        entityId: options.entityId,
        actorUserId: options.actorUserId,
        requestId: metadata.requestId,
        correlationId: metadata.correlationId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: {
          outcome: options.outcome,
          ...(options.reason ? { reason: options.reason } : {}),
        },
      });
    } catch {
      this.logger.error({
        event: 'auth.audit.write_failed',
        action,
        requestId: metadata.requestId,
      });
    }
  }
}
