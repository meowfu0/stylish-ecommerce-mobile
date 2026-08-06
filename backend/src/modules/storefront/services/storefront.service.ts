import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import {
  categories,
  merchantProfiles,
  merchants,
  productCategories,
  productOptions,
  productOptionValues,
  productVariants,
  variantOptionValues,
} from '../../../database/schema';
import { SupabaseStorageService } from '../../../infrastructure/storage/supabase-storage.service';
import type {
  StorefrontDirectoryQueryDto,
  StorefrontMerchantDirectoryQueryDto,
  StorefrontProductListQueryDto,
} from '../dto/storefront-request.dto';
import {
  STOREFRONT_DIRECTORY_TTL_SECONDS,
  STOREFRONT_MERCHANT_TTL_SECONDS,
  STOREFRONT_PRODUCT_DETAILS_TTL_SECONDS,
  STOREFRONT_PRODUCT_LIST_TTL_SECONDS,
} from '../storefront.constants';
import type { StorefrontSort } from '../storefront.constants';
import type {
  StorefrontBrandView,
  StorefrontCategoryView,
  StorefrontCollectionDetailsView,
  StorefrontCollectionView,
  StorefrontImageView,
  StorefrontMerchantSummaryView,
  StorefrontMerchantView,
  StorefrontOptionView,
  StorefrontProductDetailsView,
  StorefrontProductListView,
  StorefrontProductSummaryView,
  StorefrontStockStatus,
  StorefrontVariantView,
} from '../types/storefront.types';
import { StorefrontCacheService } from './storefront-cache.service';
import { StorefrontCursorService } from './storefront-cursor.service';
import type { StorefrontCursorKey } from './storefront-cursor.service';

type ProductQueryScope = {
  productSlug?: string;
};

type StorefrontProductRow = {
  availableStock: number;
  brandDescription: string | null;
  brandId: string | null;
  brandName: string | null;
  brandSlug: string | null;
  description: string | null;
  imageAltText: string | null;
  imageId: string | null;
  imageStoragePath: string | null;
  isFeatured: boolean;
  maxPriceCentavos: number;
  merchantDisplayName: string;
  merchantId: string;
  merchantSlug: string;
  minPriceCentavos: number;
  name: string;
  productId: string;
  productSlug: string;
  publishedAt: Date | string;
  shortDescription: string | null;
  stockStatus: StorefrontStockStatus;
};

type StorefrontVariantRow = {
  availableStock: number;
  compareAtPriceCentavos: number | null;
  healthyStock: boolean;
  id: string;
  isDefault: boolean;
  name: string;
  priceCentavos: number;
};

@Injectable()
export class StorefrontService {
  constructor(
    private readonly cache: StorefrontCacheService,
    private readonly cursorService: StorefrontCursorService,
    private readonly databaseService: DatabaseService,
    private readonly storageService: SupabaseStorageService,
  ) {}

  listProducts(query: StorefrontProductListQueryDto): Promise<StorefrontProductListView> {
    this.assertPriceRange(query);
    return this.cache.getOrLoad('products', query, STOREFRONT_PRODUCT_LIST_TTL_SECONDS, true, () =>
      this.loadProducts(query),
    );
  }

  getProduct(productSlug: string): Promise<StorefrontProductDetailsView> {
    return this.cache.getOrLoad(
      'product-detail',
      { productSlug },
      STOREFRONT_PRODUCT_DETAILS_TTL_SECONDS,
      true,
      () => this.loadProductDetails(productSlug),
    );
  }

  listCategories(query: StorefrontDirectoryQueryDto): Promise<{ items: StorefrontCategoryView[] }> {
    return this.cache.getOrLoad('categories', query, STOREFRONT_DIRECTORY_TTL_SECONDS, false, () =>
      this.loadCategories(query),
    );
  }

  async listCategoryProducts(
    categorySlug: string,
    query: StorefrontProductListQueryDto,
  ): Promise<StorefrontProductListView> {
    await this.getPublicCategory(categorySlug);
    return this.listProducts({ ...query, categorySlug });
  }

