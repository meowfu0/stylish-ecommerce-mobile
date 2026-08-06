import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

import type { ApiErrorItem, ApiErrorResponse } from '../types/api-response.types';

type ExceptionPayload = {
  errors?: unknown;
  message?: unknown;
};

const INTERNAL_SERVER_ERROR_STATUS = 500;
const NOT_FOUND_STATUS = 404;
const SERVICE_UNAVAILABLE_STATUS = 503;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isExceptionPayload(value: unknown): value is ExceptionPayload {
  return isRecord(value);
}

function normalizeErrors(value: unknown): ApiErrorItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.field !== 'string' || typeof item.message !== 'string') {
      return [];
    }

    return [{ field: item.field, message: item.message }];
  });
}

function defaultMessageForStatus(statusCode: number): string {
  if (statusCode >= INTERNAL_SERVER_ERROR_STATUS) {
    return 'An unexpected error occurred';
  }

  if (statusCode === NOT_FOUND_STATUS) {
    return 'Resource not found';
  }

  return 'Request could not be completed';
}

function defaultErrorsForStatus(statusCode: number, message: string): ApiErrorItem[] {
  return [
    {
      field: statusCode >= INTERNAL_SERVER_ERROR_STATUS ? 'server' : 'request',
      message,
    },
  ];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : INTERNAL_SERVER_ERROR_STATUS;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const payload = isExceptionPayload(exceptionResponse) ? exceptionResponse : undefined;
    const payloadMessage = typeof payload?.message === 'string' ? payload.message : undefined;
    const message =
      statusCode >= INTERNAL_SERVER_ERROR_STATUS && statusCode !== SERVICE_UNAVAILABLE_STATUS
        ? defaultMessageForStatus(statusCode)
        : (payloadMessage ??
          (typeof exceptionResponse === 'string'
            ? exceptionResponse
            : defaultMessageForStatus(statusCode)));
    const normalizedErrors = normalizeErrors(payload?.errors);
    const errors =
      normalizedErrors.length > 0 ? normalizedErrors : defaultErrorsForStatus(statusCode, message);
    const requestId = response.getHeader('x-request-id');

    if (statusCode >= INTERNAL_SERVER_ERROR_STATUS) {
      this.logger.error({
        event: 'http.request.failed',
        method: request.method,
        path: request.path,
        requestId: typeof requestId === 'string' ? requestId : undefined,
        statusCode,
      });
    } else {
      this.logger.warn({
        event: 'http.request.rejected',
        method: request.method,
        path: request.path,
        requestId: typeof requestId === 'string' ? requestId : undefined,
        statusCode,
      });
    }

    const body: ApiErrorResponse = {
      success: false,
      message,
      errors,
    };

    response.status(statusCode).json(body);
  }
}
