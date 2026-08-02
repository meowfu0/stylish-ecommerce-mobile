import { Injectable, Logger } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

function resolveRequestId(request: Request): string {
  const incomingRequestId = request.header(REQUEST_ID_HEADER);
  return incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)
    ? incomingRequestId
    : randomUUID();
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestContextMiddleware.name);

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const requestId = resolveRequestId(request);

    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.once('finish', () => {
      this.logger.log({
        durationMs: Date.now() - startedAt,
        event: 'http.request.completed',
        method: request.method,
        path: request.path,
        requestId,
        statusCode: response.statusCode,
      });
    });

    next();
  }
}
