import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_METADATA } from '../constants/auth.constants';
import { AuthService } from '../services/auth.service';
import type { AuthenticatedRequest } from '../types/auth.types';

@Injectable()
export class AccessTokenGuard implements CanActivate {
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
    const authorization = request.header('authorization');
    const match = authorization?.match(/^Bearer ([^\s]+)$/);

    if (!match?.[1]) {
      throw this.unauthorized();
    }

    try {
      request.auth = await this.authService.validateAccessToken(match[1]);
      return true;
    } catch {
      throw this.unauthorized();
    }
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'Authentication is required',
      errors: [{ field: 'authorization', message: 'A valid access token is required' }],
    });
  }
}