  listCollections(
    query: StorefrontMerchantDirectoryQueryDto,
  ): Promise<{ items: StorefrontCollectionView[] }> {
    return this.cache.getOrLoad('collections', query, STOREFRONT_DIRECTORY_TTL_SECONDS, false, () =>
      this.loadCollections(query),
    );
  }

  getCollection(
    collectionSlug: string,
    query: StorefrontProductListQueryDto,
  ): Promise<StorefrontCollectionDetailsView> {
    this.assertPriceRange(query);
    return this.cache.getOrLoad(
      'collection-detail',
      { collectionSlug, query },
      STOREFRONT_PRODUCT_LIST_TTL_SECONDS,
      true,
      async () => {
        const collection = await this.getPublicCollection(collectionSlug);
        const products = await this.loadProducts({ ...query, collectionSlug });
        return { ...collection, products };
      },
    );
  }

  listBrands(
    query: StorefrontMerchantDirectoryQueryDto,
  ): Promise<{ items: StorefrontBrandView[] }> {
    return this.cache.getOrLoad('brands', query, STOREFRONT_DIRECTORY_TTL_SECONDS, false, () =>
      this.loadBrands(query),
    );
  }

  getMerchant(merchantSlug: string): Promise<StorefrontMerchantView> {
    return this.cache.getOrLoad(
      'merchant',
      { merchantSlug },
      STOREFRONT_MERCHANT_TTL_SECONDS,
      false,
      () => this.loadMerchant(merchantSlug),
    );
  }

  async listMerchantProducts(
    merchantSlug: string,
    query: StorefrontProductListQueryDto,
  ): Promise<StorefrontProductListView> {
    await this.getMerchant(merchantSlug);
    return this.listProducts({ ...query, merchantSlug });
  }

  private async loadProducts(
    query: StorefrontProductListQueryDto,
    scope: ProductQueryScope = {},
  ): Promise<StorefrontProductListView> {
    const sort = query.sort ?? 'recommended';
    const cursor = this.cursorService.decode(query.cursor, query, sort);
    const conditions = this.productConditions(query, scope);
    const cursorCondition = this.cursorCondition(sort, cursor);

    if (cursorCondition) conditions.push(cursorCondition);

    const limit = query.limit ?? 20;
    const result = await this.databaseService.db.execute<StorefrontProductRow>(sql`
      with product_rollup as (
        select
          variant.merchant_id,
          variant.product_id,
          min(variant.price_centavos)::integer as min_price_centavos,
          max(variant.price_centavos)::integer as max_price_centavos,
          coalesce(
            sum(
              greatest(
                coalesce(balance.stock_on_hand, 0) - coalesce(balance.stock_reserved, 0),
                0
              )
            ),
            0
          )::integer as available_stock,
          coalesce(
            bool_or(
              greatest(
                coalesce(balance.stock_on_hand, 0) - coalesce(balance.stock_reserved, 0),
                0
              ) > coalesce(balance.reorder_threshold, 0)
            ),
            false
          ) as healthy_stock
        from product_variants variant
        left join inventory_balances balance
          on balance.merchant_id = variant.merchant_id
          and balance.variant_id = variant.id
          and exists (
            select 1
            from inventory_locations location
            where location.id = balance.location_id
              and location.merchant_id = balance.merchant_id
              and location.is_active = true
          )
        where variant.is_active = true and variant.deleted_at is null
        group by variant.merchant_id, variant.product_id
      )
      select
        product.id as "productId",
        product.slug as "productSlug",
        product.name,
        product.short_description as "shortDescription",
        product.description,
        product.is_featured as "isFeatured",
        product.published_at as "publishedAt",
        merchant.id as "merchantId",
        merchant.slug as "merchantSlug",
        merchant.display_name as "merchantDisplayName",
        brand.id as "brandId",
        brand.name as "brandName",
        brand.slug as "brandSlug",
        brand.description as "brandDescription",
        rollup.min_price_centavos as "minPriceCentavos",
        rollup.max_price_centavos as "maxPriceCentavos",
        rollup.available_stock as "availableStock",
        case
          when rollup.available_stock <= 0 then 'OUT_OF_STOCK'
          when rollup.healthy_stock then 'IN_STOCK'
          else 'LOW_STOCK'
        end as "stockStatus",
        image.id as "imageId",
        image.alt_text as "imageAltText",
        image.storage_path as "imageStoragePath"
      from products product
      inner join merchants merchant on merchant.id = product.merchant_id
      inner join product_rollup rollup
        on rollup.merchant_id = product.merchant_id
        and rollup.product_id = product.id
      left join brands brand
        on brand.id = product.brand_id
        and brand.merchant_id = product.merchant_id
        and brand.is_active = true
        and brand.deleted_at is null
      left join product_images image
        on image.product_id = product.id
        and image.merchant_id = product.merchant_id
        and image.is_primary = true
        and image.status = 'CONFIRMED'
      where ${sql.join(conditions, sql` and `)}
      order by ${this.orderBy(sort)}
      limit ${limit + 1}
    `);
    const rows = result.rows;
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items = await Promise.all(pageRows.map((row) => this.productSummary(row)));
    const last = pageRows.at(-1);

    return {
      items,
      nextCursor:
        hasMore && last ? this.cursorService.encode(query, sort, this.cursorKey(last, sort)) : null,
    };
  }

