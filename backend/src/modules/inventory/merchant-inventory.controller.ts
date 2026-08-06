import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { RequireMerchantPermissions } from '../auth/decorators/permissions.decorator';
import type { AuthPrincipal } from '../auth/types/auth.types';
import {
  CreateInventoryAdjustmentDto,
  CreateInventoryLocationDto,
  InventoryLevelQueryDto,
  InventoryMovementQueryDto,
  LocationListQueryDto,
  UpdateInventoryLocationDto,
} from './dto/inventory-request.dto';
import {
  InventoryAdjustmentSuccessResponseDto,
  InventoryLevelPageSuccessResponseDto,
  InventoryLocationListSuccessResponseDto,
  InventoryLocationSuccessResponseDto,
  InventoryMovementPageSuccessResponseDto,
  InventoryVariantSuccessResponseDto,
} from './dto/inventory-response.dto';
import { inventoryRequestMetadata } from './inventory-request-metadata';
import { MerchantInventoryService } from './services/merchant-inventory.service';
import type {
  InventoryAdjustmentView,
  InventoryLevelView,
  InventoryLocationView,
  InventoryMovementView,
  InventoryPage,
  InventoryVariantView,
} from './types/inventory.types';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@ApiTags('Merchant Inventory')
@ApiBearerAuth('access-token')
@UseGuards(RedisRateLimitGuard)
@Controller('merchants/:merchantId/inventory')
export class MerchantInventoryController {
  constructor(private readonly service: MerchantInventoryService) {}

  @Get('locations')
  @RequireMerchantPermissions('merchantId', 'merchant.inventory.read')
  @RedisRateLimit({ limit: 180, name: 'inventory-location-read', windowMs: 60_000 })
  @ApiMessage('Inventory locations retrieved')
  @ApiOperation({ summary: 'List merchant inventory locations' })
  @ApiOkResponse({ type: InventoryLocationListSuccessResponseDto })
  listLocations(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Query() query: LocationListQueryDto,
  ): Promise<{ items: InventoryLocationView[] }> {
    return this.service.listLocations(merchantId, query);
  }

  @Post('locations')
  @RequireMerchantPermissions('merchantId', 'merchant.inventory.locations.manage')
  @RedisRateLimit({ limit: 30, name: 'inventory-location-write', windowMs: 60_000 })
  @ApiMessage('Inventory location created')
  @ApiOperation({ summary: 'Create a merchant inventory location' })
  @ApiCreatedResponse({ type: InventoryLocationSuccessResponseDto })
  createLocation(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Body() dto: CreateInventoryLocationDto,
    @Req() request: Request,
  ): Promise<InventoryLocationView> {
    return this.service.createLocation(
      principal.userId,
      merchantId,
      dto,
      inventoryRequestMetadata(request),
    );
  }

  @Patch('locations/:locationId')
  @RequireMerchantPermissions('merchantId', 'merchant.inventory.locations.manage')
  @RedisRateLimit({ limit: 30, name: 'inventory-location-write', windowMs: 60_000 })
  @ApiMessage('Inventory location updated')
  @ApiOkResponse({ type: InventoryLocationSuccessResponseDto })
  updateLocation(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('locationId', uuidPipe) locationId: string,
    @Body() dto: UpdateInventoryLocationDto,
    @Req() request: Request,
  ): Promise<InventoryLocationView> {
    return this.service.updateLocation(
      principal.userId,
      merchantId,
      locationId,
      dto,
      inventoryRequestMetadata(request),
    );
  }

  @Post('locations/:locationId/set-default')
  @HttpCode(200)
  @RequireMerchantPermissions('merchantId', 'merchant.inventory.locations.manage')
  @RedisRateLimit({ limit: 30, name: 'inventory-location-write', windowMs: 60_000 })
  @ApiMessage('Default inventory location updated')
  @ApiOkResponse({ type: InventoryLocationSuccessResponseDto })
  setDefaultLocation(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('locationId', uuidPipe) locationId: string,
    @Req() request: Request,
  ): Promise<InventoryLocationView> {
    return this.service.setDefaultLocation(
      principal.userId,
      merchantId,
      locationId,
      inventoryRequestMetadata(request),
    );
  }

  @Get('levels')
  @RequireMerchantPermissions('merchantId', 'merchant.inventory.read')
  @RedisRateLimit({ limit: 180, name: 'inventory-level-read', windowMs: 60_000 })
  @ApiMessage('Inventory levels retrieved')
  @ApiOperation({ summary: 'List inventory levels with ownership-safe filters' })
  @ApiOkResponse({ type: InventoryLevelPageSuccessResponseDto })
  listLevels(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Query() query: InventoryLevelQueryDto,
  ): Promise<InventoryPage<InventoryLevelView>> {
    return this.service.listLevels(merchantId, query);
  }

  @Get('variants/:variantId')
  @RequireMerchantPermissions('merchantId', 'merchant.inventory.read')
  @RedisRateLimit({ limit: 180, name: 'inventory-level-read', windowMs: 60_000 })
  @ApiMessage('Variant inventory retrieved')
  @ApiOkResponse({ type: InventoryVariantSuccessResponseDto })
  getVariant(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('variantId', uuidPipe) variantId: string,
  ): Promise<InventoryVariantView> {
    return this.service.getVariant(merchantId, variantId);
  }

  @Post('adjustments')
  @RequireMerchantPermissions('merchantId', 'merchant.inventory.adjust')
  @RedisRateLimit({ limit: 120, name: 'inventory-adjustment', windowMs: 60_000 })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiMessage('Inventory adjusted')
  @ApiOperation({ summary: 'Apply an idempotent, version-checked stock adjustment' })
  @ApiCreatedResponse({ type: InventoryAdjustmentSuccessResponseDto })
  adjustStock(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Body() dto: CreateInventoryAdjustmentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ): Promise<InventoryAdjustmentView> {
    return this.service.adjustStock(
      principal.userId,
      merchantId,
      dto,
      idempotencyKey,
      inventoryRequestMetadata(request),
    );
  }

  @Get('movements')
  @RequireMerchantPermissions('merchantId', 'merchant.inventory.read')
  @RedisRateLimit({ limit: 180, name: 'inventory-movement-read', windowMs: 60_000 })
  @ApiMessage('Inventory movements retrieved')
  @ApiOperation({ summary: 'List immutable manual inventory movements' })
  @ApiOkResponse({ type: InventoryMovementPageSuccessResponseDto })
  listMovements(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Query() query: InventoryMovementQueryDto,
  ): Promise<InventoryPage<InventoryMovementView>> {
    return this.service.listMovements(merchantId, query);
  }

  @Get('low-stock')
  @RequireMerchantPermissions('merchantId', 'merchant.inventory.read')
  @RedisRateLimit({ limit: 180, name: 'inventory-low-stock-read', windowMs: 60_000 })
  @ApiMessage('Low-stock inventory retrieved')
  @ApiOperation({ summary: 'List low-stock and out-of-stock merchant variants' })
  @ApiOkResponse({ type: InventoryLevelPageSuccessResponseDto })
  listLowStock(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Query() query: InventoryLevelQueryDto,
  ): Promise<InventoryPage<InventoryLevelView>> {
    return this.service.listLowStock(merchantId, query);
  }
}
