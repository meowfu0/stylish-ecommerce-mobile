import type { Request } from 'express';

import type { RequestMetadata } from '../auth/types/auth.types';

export const inventoryRequestMetadata = (request: Request): RequestMetadata => ({
  correlationId: request.header('x-correlation-id'),
  ipAddress: request.ip,
  requestId: request.header('x-request-id'),
  userAgent: request.header('user-agent'),
});
