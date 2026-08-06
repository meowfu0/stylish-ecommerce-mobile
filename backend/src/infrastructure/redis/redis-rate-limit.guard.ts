import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../modules/auth/types/auth.types';
import { REDIS_RATE_LIMIT_METADATA } from './redis-rate-limit.decorator';
import type { RedisRateLimitOptions } from './redis-rate-limit.decorator';
import { RedisService } from './redis.service';

@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RedisRateLimitOptions>(
      REDIS_RATE_LIMIT_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const identity = request.auth?.userId ?? this.hash(request.ip || 'unknown');
    const result = await this.redisService.incrementRateLimit(
      `${options.name}:${identity}`,
      options.windowMs,
    );

    if (!result) {
      throw new ServiceUnavailableException({
        message: 'Request protection is temporarily unavailable',
        errors: [{ field: 'rateLimit', message: 'Request protection is unavailable' }],
      });
    }

    response.setHeader('RateLimit-Limit', options.limit);
    response.setHeader('RateLimit-Remaining', Math.max(options.limit - result.count, 0));
    response.setHeader('RateLimit-Reset', Math.ceil(result.resetInMs / 1000));

    if (result.count > options.limit) {
      response.setHeader('Retry-After', Math.max(Math.ceil(result.resetInMs / 1000), 1));
      throw new HttpException(
        {
          message: 'Too many requests',
          errors: [{ field: 'rateLimit', message: 'Retry after the rate-limit window' }],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex').slice(0, 24);
  }
}
