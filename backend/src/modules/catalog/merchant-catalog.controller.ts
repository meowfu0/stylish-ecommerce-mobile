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
import { catalogRequestMetadata } from './catalog-request-metadata';
import {
  CatalogListQueryDto,
  CategoryListQueryDto,
  CreateBrandDto,
  CreateCollectionDto,
  CreateProductDto,
  CreateProductOptionDto,
  CreateProductOptionValueDto,
  CreateProductVariantDto,
  ProductListQueryDto,
  UpdateBrandDto,
  UpdateCollectionDto,
  UpdateProductDto,
  UpdateProductOptionDto,
  UpdateProductOptionValueDto,
  UpdateProductVariantDto,
} from './dto/catalog-request.dto';
import {
  BrandListSuccessResponseDto,
  BrandSuccessResponseDto,
  CategoryListSuccessResponseDto,
  CategorySuccessResponseDto,
  CollectionListSuccessResponseDto,
  CollectionSuccessResponseDto,
  ProductListSuccessResponseDto,
  ProductSuccessResponseDto,
} from './dto/catalog-response.dto';
import { MerchantCatalogService } from './services/merchant-catalog.service';
import type {
  BrandView,
  CategoryView,
  CollectionView,
  ProductDetailsView,
  ProductListView,
} from './types/catalog.types';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@ApiTags('Merchant Catalog')
@ApiBearerAuth('access-token')
@UseGuards(RedisRateLimitGuard)
@Controller('merchants/:merchantId/catalog')
export class MerchantCatalogController {
  constructor(private readonly service: MerchantCatalogService) {}

  @Get('brands')
  @RequireMerchantPermissions('merchantId', 'products.read')
  @RedisRateLimit({ limit: 180, name: 'catalog-brand-read', windowMs: 60_000 })
  @ApiMessage('Brands retrieved')
  @ApiOperation({ summary: 'List brands owned by the active merchant' })
  @ApiOkResponse({ type: BrandListSuccessResponseDto })
  listBrands(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Query() query: CatalogListQueryDto,
  ): Promise<{ items: BrandView[] }> {
    return this.service.listBrands(merchantId, query);
  }