  private productConditions(query: StorefrontProductListQueryDto, scope: ProductQueryScope): SQL[] {
    const conditions: SQL[] = [
      sql`product.status = 'ACTIVE'`,
      sql`product.published_at is not null`,
      sql`product.deleted_at is null`,
      sql`merchant.status = 'ACTIVE'`,
      sql`merchant.verification_status = 'VERIFIED'`,
      sql`merchant.deleted_at is null`,
    ];

    if (scope.productSlug) conditions.push(sql`product.slug = ${scope.productSlug}`);
    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(sql`(
        product.name ilike ${pattern}
        or coalesce(product.short_description, '') ilike ${pattern}
        or merchant.display_name ilike ${pattern}
        or coalesce(brand.name, '') ilike ${pattern}
      )`);
    }
    if (query.categorySlug) {
      conditions.push(sql`exists (
        select 1
        from product_categories product_category
        inner join categories category on category.id = product_category.category_id
        where product_category.merchant_id = product.merchant_id
          and product_category.product_id = product.id
          and category.slug = ${query.categorySlug}
          and category.is_active = true
          and category.deleted_at is null
      )`);
    }
    if (query.collectionSlug) {
      conditions.push(sql`exists (
        select 1
        from collection_products collection_product
        inner join collections collection
          on collection.id = collection_product.collection_id
          and collection.merchant_id = collection_product.merchant_id
        where collection_product.merchant_id = product.merchant_id
          and collection_product.product_id = product.id
          and collection.slug = ${query.collectionSlug}
          and collection.is_active = true
          and collection.deleted_at is null
          and (collection.starts_at is null or collection.starts_at <= now())
          and (collection.ends_at is null or collection.ends_at > now())
      )`);
    }
    if (query.brandId) {
      conditions.push(sql`product.brand_id = ${query.brandId} and brand.id is not null`);
    }
    if (query.merchantSlug) conditions.push(sql`merchant.slug = ${query.merchantSlug}`);
    if (query.featured !== undefined) {
      conditions.push(sql`product.is_featured = ${query.featured}`);
    }
    if (query.inStockOnly) conditions.push(sql`rollup.available_stock > 0`);
    if (query.minPriceCentavos !== undefined || query.maxPriceCentavos !== undefined) {
      const priceConditions: SQL[] = [
        sql`price_variant.merchant_id = product.merchant_id`,
        sql`price_variant.product_id = product.id`,
        sql`price_variant.is_active = true`,
        sql`price_variant.deleted_at is null`,
      ];

      if (query.minPriceCentavos !== undefined) {
        priceConditions.push(sql`price_variant.price_centavos >= ${query.minPriceCentavos}`);
      }
      if (query.maxPriceCentavos !== undefined) {
        priceConditions.push(sql`price_variant.price_centavos <= ${query.maxPriceCentavos}`);
      }
      conditions.push(sql`exists (
        select 1 from product_variants price_variant
        where ${sql.join(priceConditions, sql` and `)}
      )`);
    }
    return conditions;
  }

  private cursorCondition(sort: StorefrontSort, cursor: StorefrontCursorKey | null): SQL | null {
    if (!cursor) return null;

    if (sort === 'recommended') {
      return sql`(product.is_featured, product.published_at, product.id) < (${cursor.featured}, ${cursor.publishedAt}, ${cursor.id})`;
    }
    if (sort === 'latest') {
      return sql`(product.published_at, product.id) < (${cursor.publishedAt}, ${cursor.id})`;
    }
    if (sort === 'price_asc') {
      return sql`(rollup.min_price_centavos, product.id) > (${cursor.price}, ${cursor.id})`;
    }
    if (sort === 'price_desc') {
      return sql`(rollup.min_price_centavos, product.id) < (${cursor.price}, ${cursor.id})`;
    }
    return sql`(lower(product.name), product.id) > (${cursor.name}, ${cursor.id})`;
  }

  private orderBy(sort: StorefrontSort): SQL {
    if (sort === 'latest') return sql`product.published_at desc, product.id desc`;
    if (sort === 'price_asc') return sql`rollup.min_price_centavos asc, product.id asc`;
    if (sort === 'price_desc') return sql`rollup.min_price_centavos desc, product.id desc`;
    if (sort === 'name') return sql`lower(product.name) asc, product.id asc`;
    return sql`product.is_featured desc, product.published_at desc, product.id desc`;
  }

  private cursorKey(row: StorefrontProductRow, sort: StorefrontSort): StorefrontCursorKey {
    const base = { id: row.productId };

    if (sort === 'recommended') {
      return {
        ...base,
        featured: row.isFeatured,
        publishedAt: this.iso(row.publishedAt),
      };
    }
    if (sort === 'latest') return { ...base, publishedAt: this.iso(row.publishedAt) };
    if (sort === 'price_asc' || sort === 'price_desc') {
      return { ...base, price: Number(row.minPriceCentavos) };
    }
    return { ...base, name: row.name.toLowerCase() };
  }

  private async loadProductDetails(productSlug: string): Promise<StorefrontProductDetailsView> {
    const page = await this.loadProducts({ limit: 1, sort: 'latest' }, { productSlug });
    const summary = page.items[0];

    if (!summary) throw this.notFound('Product not found');

    const [categoryRows, collectionRows, optionRows, valueRows, variantRows, assignmentRows] =
      await Promise.all([
        this.databaseService.db
          .select({
            description: categories.description,
            id: categories.id,
            name: categories.name,
            parentId: categories.parentId,
            slug: categories.slug,
          })
          .from(productCategories)
          .innerJoin(categories, eq(categories.id, productCategories.categoryId))
          .where(
            and(
              eq(productCategories.merchantId, summary.merchant.id),
              eq(productCategories.productId, summary.productId),
              eq(categories.isActive, true),
              isNull(categories.deletedAt),
            ),
          )
          .orderBy(asc(productCategories.sortOrder), asc(categories.name)),
        this.loadProductCollections(summary.merchant.id, summary.productId),
        this.databaseService.db
          .select({ id: productOptions.id, name: productOptions.name })
          .from(productOptions)
          .where(
            and(
              eq(productOptions.merchantId, summary.merchant.id),
              eq(productOptions.productId, summary.productId),
            ),
          )
          .orderBy(asc(productOptions.displayOrder), asc(productOptions.id)),
        this.databaseService.db
          .select({
            displayLabel: productOptionValues.displayLabel,
            id: productOptionValues.id,
            optionId: productOptionValues.optionId,
            swatchHex: productOptionValues.swatchHex,
            value: productOptionValues.value,
          })
          .from(productOptionValues)
          .where(
            and(
              eq(productOptionValues.merchantId, summary.merchant.id),
              eq(productOptionValues.productId, summary.productId),
            ),
          )
          .orderBy(asc(productOptionValues.displayOrder), asc(productOptionValues.id)),
        this.loadVariants(summary.merchant.id, summary.productId),
        this.databaseService.db
          .select({
            optionValueId: variantOptionValues.optionValueId,
            variantId: variantOptionValues.variantId,
          })
          .from(variantOptionValues)
          .innerJoin(
            productVariants,
            and(
              eq(productVariants.id, variantOptionValues.variantId),
              eq(productVariants.merchantId, variantOptionValues.merchantId),
              eq(productVariants.productId, variantOptionValues.productId),
            ),
          )
          .where(
            and(
              eq(variantOptionValues.merchantId, summary.merchant.id),
              eq(variantOptionValues.productId, summary.productId),
              eq(productVariants.isActive, true),
              isNull(productVariants.deletedAt),
            ),
          ),
      ]);
    const valuesByOption = new Map<string, StorefrontOptionView['values']>();

    for (const value of valueRows) {
      valuesByOption.set(value.optionId, [
        ...(valuesByOption.get(value.optionId) ?? []),
        {
          displayLabel: value.displayLabel,
          id: value.id,
          swatchHex: value.swatchHex,
          value: value.value,
        },
      ]);
    }
    const assignments = new Map<string, string[]>();

    for (const assignment of assignmentRows) {
      assignments.set(assignment.variantId, [
        ...(assignments.get(assignment.variantId) ?? []),
        assignment.optionValueId,
      ]);
    }

    return {
      ...summary,
      categories: categoryRows,
      collections: collectionRows,
      description: await this.loadPublicDescription(summary.merchant.id, summary.productId),
      options: optionRows.map((option) => ({
        id: option.id,
        name: option.name,
        values: valuesByOption.get(option.id) ?? [],
      })),
      variants: variantRows.map((variant) => ({
        ...variant,
        optionValueIds: assignments.get(variant.id) ?? [],
      })),
    };
  }

  private async loadPublicDescription(
    merchantId: string,
    productId: string,
  ): Promise<string | null> {
    const result = await this.databaseService.db.execute<{ description: string | null }>(sql`
      select product.description
      from products product
      inner join merchants merchant on merchant.id = product.merchant_id
      where product.id = ${productId}
        and product.merchant_id = ${merchantId}
        and product.status = 'ACTIVE'
        and product.published_at is not null
        and product.deleted_at is null
        and merchant.status = 'ACTIVE'
        and merchant.verification_status = 'VERIFIED'
        and merchant.deleted_at is null
      limit 1
    `);
    return result.rows[0]?.description ?? null;
  }

  private async loadProductCollections(
    merchantId: string,
    productId: string,
  ): Promise<StorefrontCollectionView[]> {
    const result = await this.databaseService.db.execute<{
      description: string | null;
      endsAt: Date | string | null;
      id: string;
      merchantDisplayName: string;
      merchantId: string;
      merchantSlug: string;
      name: string;
      slug: string;
      startsAt: Date | string | null;
    }>(sql`
      select
        collection.id,
        collection.name,
        collection.slug,
        collection.description,
        collection.starts_at as "startsAt",
        collection.ends_at as "endsAt",
        merchant.id as "merchantId",
        merchant.slug as "merchantSlug",
        merchant.display_name as "merchantDisplayName"
      from collection_products collection_product
      inner join collections collection
        on collection.id = collection_product.collection_id
        and collection.merchant_id = collection_product.merchant_id
      inner join merchants merchant on merchant.id = collection.merchant_id
      where collection_product.merchant_id = ${merchantId}
        and collection_product.product_id = ${productId}
        and collection.is_active = true
        and collection.deleted_at is null
        and (collection.starts_at is null or collection.starts_at <= now())
        and (collection.ends_at is null or collection.ends_at > now())
        and merchant.status = 'ACTIVE'
        and merchant.verification_status = 'VERIFIED'
        and merchant.deleted_at is null
      order by collection.sort_order, collection.name, collection.id
    `);
    return result.rows.map((row) => this.collectionView(row));
  }

  private async loadVariants(
    merchantId: string,
    productId: string,
  ): Promise<Omit<StorefrontVariantView, 'optionValueIds'>[]> {
    const result = await this.databaseService.db.execute<StorefrontVariantRow>(sql`
      select
        variant.id,
        variant.name,
        variant.price_centavos as "priceCentavos",
        variant.compare_at_price_centavos as "compareAtPriceCentavos",
        variant.is_default as "isDefault",
        coalesce(
          sum(greatest(coalesce(balance.stock_on_hand, 0) - coalesce(balance.stock_reserved, 0), 0)),
          0
        )::integer as "availableStock",
        coalesce(
          bool_or(
            greatest(coalesce(balance.stock_on_hand, 0) - coalesce(balance.stock_reserved, 0), 0)
              > coalesce(balance.reorder_threshold, 0)
          ),
          false
        ) as "healthyStock"
      from product_variants variant
      left join inventory_balances balance
        on balance.merchant_id = variant.merchant_id
        and balance.variant_id = variant.id
        and exists (
          select 1
          from inventory_locations location
          where location.id = balance.location_id
            and location.merchant_id = balance.merchant_id
            and location.is_active = true
        )
      where variant.merchant_id = ${merchantId}
        and variant.product_id = ${productId}
        and variant.is_active = true
        and variant.deleted_at is null
      group by variant.id
      order by variant.is_default desc, variant.price_centavos, variant.id
    `);
    return result.rows.map((row) => ({
      compareAtPriceCentavos: row.compareAtPriceCentavos,
      id: row.id,
      isDefault: row.isDefault,
      name: row.name,
      priceCentavos: Number(row.priceCentavos),
      stockStatus: this.stockStatus(Number(row.availableStock), row.healthyStock),
    }));
  }

  private async loadCategories(
    query: StorefrontDirectoryQueryDto,
  ): Promise<{ items: StorefrontCategoryView[] }> {
    const conditions = [eq(categories.isActive, true), isNull(categories.deletedAt)];

    if (query.search) {
      conditions.push(
        or(
          ilike(categories.name, `%${query.search}%`),
          ilike(categories.slug, `%${query.search}%`),
        )!,
      );
    }
    const rows = await this.databaseService.db
      .select({
        description: categories.description,
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
        slug: categories.slug,
      })
      .from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.sortOrder), asc(categories.name), asc(categories.id))
      .limit(query.limit ?? 100);
    return { items: rows };
  }

  private async getPublicCategory(categorySlug: string): Promise<StorefrontCategoryView> {
    const [row] = await this.databaseService.db
      .select({
        description: categories.description,
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
        slug: categories.slug,
      })
      .from(categories)
      .where(
        and(
          eq(categories.slug, categorySlug),
          eq(categories.isActive, true),
          isNull(categories.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw this.notFound('Category not found');
    return row;
  }

  private async loadCollections(
    query: StorefrontMerchantDirectoryQueryDto,
  ): Promise<{ items: StorefrontCollectionView[] }> {
    const conditions: SQL[] = [
      sql`collection.is_active = true`,
      sql`collection.deleted_at is null`,
      sql`(collection.starts_at is null or collection.starts_at <= now())`,
      sql`(collection.ends_at is null or collection.ends_at > now())`,
      sql`merchant.status = 'ACTIVE'`,
      sql`merchant.verification_status = 'VERIFIED'`,
      sql`merchant.deleted_at is null`,
    ];

    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(sql`(collection.name ilike ${pattern} or collection.slug ilike ${pattern})`);
    }
    if (query.merchantSlug) conditions.push(sql`merchant.slug = ${query.merchantSlug}`);
    const result = await this.databaseService.db.execute<{
      description: string | null;
      endsAt: Date | string | null;
      id: string;
      merchantDisplayName: string;
      merchantId: string;
      merchantSlug: string;
      name: string;
      slug: string;
      startsAt: Date | string | null;
    }>(sql`
      select
        collection.id,
        collection.name,
        collection.slug,
        collection.description,
        collection.starts_at as "startsAt",
        collection.ends_at as "endsAt",
        merchant.id as "merchantId",
        merchant.slug as "merchantSlug",
        merchant.display_name as "merchantDisplayName"
      from collections collection
      inner join merchants merchant on merchant.id = collection.merchant_id
      where ${sql.join(conditions, sql` and `)}
      order by collection.sort_order, collection.name, collection.id
      limit ${query.limit ?? 100}
    `);
    return { items: result.rows.map((row) => this.collectionView(row)) };
  }

  private async getPublicCollection(collectionSlug: string): Promise<StorefrontCollectionView> {
    const queryResult = await this.databaseService.db.execute<{
      description: string | null;
      endsAt: Date | string | null;
      id: string;
      merchantDisplayName: string;
      merchantId: string;
      merchantSlug: string;
      name: string;
      slug: string;
      startsAt: Date | string | null;
    }>(sql`
      select
        collection.id,
        collection.name,
        collection.slug,
        collection.description,
        collection.starts_at as "startsAt",
        collection.ends_at as "endsAt",
        merchant.id as "merchantId",
        merchant.slug as "merchantSlug",
        merchant.display_name as "merchantDisplayName"
      from collections collection
      inner join merchants merchant on merchant.id = collection.merchant_id
      where collection.slug = ${collectionSlug}
        and collection.is_active = true
        and collection.deleted_at is null
        and (collection.starts_at is null or collection.starts_at <= now())
        and (collection.ends_at is null or collection.ends_at > now())
        and merchant.status = 'ACTIVE'
        and merchant.verification_status = 'VERIFIED'
        and merchant.deleted_at is null
      limit 1
    `);
    const row = queryResult.rows[0];

    if (!row) throw this.notFound('Collection not found');
    return this.collectionView(row);
  }

  private async loadBrands(
    query: StorefrontMerchantDirectoryQueryDto,
  ): Promise<{ items: StorefrontBrandView[] }> {
    const conditions: SQL[] = [
      sql`brand.is_active = true`,
      sql`brand.deleted_at is null`,
      sql`merchant.status = 'ACTIVE'`,
      sql`merchant.verification_status = 'VERIFIED'`,
      sql`merchant.deleted_at is null`,
    ];

    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(sql`(brand.name ilike ${pattern} or brand.slug ilike ${pattern})`);
    }
    if (query.merchantSlug) conditions.push(sql`merchant.slug = ${query.merchantSlug}`);
    const result = await this.databaseService.db.execute<{
      description: string | null;
      id: string;
      merchantDisplayName: string;
      merchantId: string;
      merchantSlug: string;
      name: string;
      slug: string;
    }>(sql`
      select
        brand.id,
        brand.name,
        brand.slug,
        brand.description,
        merchant.id as "merchantId",
        merchant.slug as "merchantSlug",
        merchant.display_name as "merchantDisplayName"
      from brands brand
      inner join merchants merchant on merchant.id = brand.merchant_id
      where ${sql.join(conditions, sql` and `)}
      order by brand.name, merchant.display_name, brand.id
      limit ${query.limit ?? 100}
    `);
    return {
      items: result.rows.map((row) => ({
        description: row.description,
        id: row.id,
        merchant: this.merchantSummary(row),
        name: row.name,
        slug: row.slug,
      })),
    };
  }

  private async loadMerchant(merchantSlug: string): Promise<StorefrontMerchantView> {
    const [row] = await this.databaseService.db
      .select({
        currency: merchants.currency,
        description: merchantProfiles.description,
        displayName: merchants.displayName,
        id: merchants.id,
        slug: merchants.slug,
        websiteUrl: merchantProfiles.websiteUrl,
      })
      .from(merchants)
      .leftJoin(merchantProfiles, eq(merchantProfiles.merchantId, merchants.id))
      .where(
        and(
          eq(merchants.slug, merchantSlug),
          eq(merchants.status, 'ACTIVE'),
          eq(merchants.verificationStatus, 'VERIFIED'),
          isNull(merchants.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw this.notFound('Merchant not found');
    return {
      currency: 'PHP',
      description: row.description,
      displayName: row.displayName,
      id: row.id,
      slug: row.slug,
      websiteUrl: row.websiteUrl,
    };
  }

  private async productSummary(row: StorefrontProductRow): Promise<StorefrontProductSummaryView> {
    const primaryImage = await this.signPrimaryImage(row);

    return {
      brand:
        row.brandId && row.brandName && row.brandSlug
          ? {
              description: row.brandDescription,
              id: row.brandId,
              name: row.brandName,
              slug: row.brandSlug,
            }
          : null,
      currency: 'PHP',
      isFeatured: row.isFeatured,
      maxPriceCentavos: Number(row.maxPriceCentavos),
      merchant: this.merchantSummary(row),
      minPriceCentavos: Number(row.minPriceCentavos),
      name: row.name,
      primaryImage,
      productId: row.productId,
      publishedAt: this.iso(row.publishedAt),
      shortDescription: row.shortDescription,
      slug: row.productSlug,
      stockStatus: row.stockStatus,
    };
  }

  private async signPrimaryImage(row: StorefrontProductRow): Promise<StorefrontImageView | null> {
    if (!row.imageId || !row.imageStoragePath) return null;

    try {
      const signed = await this.storageService.createSignedReadUrl(row.imageStoragePath);
      return {
        altText: row.imageAltText,
        expiresAt: signed.expiresAt,
        id: row.imageId,
        signedUrl: signed.signedUrl,
      };
    } catch (error) {
      if (error instanceof NotFoundException) return null;
      throw error;
    }
  }

  private collectionView(row: {
    description: string | null;
    endsAt: Date | string | null;
    id: string;
    merchantDisplayName: string;
    merchantId: string;
    merchantSlug: string;
    name: string;
    slug: string;
    startsAt: Date | string | null;
  }): StorefrontCollectionView {
    return {
      description: row.description,
      endsAt: row.endsAt ? this.iso(row.endsAt) : null,
      id: row.id,
      merchant: this.merchantSummary(row),
      name: row.name,
      slug: row.slug,
      startsAt: row.startsAt ? this.iso(row.startsAt) : null,
    };
  }

  private merchantSummary(row: {
    merchantDisplayName: string;
    merchantId: string;
    merchantSlug: string;
  }): StorefrontMerchantSummaryView {
    return {
      displayName: row.merchantDisplayName,
      id: row.merchantId,
      slug: row.merchantSlug,
    };
  }

  private stockStatus(available: number, healthy: boolean): StorefrontStockStatus {
    if (available <= 0) return 'OUT_OF_STOCK';
    return healthy ? 'IN_STOCK' : 'LOW_STOCK';
  }

  private assertPriceRange(query: StorefrontProductListQueryDto): void {
    if (
      query.minPriceCentavos !== undefined &&
      query.maxPriceCentavos !== undefined &&
      query.minPriceCentavos > query.maxPriceCentavos
    ) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: [
          {
            field: 'maxPriceCentavos',
            message: 'maxPriceCentavos must be greater than or equal to minPriceCentavos',
          },
        ],
      });
    }
  }

  private iso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  private notFound(message: string): NotFoundException {
    return new NotFoundException({
      message,
      errors: [{ field: 'resource', message }],
    });
  }
}
