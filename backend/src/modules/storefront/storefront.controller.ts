import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiMessage } from '../../common/decorators/api-message.decorator';
import { RedisRateLimit } from '../../infrastructure/redis/redis-rate-limit.decorator';
import { RedisRateLimitGuard } from '../../infrastructure/redis/redis-rate-limit.guard';
import { Public } from '../auth/decorators/public.decorator';
import {
  StorefrontDirectoryQueryDto,
  StorefrontMerchantDirectoryQueryDto,
  StorefrontProductListQueryDto,
} from './dto/storefront-request.dto';
import {
  StorefrontBrandListResponseDto,
  StorefrontCategoryListResponseDto,
  StorefrontCollectionListResponseDto,
  StorefrontCollectionResponseDto,
  StorefrontMerchantResponseDto,
  StorefrontProductListResponseDto,
  StorefrontProductResponseDto,
} from './dto/storefront-response.dto';
import { StorefrontService } from './services/storefront.service';
import { StorefrontSlugPipe } from './storefront-slug.pipe';
import type {
  StorefrontBrandView,
  StorefrontCategoryView,
  StorefrontCollectionDetailsView,
  StorefrontCollectionView,
  StorefrontMerchantView,
  StorefrontProductDetailsView,
  StorefrontProductListView,
} from './types/storefront.types';

const slugPipe = new StorefrontSlugPipe();

@ApiTags('Customer Storefront')
@Public()
@UseGuards(RedisRateLimitGuard)
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly service: StorefrontService) {}

  @Get('products')
  @RedisRateLimit({ limit: 120, name: 'storefront-products', windowMs: 60_000 })
  @ApiMessage('Storefront products retrieved')
  @ApiOperation({
    summary: 'List published storefront products using filters and an opaque cursor',
  })
  @ApiOkResponse({ type: StorefrontProductListResponseDto })
  listProducts(@Query() query: StorefrontProductListQueryDto): Promise<StorefrontProductListView> {
    return this.service.listProducts(query);
  }

  @Get('products/:productSlug')
  @RedisRateLimit({ limit: 180, name: 'storefront-product-detail', windowMs: 60_000 })
  @ApiMessage('Storefront product retrieved')
  @ApiOperation({ summary: 'Read one active published product by its global storefront slug' })
  @ApiOkResponse({ type: StorefrontProductResponseDto })
  getProduct(
    @Param('productSlug', slugPipe) productSlug: string,
  ): Promise<StorefrontProductDetailsView> {
    return this.service.getProduct(productSlug);
  }

  @Get('categories')
  @RedisRateLimit({ limit: 120, name: 'storefront-categories', windowMs: 60_000 })
  @ApiMessage('Storefront categories retrieved')
  @ApiOperation({ summary: 'List active storefront categories' })
  @ApiOkResponse({ type: StorefrontCategoryListResponseDto })
  listCategories(
    @Query() query: StorefrontDirectoryQueryDto,
  ): Promise<{ items: StorefrontCategoryView[] }> {
    return this.service.listCategories(query);
  }

  @Get('categories/:categorySlug/products')
  @RedisRateLimit({ limit: 120, name: 'storefront-category-products', windowMs: 60_000 })
  @ApiMessage('Category products retrieved')
  @ApiOperation({ summary: 'List published products assigned to an active category' })
  @ApiOkResponse({ type: StorefrontProductListResponseDto })
  listCategoryProducts(
    @Param('categorySlug', slugPipe) categorySlug: string,
    @Query() query: StorefrontProductListQueryDto,
  ): Promise<StorefrontProductListView> {
    return this.service.listCategoryProducts(categorySlug, query);
  }

  @Get('collections')
  @RedisRateLimit({ limit: 120, name: 'storefront-collections', windowMs: 60_000 })
  @ApiMessage('Storefront collections retrieved')
  @ApiOperation({ summary: 'List active, currently visible merchant collections' })
  @ApiOkResponse({ type: StorefrontCollectionListResponseDto })
  listCollections(
    @Query() query: StorefrontMerchantDirectoryQueryDto,
  ): Promise<{ items: StorefrontCollectionView[] }> {
    return this.service.listCollections(query);
  }

  @Get('collections/:collectionSlug')
  @RedisRateLimit({ limit: 120, name: 'storefront-collection-detail', windowMs: 60_000 })
  @ApiMessage('Storefront collection retrieved')
  @ApiOperation({ summary: 'Read an active collection and its paginated published products' })
  @ApiOkResponse({ type: StorefrontCollectionResponseDto })
  getCollection(
    @Param('collectionSlug', slugPipe) collectionSlug: string,
    @Query() query: StorefrontProductListQueryDto,
  ): Promise<StorefrontCollectionDetailsView> {
    return this.service.getCollection(collectionSlug, query);
  }

  @Get('brands')
  @RedisRateLimit({ limit: 120, name: 'storefront-brands', windowMs: 60_000 })
  @ApiMessage('Storefront brands retrieved')
  @ApiOperation({ summary: 'List active brands belonging to approved merchants' })
  @ApiOkResponse({ type: StorefrontBrandListResponseDto })
  listBrands(
    @Query() query: StorefrontMerchantDirectoryQueryDto,
  ): Promise<{ items: StorefrontBrandView[] }> {
    return this.service.listBrands(query);
  }

  @Get('merchants/:merchantSlug/products')
  @RedisRateLimit({ limit: 120, name: 'storefront-merchant-products', windowMs: 60_000 })
  @ApiMessage('Merchant storefront products retrieved')
  @ApiOperation({ summary: 'List published products for one active approved merchant' })
  @ApiOkResponse({ type: StorefrontProductListResponseDto })
  listMerchantProducts(
    @Param('merchantSlug', slugPipe) merchantSlug: string,
    @Query() query: StorefrontProductListQueryDto,
  ): Promise<StorefrontProductListView> {
    return this.service.listMerchantProducts(merchantSlug, query);
  }

  @Get('merchants/:merchantSlug')
  @RedisRateLimit({ limit: 180, name: 'storefront-merchant-detail', windowMs: 60_000 })
  @ApiMessage('Merchant storefront retrieved')
  @ApiOperation({ summary: 'Read the public profile of an active approved merchant' })
  @ApiOkResponse({ type: StorefrontMerchantResponseDto })
  getMerchant(
    @Param('merchantSlug', slugPipe) merchantSlug: string,
  ): Promise<StorefrontMerchantView> {
    return this.service.getMerchant(merchantSlug);
  }
}
