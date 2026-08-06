import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ApiMessage } from '../../common/decorators/api-message.decorator';
import { RedisRateLimit } from '../../infrastructure/redis/redis-rate-limit.decorator';
import { RedisRateLimitGuard } from '../../infrastructure/redis/redis-rate-limit.guard';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator';
import { RequireMerchantPermissions } from '../auth/decorators/permissions.decorator';
import type { AuthPrincipal } from '../auth/types/auth.types';
import { UpdateApprovedMerchantDto } from './dto/merchant-onboarding-request.dto';
import { ApprovedMerchantSuccessResponseDto } from './dto/merchant-onboarding-response.dto';
import { merchantRequestMetadata } from './merchant-request-metadata';
import { MerchantOnboardingService } from './services/merchant-onboarding.service';
import type { ApprovedMerchantView } from './types/merchant-onboarding.types';

@ApiTags('Merchants')
@ApiBearerAuth('access-token')
@UseGuards(RedisRateLimitGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly service: MerchantOnboardingService) {}

  @Get(':merchantId')
  @RequireMerchantPermissions('merchantId', 'merchant.profile.read')
  @RedisRateLimit({ limit: 180, name: 'merchant-profile-read', windowMs: 60_000 })
  @ApiMessage('Merchant profile retrieved')
  @ApiOperation({ summary: 'Get an approved merchant profile for an authorized member' })
  @ApiOkResponse({ type: ApprovedMerchantSuccessResponseDto })
  get(
    @Param('merchantId', new ParseUUIDPipe({ version: '4' })) merchantId: string,
  ): Promise<ApprovedMerchantView> {
    return this.service.getApprovedMerchant(merchantId);
  }

  @Patch(':merchantId')
  @RequireMerchantPermissions('merchantId', 'merchant.profile.update')
  @RedisRateLimit({ limit: 30, name: 'merchant-profile-update', windowMs: 60_000 })
  @ApiMessage('Merchant profile updated')
  @ApiOperation({ summary: 'Update approved, non-sensitive merchant profile fields' })
  @ApiOkResponse({ type: ApprovedMerchantSuccessResponseDto })
  update(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', new ParseUUIDPipe({ version: '4' })) merchantId: string,
    @Body() dto: UpdateApprovedMerchantDto,
    @Req() request: Request,
  ): Promise<ApprovedMerchantView> {
    return this.service.updateApprovedMerchant(
      principal.userId,
      merchantId,
      dto,
      merchantRequestMetadata(request),
    );
  }
}
