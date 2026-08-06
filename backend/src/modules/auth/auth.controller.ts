import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { ApiMessage } from '../../common/decorators/api-message.decorator';
import { AUTH_RATE_LIMITS } from './constants/auth.constants';
import { CurrentAuth } from './decorators/current-auth.decorator';
import { Public } from './decorators/public.decorator';
import {
  ActionTokenDto,
  EmailDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth-request.dto';
import {
  AuthenticatedDataDto,
  AuthenticatedSuccessResponseDto,
  MeDataDto,
  MeSuccessResponseDto,
  MessageAcceptedDataDto,
  MessageAcceptedSuccessResponseDto,
  RegistrationDataDto,
  RegistrationSuccessResponseDto,
} from './dto/auth-response.dto';
import { AuthService } from './services/auth.service';
import type { AuthPrincipal, RequestMetadata } from './types/auth.types';

const RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000);

const requestMetadata = (request: Request): RequestMetadata => ({
  requestId: request.header('x-request-id'),
  correlationId: request.header('x-correlation-id'),
  ipAddress: request.ip,
  userAgent: request.header('user-agent'),
});

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({
    default: { limit: AUTH_RATE_LIMITS.register, ttl: RATE_LIMIT_WINDOW_MS },
  })
  @ApiMessage('Registration successful; verify your email before logging in')
  @ApiOperation({ summary: 'Register a customer account' })
  @ApiCreatedResponse({ type: RegistrationSuccessResponseDto })
  @ApiConflictResponse({ description: 'An account cannot be created with this email.' })
  register(@Body() dto: RegisterDto, @Req() request: Request): Promise<RegistrationDataDto> {
    return this.authService.register(dto, requestMetadata(request));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: AUTH_RATE_LIMITS.login, ttl: RATE_LIMIT_WINDOW_MS },
  })
  @ApiMessage('Login successful')
  @ApiOperation({ summary: 'Log in with a verified email and password' })
  @ApiOkResponse({ type: AuthenticatedSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Credentials or account state are invalid.' })
  login(@Body() dto: LoginDto, @Req() request: Request): Promise<AuthenticatedDataDto> {
    return this.authService.login(dto, requestMetadata(request));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: AUTH_RATE_LIMITS.refresh, ttl: RATE_LIMIT_WINDOW_MS },
  })
  @ApiMessage('Tokens refreshed successfully')
  @ApiOperation({ summary: 'Rotate a refresh token and issue a new token pair' })
  @ApiOkResponse({ type: AuthenticatedSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token is invalid, expired, or reused.' })
  refresh(@Body() dto: RefreshDto, @Req() request: Request): Promise<AuthenticatedDataDto> {
    return this.authService.refresh(dto, requestMetadata(request));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Throttle({
    default: { limit: AUTH_RATE_LIMITS.logout, ttl: RATE_LIMIT_WINDOW_MS },
  })
  @ApiMessage('Logout successful')
  @ApiOperation({ summary: 'Revoke the current authenticated session' })
  @ApiOkResponse({ type: MessageAcceptedSuccessResponseDto })
  logout(
    @CurrentAuth() principal: AuthPrincipal,
    @Req() request: Request,
  ): Promise<MessageAcceptedDataDto> {
    return this.authService.logout(principal, requestMetadata(request));
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Throttle({
    default: { limit: AUTH_RATE_LIMITS.logout, ttl: RATE_LIMIT_WINDOW_MS },
  })
  @ApiMessage('All sessions logged out successfully')
  @ApiOperation({ summary: 'Revoke every active session for the authenticated user' })
  @ApiOkResponse({ type: MessageAcceptedSuccessResponseDto })
  logoutAll(
    @CurrentAuth() principal: AuthPrincipal,
    @Req() request: Request,
  ): Promise<MessageAcceptedDataDto> {
    return this.authService.logoutAll(principal, requestMetadata(request));
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiMessage('Authenticated user retrieved')
  @ApiOperation({ summary: 'Get the authenticated user and access memberships' })
  @ApiOkResponse({ type: MeSuccessResponseDto })
  getMe(@CurrentAuth() principal: AuthPrincipal): Promise<MeDataDto> {
    return this.authService.getMe(principal.userId);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: AUTH_RATE_LIMITS.actionToken, ttl: RATE_LIMIT_WINDOW_MS },
  })
  @ApiMessage('Email verified successfully')
  @ApiOperation({ summary: 'Consume a one-time email-verification token' })
  @ApiOkResponse({ type: MessageAcceptedSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token is invalid, expired, revoked, or consumed.' })
  verifyEmail(
    @Body() dto: ActionTokenDto,
    @Req() request: Request,
  ): Promise<MessageAcceptedDataDto> {
    return this.authService.verifyEmail(dto, requestMetadata(request));
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({
    default: { limit: AUTH_RATE_LIMITS.actionToken, ttl: RATE_LIMIT_WINDOW_MS },
  })
  @ApiMessage('If the account is eligible, a verification email will be sent')
  @ApiOperation({ summary: 'Request a replacement verification token' })
  @ApiResponse({ status: HttpStatus.ACCEPTED, type: MessageAcceptedSuccessResponseDto })
  resendVerification(
    @Body() dto: EmailDto,
    @Req() request: Request,
  ): Promise<MessageAcceptedDataDto> {
    return this.authService.resendVerification(dto, requestMetadata(request));
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({
    default: { limit: AUTH_RATE_LIMITS.actionToken, ttl: RATE_LIMIT_WINDOW_MS },
  })
  @ApiMessage('If the account is eligible, a password-reset email will be sent')
  @ApiOperation({ summary: 'Request a one-time password-reset token' })
  @ApiResponse({ status: HttpStatus.ACCEPTED, type: MessageAcceptedSuccessResponseDto })
  forgotPassword(@Body() dto: EmailDto, @Req() request: Request): Promise<MessageAcceptedDataDto> {
    return this.authService.forgotPassword(dto, requestMetadata(request));
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: AUTH_RATE_LIMITS.actionToken, ttl: RATE_LIMIT_WINDOW_MS },
  })
  @ApiMessage('Password reset successful; all sessions were revoked')
  @ApiOperation({ summary: 'Consume a reset token and replace the account password' })
  @ApiOkResponse({ type: MessageAcceptedSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token is invalid, expired, revoked, or consumed.' })
  resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() request: Request,
  ): Promise<MessageAcceptedDataDto> {
    return this.authService.resetPassword(dto, requestMetadata(request));
  }
}
