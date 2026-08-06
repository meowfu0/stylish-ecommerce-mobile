import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { ApiMessage } from '../../common/decorators/api-message.decorator';
import { RedisRateLimit } from '../../infrastructure/redis/redis-rate-limit.decorator';
import { RedisRateLimitGuard } from '../../infrastructure/redis/redis-rate-limit.guard';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator';
import { RequirePlatformPermissions } from '../auth/decorators/permissions.decorator';
import type { AuthPrincipal } from '../auth/types/auth.types';
import {
  CreateMerchantApplicationDto,
  UpdateMerchantApplicationDto,
} from './dto/merchant-onboarding-request.dto';
import { MerchantApplicationSuccessResponseDto } from './dto/merchant-onboarding-response.dto';
import { merchantRequestMetadata } from './merchant-request-metadata';
import { MerchantOnboardingService } from './services/merchant-onboarding.service';
import type { MerchantApplicationView } from './types/merchant-onboarding.types';

const IDEMPOTENCY_HEADER = {
  description: 'Unique 8-128 character key for safely replaying this workflow request.',
  name: 'Idempotency-Key',
  required: true,
};

@ApiTags('Merchant Applications')
@ApiBearerAuth('access-token')
@UseGuards(RedisRateLimitGuard)
@Controller('merchants/applications')
export class MerchantApplicationsController {
  constructor(private readonly service: MerchantOnboardingService) {}

  @Post()
  @RequirePlatformPermissions('account.merchant_application.create')
  @RedisRateLimit({ limit: 5, name: 'merchant-application-create', windowMs: 60_000 })
  @ApiHeader(IDEMPOTENCY_HEADER)
  @ApiMessage('Merchant application draft created')
  @ApiOperation({ summary: 'Create an idempotent merchant application draft' })
  @ApiCreatedResponse({ type: MerchantApplicationSuccessResponseDto })
  @ApiConflictResponse({ description: 'An open application or requested slug conflicts.' })
  create(
    @CurrentAuth() principal: AuthPrincipal,
    @Body() dto: CreateMerchantApplicationDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ): Promise<MerchantApplicationView> {
    return this.service.createApplication(
      principal.userId,
      dto,
      idempotencyKey,
      merchantRequestMetadata(request),
    );
  }

  @Get('me')
  @RequirePlatformPermissions('account.merchant_application.read')
  @RedisRateLimit({ limit: 60, name: 'merchant-application-read-self', windowMs: 60_000 })
  @ApiMessage('Merchant application retrieved')
  @ApiOperation({ summary: 'Get the caller’s open or latest merchant application' })
  @ApiOkResponse({ type: MerchantApplicationSuccessResponseDto })
  getMine(@CurrentAuth() principal: AuthPrincipal): Promise<MerchantApplicationView> {
    return this.service.getMyApplication(principal.userId);
  }

  @Patch(':applicationId')
  @RequirePlatformPermissions('account.merchant_application.update')
  @RedisRateLimit({ limit: 30, name: 'merchant-application-update', windowMs: 60_000 })
  @ApiMessage('Merchant application draft updated')
  @ApiOperation({ summary: 'Update an owned draft or change-requested application' })
  @ApiOkResponse({ type: MerchantApplicationSuccessResponseDto })
  update(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('applicationId', new ParseUUIDPipe({ version: '4' })) applicationId: string,
    @Body() dto: UpdateMerchantApplicationDto,
    @Req() request: Request,
  ): Promise<MerchantApplicationView> {
    return this.service.updateApplication(
      principal.userId,
      applicationId,
      dto,
      merchantRequestMetadata(request),
    );
  }

  @Post(':applicationId/submit')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePlatformPermissions('account.merchant_application.submit')
  @RedisRateLimit({ limit: 10, name: 'merchant-application-submit', windowMs: 60_000 })
  @ApiHeader(IDEMPOTENCY_HEADER)
  @ApiMessage('Merchant application submitted for review')
  @ApiOperation({ summary: 'Submit a complete owned application for platform review' })
  @ApiAcceptedResponse({ type: MerchantApplicationSuccessResponseDto })
  submit(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('applicationId', new ParseUUIDPipe({ version: '4' })) applicationId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ): Promise<MerchantApplicationView> {
    return this.service.submitApplication(
      principal.userId,
      applicationId,
      idempotencyKey,
      merchantRequestMetadata(request),
    );
  }
}