  @Post('brands')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'catalog-brand-write', windowMs: 60_000 })
  @ApiMessage('Brand created')
  @ApiOperation({ summary: 'Create a merchant-owned brand' })
  @ApiCreatedResponse({ type: BrandSuccessResponseDto })
  createBrand(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Body() dto: CreateBrandDto,
    @Req() request: Request,
  ): Promise<BrandView> {
    return this.service.createBrand(
      principal.userId,
      merchantId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Get('brands/:brandId')
  @RequireMerchantPermissions('merchantId', 'products.read')
  @RedisRateLimit({ limit: 180, name: 'catalog-brand-read', windowMs: 60_000 })
  @ApiMessage('Brand retrieved')
  @ApiOkResponse({ type: BrandSuccessResponseDto })
  getBrand(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('brandId', uuidPipe) brandId: string,
  ): Promise<BrandView> {
    return this.service.getBrand(merchantId, brandId);
  }

  @Patch('brands/:brandId')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'catalog-brand-write', windowMs: 60_000 })
  @ApiMessage('Brand updated')
  @ApiOkResponse({ type: BrandSuccessResponseDto })
  updateBrand(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('brandId', uuidPipe) brandId: string,
    @Body() dto: UpdateBrandDto,
    @Req() request: Request,
  ): Promise<BrandView> {
    return this.service.updateBrand(
      principal.userId,
      merchantId,
      brandId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Get('categories')
  @RequireMerchantPermissions('merchantId', 'products.read')
  @RedisRateLimit({ limit: 180, name: 'catalog-category-read', windowMs: 60_000 })
  @ApiMessage('Categories retrieved')
  @ApiOperation({ summary: 'List the platform-managed category taxonomy' })
  @ApiOkResponse({ type: CategoryListSuccessResponseDto })
  listCategories(
    @Param('merchantId', uuidPipe) _merchantId: string,
    @Query() query: CategoryListQueryDto,
  ): Promise<{ items: CategoryView[] }> {
    return this.service.listCategories(query);
  }

  @Get('categories/:categoryId')
  @RequireMerchantPermissions('merchantId', 'products.read')
  @RedisRateLimit({ limit: 180, name: 'catalog-category-read', windowMs: 60_000 })
  @ApiMessage('Category retrieved')
  @ApiOperation({ summary: 'Read one platform-managed category' })
  @ApiOkResponse({ type: CategorySuccessResponseDto })
  getCategory(
    @Param('merchantId', uuidPipe) _merchantId: string,
    @Param('categoryId', uuidPipe) categoryId: string,
  ): Promise<CategoryView> {
    return this.service.getCategory(categoryId);
  }

  @Get('collections')
  @RequireMerchantPermissions('merchantId', 'products.read')
  @RedisRateLimit({ limit: 180, name: 'catalog-collection-read', windowMs: 60_000 })
  @ApiMessage('Collections retrieved')
  @ApiOkResponse({ type: CollectionListSuccessResponseDto })
  listCollections(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Query() query: CatalogListQueryDto,
  ): Promise<{ items: CollectionView[] }> {
    return this.service.listCollections(merchantId, query);
  }

  @Post('collections')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'catalog-collection-write', windowMs: 60_000 })
  @ApiMessage('Collection created')
  @ApiCreatedResponse({ type: CollectionSuccessResponseDto })
  createCollection(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Body() dto: CreateCollectionDto,
    @Req() request: Request,
  ): Promise<CollectionView> {
    return this.service.createCollection(
      principal.userId,
      merchantId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Get('collections/:collectionId')
  @RequireMerchantPermissions('merchantId', 'products.read')
  @RedisRateLimit({ limit: 180, name: 'catalog-collection-read', windowMs: 60_000 })
  @ApiMessage('Collection retrieved')
  @ApiOkResponse({ type: CollectionSuccessResponseDto })
  getCollection(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('collectionId', uuidPipe) collectionId: string,
  ): Promise<CollectionView> {
    return this.service.getCollection(merchantId, collectionId);
  }

  @Patch('collections/:collectionId')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'catalog-collection-write', windowMs: 60_000 })
  @ApiMessage('Collection updated')
  @ApiOkResponse({ type: CollectionSuccessResponseDto })
  updateCollection(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('collectionId', uuidPipe) collectionId: string,
    @Body() dto: UpdateCollectionDto,
    @Req() request: Request,
  ): Promise<CollectionView> {
    return this.service.updateCollection(
      principal.userId,
      merchantId,
      collectionId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Get('products')
  @RequireMerchantPermissions('merchantId', 'products.read')
  @RedisRateLimit({ limit: 180, name: 'catalog-product-read', windowMs: 60_000 })
  @ApiMessage('Products retrieved')
  @ApiOperation({ summary: 'List merchant products with cursor pagination and catalog filters' })
  @ApiOkResponse({ type: ProductListSuccessResponseDto })
  listProducts(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Query() query: ProductListQueryDto,
  ): Promise<ProductListView> {
    return this.service.listProducts(merchantId, query);
  }

  @Post('products')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 30, name: 'catalog-product-create', windowMs: 60_000 })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiMessage('Draft product created')
  @ApiOperation({ summary: 'Create an idempotent draft product' })
  @ApiCreatedResponse({ type: ProductSuccessResponseDto })
  createProduct(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Body() dto: CreateProductDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ): Promise<ProductDetailsView> {
    return this.service.createProduct(
      principal.userId,
      merchantId,
      dto,
      idempotencyKey,
      catalogRequestMetadata(request),
    );
  }

  @Get('products/:productId')
  @RequireMerchantPermissions('merchantId', 'products.read')
  @RedisRateLimit({ limit: 180, name: 'catalog-product-read', windowMs: 60_000 })
  @ApiMessage('Product retrieved')
  @ApiOkResponse({ type: ProductSuccessResponseDto })
  getProduct(
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
  ): Promise<ProductDetailsView> {
    return this.service.getProduct(merchantId, productId);
  }

  @Patch('products/:productId')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'catalog-product-write', windowMs: 60_000 })
  @ApiMessage('Product updated')
  @ApiOkResponse({ type: ProductSuccessResponseDto })
  updateProduct(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Body() dto: UpdateProductDto,
    @Req() request: Request,
  ): Promise<ProductDetailsView> {
    return this.service.updateProduct(
      principal.userId,
      merchantId,
      productId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Post('products/:productId/options')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'catalog-product-write', windowMs: 60_000 })
  @ApiMessage('Product option created')
  @ApiCreatedResponse({ type: ProductSuccessResponseDto })
  createOption(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Body() dto: CreateProductOptionDto,
    @Req() request: Request,
  ): Promise<ProductDetailsView> {
    return this.service.createOption(
      principal.userId,
      merchantId,
      productId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Patch('products/:productId/options/:optionId')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'catalog-product-write', windowMs: 60_000 })
  @ApiMessage('Product option updated')
  @ApiOkResponse({ type: ProductSuccessResponseDto })
  updateOption(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Param('optionId', uuidPipe) optionId: string,
    @Body() dto: UpdateProductOptionDto,
    @Req() request: Request,
  ): Promise<ProductDetailsView> {
    return this.service.updateOption(
      principal.userId,
      merchantId,
      productId,
      optionId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Post('products/:productId/options/:optionId/values')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'catalog-product-write', windowMs: 60_000 })
  @ApiMessage('Product option value created')
  @ApiCreatedResponse({ type: ProductSuccessResponseDto })
  createOptionValue(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Param('optionId', uuidPipe) optionId: string,
    @Body() dto: CreateProductOptionValueDto,
    @Req() request: Request,
  ): Promise<ProductDetailsView> {
    return this.service.createOptionValue(
      principal.userId,
      merchantId,
      productId,
      optionId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Patch('products/:productId/options/:optionId/values/:valueId')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'catalog-product-write', windowMs: 60_000 })
  @ApiMessage('Product option value updated')
  @ApiOkResponse({ type: ProductSuccessResponseDto })
  updateOptionValue(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Param('optionId', uuidPipe) optionId: string,
    @Param('valueId', uuidPipe) valueId: string,
    @Body() dto: UpdateProductOptionValueDto,
    @Req() request: Request,
  ): Promise<ProductDetailsView> {
    return this.service.updateOptionValue(
      principal.userId,
      merchantId,
      productId,
      optionId,
      valueId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Post('products/:productId/variants')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'catalog-product-write', windowMs: 60_000 })
  @ApiMessage('Product variant created')
  @ApiCreatedResponse({ type: ProductSuccessResponseDto })
  createVariant(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Body() dto: CreateProductVariantDto,
    @Req() request: Request,
  ): Promise<ProductDetailsView> {
    return this.service.createVariant(
      principal.userId,
      merchantId,
      productId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Patch('products/:productId/variants/:variantId')
  @RequireMerchantPermissions('merchantId', 'products.write')
  @RedisRateLimit({ limit: 60, name: 'catalog-product-write', windowMs: 60_000 })
  @ApiMessage('Product variant updated')
  @ApiOkResponse({ type: ProductSuccessResponseDto })
  updateVariant(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Param('variantId', uuidPipe) variantId: string,
    @Body() dto: UpdateProductVariantDto,
    @Req() request: Request,
  ): Promise<ProductDetailsView> {
    return this.service.updateVariant(
      principal.userId,
      merchantId,
      productId,
      variantId,
      dto,
      catalogRequestMetadata(request),
    );
  }

  @Post('products/:productId/publish')
  @HttpCode(200)
  @RequireMerchantPermissions('merchantId', 'products.publish')
  @RedisRateLimit({ limit: 30, name: 'catalog-product-lifecycle', windowMs: 60_000 })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiMessage('Product published')
  @ApiOkResponse({ type: ProductSuccessResponseDto })
  publishProduct(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ): Promise<ProductDetailsView> {
    return this.service.publishProduct(
      principal.userId,
      merchantId,
      productId,
      idempotencyKey,
      catalogRequestMetadata(request),
    );
  }

  @Post('products/:productId/deactivate')
  @HttpCode(200)
  @RequireMerchantPermissions('merchantId', 'products.publish')
  @RedisRateLimit({ limit: 30, name: 'catalog-product-lifecycle', windowMs: 60_000 })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiMessage('Product deactivated')
  @ApiOkResponse({ type: ProductSuccessResponseDto })
  deactivateProduct(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ): Promise<ProductDetailsView> {
    return this.service.deactivateProduct(
      principal.userId,
      merchantId,
      productId,
      idempotencyKey,
      catalogRequestMetadata(request),
    );
  }

  @Post('products/:productId/archive')
  @HttpCode(200)
  @RequireMerchantPermissions('merchantId', 'products.publish')
  @RedisRateLimit({ limit: 30, name: 'catalog-product-lifecycle', windowMs: 60_000 })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiMessage('Product archived')
  @ApiOkResponse({ type: ProductSuccessResponseDto })
  archiveProduct(
    @CurrentAuth() principal: AuthPrincipal,
    @Param('merchantId', uuidPipe) merchantId: string,
    @Param('productId', uuidPipe) productId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: Request,
  ): Promise<ProductDetailsView> {
    return this.service.archiveProduct(
      principal.userId,
      merchantId,
      productId,
      idempotencyKey,
      catalogRequestMetadata(request),
    );
  }
}
