import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ApiMessage } from '../../common/decorators/api-message.decorator';
import { RedisRateLimit } from '../../infrastructure/redis/redis-rate-limit.decorator';
import { RedisRateLimitGuard } from '../../infrastructure/redis/redis-rate-limit.guard';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator';
import { RequirePlatformPermissions } from '../auth/decorators/permissions.decorator';
import type { AuthPrincipal } from '../auth/types/auth.types';
import {
  ApproveMerchantApplicationDto,
  MerchantApplicationListQueryDto,
  ReviewMerchantApplicationDto,
} from './dto/merchant-onboarding-request.dto';
import {
  ApprovedMerchantSuccessResponseDto,
  MerchantApplicationDetailsSuccessResponseDto,
  MerchantApplicationListSuccessResponseDto,
  MerchantApplicationSuccessResponseDto,
} from './dto/merchant-onboarding-response.dto';
import { merchantRequestMetadata } from './merchant-request-metadata';
import { MerchantOnboardingService } from './services/merchant-onboarding.service';
import type {
  ApplicationListView,
  ApprovedMerchantView,
  MerchantApplicationDetailsView,
  MerchantApplicationView,
} from './types/merchant-onboarding.types';

const IDEMPOTENCY_HEADER = {
  description: 'Unique 8-128 character key for safely replaying this administrative decision.',
  name: 'Idempotency-Key',
  required: true,
};

@ApiTags('Platform Merchant Review')
@ApiBearerAuth('access-token')
@UseGuards(RedisRateLimitGuard)
@Controller('admin/merchant-applications')
export class AdminMerchantApplicationsController {
  constructor(private readonly service: MerchantOnboardingService) {}

  @Get()
  @RequirePlatformPermissions('platform.merchants.read')
  @RedisRateLimit({ limit: 120, name: 'admin-merchant-application-list', windowMs: 60_000 })
  @ApiMessage('Merchant applications retrieved')
  @ApiOperation({ summary: 'List merchant applications using cursor pagination' })
  @ApiOkResponse({ type: MerchantApplicationListSuccessResponseDto })
  list(@Query() query: MerchantApplicationListQueryDto): Promise<ApplicationListView> {
    return this.service.listApplications(query);
  }

  @Get(':applicationId')
  @RequirePlatformPermissions('platform.merchants.read')
  @RedisRateLimit({ limit: 120, name: 'admin-merchant-application-read', windowMs: 60_000 })
  @ApiMessage('Merchant application retrieved')
  @ApiOperation({ summary: 'Get a merchant application and latest review state' })
  @ApiOkResponse({ type: MerchantApplicationDetailsSuccessResponseDto })
  get(
    @Param('applicationId', new ParseUUIDPipe({ version: '4' })) applicationId: string,
  ): Promise<MerchantApplicationDetailsView> {
    return this.service.getApplicationDetails(applicationId);
  }

  @Post(':applicationId/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePlatformPermissions('platform.merchants.manage')
  @RedisRateLimit({ limit: 30, name: 'admin-merchant-application-approve', windowMs: 60_000 })
  @ApiHeader(IDEMPOTENCY_HEADER)
  @ApiMessage('Merchant application approved')
  @ApiOperation({ summary: 'Atomically approve and provision a merchant owner and location' })
  @ApiOkResponse({ type: ApprovedMerchantSuccessResponseDto })
  approve(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('applicationId', new ParseUUIDPipe({ version: '4' })) applicationId: string,
    @Body() dto: ApproveMerchantApplicationDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ): Promise<ApprovedMerchantView> {
    return this.service.approveApplication(
      principal.userId,
      applicationId,
      dto,
      idempotencyKey,
      merchantRequestMetadata(request),
    );
  }

  @Post(':applicationId/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePlatformPermissions('platform.merchants.manage')
  @RedisRateLimit({ limit: 30, name: 'admin-merchant-application-reject', windowMs: 60_000 })
  @ApiHeader(IDEMPOTENCY_HEADER)
  @ApiMessage('Merchant application rejected')
  @ApiOperation({ summary: 'Reject a submitted merchant application' })
  @ApiOkResponse({ type: MerchantApplicationSuccessResponseDto })
  reject(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('applicationId', new ParseUUIDPipe({ version: '4' })) applicationId: string,
    @Body() dto: ReviewMerchantApplicationDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ): Promise<MerchantApplicationView> {
    return this.service.rejectApplication(
      principal.userId,
      applicationId,
      dto,
      idempotencyKey,
      merchantRequestMetadata(request),
    );
  }

  @Post(':applicationId/request-changes')
  @HttpCode(HttpStatus.OK)
  @RequirePlatformPermissions('platform.merchants.manage')
  @RedisRateLimit({ limit: 30, name: 'admin-merchant-application-changes', windowMs: 60_000 })
  @ApiHeader(IDEMPOTENCY_HEADER)
  @ApiMessage('Changes requested for merchant application')
  @ApiOperation({ summary: 'Return a submitted application to its applicant for changes' })
  @ApiOkResponse({ type: MerchantApplicationSuccessResponseDto })
  requestChanges(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('applicationId', new ParseUUIDPipe({ version: '4' })) applicationId: string,
    @Body() dto: ReviewMerchantApplicationDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ): Promise<MerchantApplicationView> {
    return this.service.requestChanges(
      principal.userId,
      applicationId,
      dto,
      idempotencyKey,
      merchantRequestMetadata(request),
    );
  }
}
