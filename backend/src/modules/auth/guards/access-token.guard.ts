import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';

import { IS_PUBLIC_METADATA } from '../constants/auth.constants';
import { AuthService } from '../services/auth.service';
import type { AuthenticatedRequest } from '../types/auth.types';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly logger = new Logger(AccessTokenGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const authorization = request.header('authorization');

    if (!authorization) {
      this.logRejection(request, response, 'MISSING_AUTHORIZATION_HEADER');
      throw this.unauthorized();
    }

    const match = authorization?.match(/^Bearer ([^\s]+)$/);

    if (!match?.[1]) {
      this.logRejection(request, response, 'MALFORMED_BEARER_AUTHORIZATION');
      throw this.unauthorized();
    }

    try {
      request.auth = await this.authService.validateAccessToken(match[1]);
      return true;
    } catch (error) {
      this.logRejection(request, response, this.rejectionReason(error));
      throw this.unauthorized();
    }
  }

  private rejectionReason(error: unknown): string {
    if (error instanceof UnauthorizedException) {
      return 'ACCESS_TOKEN_SESSION_REJECTED';
    }

    if (typeof error === 'object' && error !== null) {
      const errorName: unknown = (error as { name?: unknown }).name;

      if (errorName === 'TokenExpiredError') {
        return 'ACCESS_TOKEN_EXPIRED';
      }

      if (errorName === 'JsonWebTokenError' || errorName === 'NotBeforeError') {
        return 'ACCESS_TOKEN_INVALID';
      }
    }

    return 'ACCESS_TOKEN_REJECTED';
  }

  private logRejection(request: AuthenticatedRequest, response: Response, reason: string): void {
    const requestId = response.getHeader('x-request-id');

    this.logger.warn({
      event: 'auth.access_token.rejected',
      method: request.method,
      path: request.path,
      reason,
      requestId: typeof requestId === 'string' ? requestId : undefined,
    });
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'Authentication is required',
      errors: [{ field: 'authorization', message: 'A valid access token is required' }],
    });
  }
}
