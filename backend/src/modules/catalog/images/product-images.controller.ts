import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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

import { ApiMessage } from '../../../common/decorators/api-message.decorator';
import { RedisRateLimit } from '../../../infrastructure/redis/redis-rate-limit.decorator';
import { RedisRateLimitGuard } from '../../../infrastructure/redis/redis-rate-limit.guard';
import { CurrentAuth } from '../../auth/decorators/current-auth.decorator';
import { RequireMerchantPermissions } from '../../auth/decorators/permissions.decorator';
import type { AuthPrincipal } from '../../auth/types/auth.types';
import { catalogRequestMetadata } from '../catalog-request-metadata';
import {
  InitializeProductImageUploadDto,
  ReorderProductImagesDto,
  UpdateProductImageDto,
} from './dto/product-image-request.dto';
import {
  ProductImageDeleteResponseDto,
  ProductImageListResponseDto,
  ProductImageResponseDto,
  ProductImageSignedReadResponseDto,
  ProductImageUploadRequestResponseDto,
} from './dto/product-image-response.dto';
import { ProductImagesService } from './services/product-images.service';
import type {
  ProductImageDeleteView,
  ProductImageUploadRequestView,
  ProductImageView,
} from './types/product-image.types';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@ApiTags('Merchant Product Images')
@ApiBearerAuth('access-token')
@UseGuards(RedisRateLimitGuard)
@Controller('merchants/:merchantId/catalog/products/:productId/images')
export class ProductImagesController {
  constructor(private readonly service: ProductImagesService) {}

  @Get()
  @RequireMerchantPermissions('merchantId', 'products.read')
  @RedisRateLimit({ limit: 180, name: 'product-image-read', windowMs: 60_000 })
  @ApiMessage('Product images retrieved')
  @ApiOperation({ summary: 'List confirmed product images with short-lived read URLs' })
  @ApiOkResponse({ type: ProductImageListResponseDto })
  listImages(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
  ): Promise<{ items: ProductImageView[] }> {
    return this.service.listImages(merchantId, productId);
  }

  @Post('upload-requests')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 30, name: 'product-image-upload', windowMs: 60_000 })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiMessage('Signed product image upload request created')
  @ApiOperation({ summary: 'Initialize a validated, idempotent product image upload' })
  @ApiCreatedResponse({ type: ProductImageUploadRequestResponseDto })
  initializeUpload(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Body() dto: InitializeProductImageUploadDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ): Promise<ProductImageUploadRequestView> {
    return this.service.initializeUpload(
      principal.userId,
      merchantId,
      productId,
      dto,
      idempotencyKey,
      catalogRequestMetadata(request),
    );
  }

  @Post(':imageId/confirm')
  @HttpCode(200)
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'product-image-write', windowMs: 60_000 })
  @ApiMessage('Product image upload confirmed')
  @ApiOperation({ summary: 'Validate the uploaded object and confirm its metadata' })
  @ApiOkResponse({ type: ProductImageResponseDto })
  confirmUpload(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Param('imageId', uuidPipe) imageId: string,
    @Req() request: Request,
  ): Promise<ProductImageView> {
    return this.service.confirmUpload(
      principal.userId,
      merchantId,
      productId,
      imageId,
      catalogRequestMetadata(request),
    );
  }

  @Patch('reorder')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'product-image-write', windowMs: 60_000 })
  @ApiMessage('Product images reordered')
  @ApiOperation({ summary: 'Atomically replace the confirmed image display order' })
  @ApiOkResponse({ type: ProductImageListResponseDto })
  reorderImages(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Body() dto: ReorderProductImagesDto,
    @Req() request: Request,
  ): Promise<{ items: ProductImageView[] }> {
    return this.service.reorderImages(
      principal.userId,
      merchantId,
      productId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Patch(':imageId')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'product-image-write', windowMs: 60_000 })
  @ApiMessage('Product image updated')
  @ApiOperation({ summary: 'Update product image alt text or display order' })
  @ApiOkResponse({ type: ProductImageResponseDto })
  updateImage(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Param('imageId', uuidPipe) imageId: string,
    @Body() dto: UpdateProductImageDto,
    @Req() request: Request,
  ): Promise<ProductImageView> {
    return this.service.updateImage(
      principal.userId,
      merchantId,
      productId,
      imageId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Post(':imageId/set-primary')
  @HttpCode(200)
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'product-image-write', windowMs: 60_000 })
  @ApiMessage('Primary product image updated')
  @ApiOperation({ summary: 'Atomically set the product primary image' })
  @ApiOkResponse({ type: ProductImageResponseDto })
  setPrimary(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Param('imageId', uuidPipe) imageId: string,
    @Req() request: Request,
  ): Promise<ProductImageView> {
    return this.service.setPrimary(
      principal.userId,
      merchantId,
      productId,
      imageId,
      catalogRequestMetadata(request),
    );
  }

  @Get(':imageId/signed-url')
  @RequireMerchantPermissions('merchantId', 'products.read')
  @RedisRateLimit({ limit: 180, name: 'product-image-read', windowMs: 60_000 })
  @ApiMessage('Signed product image read URL created')
  @ApiOperation({ summary: 'Generate a short-lived read URL for a private image' })
  @ApiOkResponse({ type: ProductImageSignedReadResponseDto })
  createSignedReadUrl(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Param('imageId', uuidPipe) imageId: string,
  ): Promise<{ expiresAt: string; imageId: string; signedUrl: string }> {
    return this.service.createSignedReadUrl(merchantId, productId, imageId);
  }

  @Delete(':imageId')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 30, name: 'product-image-delete', windowMs: 60_000 })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiMessage('Product image deleted')
  @ApiOperation({ summary: 'Delete image metadata and its private Storage object' })
  @ApiOkResponse({ type: ProductImageDeleteResponseDto })
  deleteImage(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Param('imageId', uuidPipe) imageId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ): Promise<ProductImageDeleteView> {
    return this.service.deleteImage(
      principal.userId,
      merchantId,
      productId,
      imageId,
      idempotencyKey,
      catalogRequestMetadata(request),
    );
  }
}
