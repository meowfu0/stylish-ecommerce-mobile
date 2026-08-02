import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';

import { DatabaseService } from '../../../database/database.service';
import {
  auditLogs,
  brands,
  categories,
  collectionProducts,
  collections,
  domainEvents,
  inventoryBalances,
  outboxMessages,
  productCategories,
  productOptions,
  productOptionValues,
  productVariants,
  products,
  variantOptionValues,
} from '../../../database/schema';
import { RedisOperationCoordinator } from '../../../infrastructure/redis/redis-operation-coordinator.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { RequestMetadata } from '../../auth/types/auth.types';
import { STOREFRONT_CATALOG_REVISION_KEY } from '../../storefront/storefront.constants';
import type {
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
} from '../dto/catalog-request.dto';
import type {
  BrandView,
  CategoryView,
  CollectionView,
  ProductDetailsView,
  ProductListView,
  ProductStatus,
  ProductSummaryView,
  StockStatus,
} from '../types/catalog.types';
import { CatalogPublicationPolicy } from './catalog-publication.policy';
import type { PublicationSnapshot } from './catalog-publication.policy';

type Transaction = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];
type ProductRow = typeof products.$inferSelect;
type IdempotencyContext = { databaseKey: string; fingerprint: string };
type EventInput = {
  action: string;
  actorUserId: string;
  aggregateId: string;
  aggregateType: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  eventType: string;
  idempotency: IdempotencyContext;
  merchantId: string;
  metadata: RequestMetadata;
  payload?: Record<string, unknown>;
};

@Injectable()
export class MerchantCatalogService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly operationCoordinator: RedisOperationCoordinator,
    private readonly publicationPolicy: CatalogPublicationPolicy,
    private readonly redisService: RedisService,
  ) {}

  async listBrands(
    merchantId: string,
    query: CatalogListQueryDto,
  ): Promise<{ items: BrandView[] }> {
    const conditions = [eq(brands.merchantId, merchantId), isNull(brands.deletedAt)];

    if (query.search) {
      conditions.push(
        or(ilike(brands.name, `%${query.search}%`), ilike(brands.slug, `%${query.search}%`))!,
      );
    }

    const rows = await this.databaseService.db
      .select()
      .from(brands)
      .where(and(...conditions))
      .orderBy(asc(brands.name), asc(brands.id))
      .limit(query.limit ?? 100);

    return { items: rows.map((row) => this.brandView(row)) };
  }

  async getBrand(merchantId: string, brandId: string): Promise<BrandView> {
    const [brand] = await this.databaseService.db
      .select()
      .from(brands)
      .where(
        and(eq(brands.id, brandId), eq(brands.merchantId, merchantId), isNull(brands.deletedAt)),
      )
      .limit(1);

    if (!brand) {
      throw this.notFound('Brand not found');
    }

    return this.brandView(brand);
  }

  async createBrand(
    actorUserId: string,
    merchantId: string,
    dto: CreateBrandDto,
    metadata: RequestMetadata,
  ): Promise<BrandView> {
    try {
      const brandId = await this.databaseService.db.transaction(async (tx) => {
        const [brand] = await tx
          .insert(brands)
          .values({
            createdByUserId: actorUserId,
            description: dto.description ?? null,
            isActive: dto.isActive ?? true,
            merchantId,
            name: dto.name,
            slug: dto.slug,
            updatedByUserId: actorUserId,
          })
          .returning({ id: brands.id });

        if (!brand) {
          throw new Error('Brand insert failed');
        }

        await this.recordEvent(tx, {
          action: 'catalog.brand.created',
          actorUserId,
          afterData: { name: dto.name, slug: dto.slug },
          aggregateId: brand.id,
          aggregateType: 'BRAND',
          eventType: 'catalog.brand.created',
          idempotency: this.serverIdempotency('brand.create', actorUserId, brand.id),
          merchantId,
          metadata,
        });
        return brand.id;
      });

      await this.invalidateCatalog(merchantId);
      return this.getBrand(merchantId, brandId);
    } catch (error) {
      this.rethrowCatalogConflict(error, 'slug', 'Brand name or slug is already in use');
    }
  }

  async updateBrand(
    actorUserId: string,
    merchantId: string,
    brandId: string,
    dto: UpdateBrandDto,
    metadata: RequestMetadata,
  ): Promise<BrandView> {
    this.assertNonemptyDto(dto);

    try {
      await this.databaseService.db.transaction(async (tx) => {
        const brand = await this.lockBrand(tx, merchantId, brandId);
        await tx
          .update(brands)
          .set({
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
            ...(dto.description !== undefined ? { description: dto.description || null } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            updatedAt: new Date(),
            updatedByUserId: actorUserId,
          })
          .where(eq(brands.id, brandId));
        await this.recordEvent(tx, {
          action: 'catalog.brand.updated',
          actorUserId,
          aggregateId: brandId,
          aggregateType: 'BRAND',
          beforeData: { name: brand.name, slug: brand.slug, isActive: brand.isActive },
          afterData: { fields: Object.keys(dto).sort() },
          eventType: 'catalog.brand.updated',
          idempotency: this.serverIdempotency('brand.update', actorUserId, brandId),
          merchantId,
          metadata,
        });
      });

      await this.invalidateCatalog(merchantId);
      return this.getBrand(merchantId, brandId);
    } catch (error) {
      this.rethrowCatalogConflict(error, 'slug', 'Brand name or slug is already in use');
    }
  }

  async listCategories(query: CategoryListQueryDto): Promise<{ items: CategoryView[] }> {
    const conditions = [isNull(categories.deletedAt)];

    if (query.activeOnly ?? true) {
      conditions.push(eq(categories.isActive, true));
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(categories.name, `%${query.search}%`),
          ilike(categories.slug, `%${query.search}%`),
        )!,
      );
    }

    const rows = await this.databaseService.db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.sortOrder), asc(categories.name), asc(categories.id))
      .limit(query.limit ?? 100);
    return { items: rows.map((row) => this.categoryView(row)) };
  }

  async getCategory(categoryId: string): Promise<CategoryView> {
    const [category] = await this.databaseService.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
      .limit(1);

    if (!category) {
      throw this.notFound('Category not found');
    }

    return this.categoryView(category);
  }

  async listCollections(
    merchantId: string,
    query: CatalogListQueryDto,
  ): Promise<{ items: CollectionView[] }> {
    const conditions = [eq(collections.merchantId, merchantId), isNull(collections.deletedAt)];

    if (query.search) {
      conditions.push(
        or(
          ilike(collections.name, `%${query.search}%`),
          ilike(collections.slug, `%${query.search}%`),
        )!,
      );
    }

    const rows = await this.databaseService.db
      .select()
      .from(collections)
      .where(and(...conditions))
      .orderBy(asc(collections.sortOrder), asc(collections.name), asc(collections.id))
      .limit(query.limit ?? 100);
    const productLinks = rows.length
      ? await this.databaseService.db
          .select()
          .from(collectionProducts)
          .where(
            and(
              eq(collectionProducts.merchantId, merchantId),
              inArray(
                collectionProducts.collectionId,
                rows.map((row) => row.id),
              ),
            ),
          )
      : [];
    const productIds = this.groupIds(productLinks, 'collectionId', 'productId');

    return {
      items: rows.map((row) => this.collectionView(row, productIds.get(row.id) ?? [])),
    };
  }

  async getCollection(merchantId: string, collectionId: string): Promise<CollectionView> {
    const [collection] = await this.databaseService.db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionId),
          eq(collections.merchantId, merchantId),
          isNull(collections.deletedAt),
        ),
      )
      .limit(1);

    if (!collection) {
      throw this.notFound('Collection not found');
    }

    const links = await this.databaseService.db
      .select({ productId: collectionProducts.productId })
      .from(collectionProducts)
      .where(
        and(
          eq(collectionProducts.merchantId, merchantId),
          eq(collectionProducts.collectionId, collectionId),
        ),
      )
      .orderBy(asc(collectionProducts.sortOrder), asc(collectionProducts.productId));
    return this.collectionView(
      collection,
      links.map((link) => link.productId),
    );
  }

  async createCollection(
    actorUserId: string,
    merchantId: string,
    dto: CreateCollectionDto,
    metadata: RequestMetadata,
  ): Promise<CollectionView> {
    this.assertCollectionWindow(dto.startsAt, dto.endsAt);

    try {
      const collectionId = await this.databaseService.db.transaction(async (tx) => {
        await this.assertProductsOwned(tx, merchantId, dto.productIds ?? []);
        const [collection] = await tx
          .insert(collections)
          .values({
            createdByUserId: actorUserId,
            description: dto.description ?? null,
            endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
            isActive: dto.isActive ?? true,
            merchantId,
            name: dto.name,
            slug: dto.slug,
            sortOrder: dto.sortOrder ?? 0,
            startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
            updatedByUserId: actorUserId,
          })
          .returning({ id: collections.id });

        if (!collection) {
          throw new Error('Collection insert failed');
        }
        await this.replaceCollectionProducts(tx, merchantId, collection.id, dto.productIds ?? []);
        await this.recordEvent(tx, {
          action: 'catalog.collection.created',
          actorUserId,
          aggregateId: collection.id,
          aggregateType: 'COLLECTION',
          afterData: { name: dto.name, productCount: dto.productIds?.length ?? 0 },
          eventType: 'catalog.collection.created',
          idempotency: this.serverIdempotency('collection.create', actorUserId, collection.id),
          merchantId,
          metadata,
        });
        return collection.id;
      });

      await this.invalidateCatalog(merchantId);
      return this.getCollection(merchantId, collectionId);
    } catch (error) {
      this.rethrowCatalogConflict(error, 'slug', 'Collection slug is already in use');
    }
  }

  async updateCollection(
    actorUserId: string,
    merchantId: string,
    collectionId: string,
    dto: UpdateCollectionDto,
    metadata: RequestMetadata,
  ): Promise<CollectionView> {
    this.assertNonemptyDto(dto);

    try {
      await this.databaseService.db.transaction(async (tx) => {
        const collection = await this.lockCollection(tx, merchantId, collectionId);
        const startsAt = dto.startsAt ? new Date(dto.startsAt) : collection.startsAt;
        const endsAt = dto.endsAt ? new Date(dto.endsAt) : collection.endsAt;
        this.assertCollectionWindow(startsAt?.toISOString(), endsAt?.toISOString());

        if (dto.productIds) {
          await this.assertProductsOwned(tx, merchantId, dto.productIds);
          await this.replaceCollectionProducts(tx, merchantId, collectionId, dto.productIds);
        }
        await tx
          .update(collections)
          .set({
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
            ...(dto.description !== undefined ? { description: dto.description || null } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            ...(dto.startsAt !== undefined ? { startsAt } : {}),
            ...(dto.endsAt !== undefined ? { endsAt } : {}),
            ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
            updatedAt: new Date(),
            updatedByUserId: actorUserId,
          })
          .where(eq(collections.id, collectionId));
        await this.recordEvent(tx, {
          action: 'catalog.collection.updated',
          actorUserId,
          aggregateId: collectionId,
          aggregateType: 'COLLECTION',
          afterData: { fields: Object.keys(dto).sort() },
          eventType: 'catalog.collection.updated',
          idempotency: this.serverIdempotency('collection.update', actorUserId, collectionId),
          merchantId,
          metadata,
        });
      });

      await this.invalidateCatalog(merchantId);
      return this.getCollection(merchantId, collectionId);
    } catch (error) {
      this.rethrowCatalogConflict(error, 'slug', 'Collection slug is already in use');
    }
  }

  async createProduct(
    actorUserId: string,
    merchantId: string,
    dto: CreateProductDto,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<ProductDetailsView> {
    const idempotency = this.idempotency(
      'product.create',
      actorUserId,
      merchantId,
      rawIdempotencyKey,
      dto,
    );
    const replay = await this.findReplay(idempotency);

    if (replay) {
      return this.getProduct(merchantId, replay.aggregateId);
    }

    return this.operationCoordinator.run(
      `catalog:create:${merchantId}:${idempotency.databaseKey}`,
      async () => {
        try {
          const productId = await this.databaseService.db.transaction(async (tx) => {
            const existing = await this.findEvent(tx, idempotency);

            if (existing) {
              return existing.aggregateId;
            }
            await this.assertBrandOwned(tx, merchantId, dto.brandId);
            await this.assertCategoriesExist(tx, dto.categoryIds ?? [], dto.primaryCategoryId);
            const [product] = await tx
              .insert(products)
              .values({
                brandId: dto.brandId ?? null,
                createdByUserId: actorUserId,
                description: dto.description ?? null,
                isFeatured: dto.isFeatured ?? false,
                merchantId,
                name: dto.name,
                shortDescription: dto.shortDescription ?? null,
                slug: dto.slug,
                status: 'DRAFT',
                updatedByUserId: actorUserId,
              })
              .returning({ id: products.id });

            if (!product) {
              throw new Error('Product insert failed');
            }
            await this.replaceProductCategories(
              tx,
              merchantId,
              product.id,
              dto.categoryIds ?? [],
              dto.primaryCategoryId,
            );
            await this.recordEvent(tx, {
              action: 'catalog.product.created',
              actorUserId,
              aggregateId: product.id,
              aggregateType: 'PRODUCT',
              afterData: { name: dto.name, status: 'DRAFT' },
              eventType: 'catalog.product.created',
              idempotency,
              merchantId,
              metadata,
              payload: { status: 'DRAFT' },
            });
            return product.id;
          });

          await this.invalidateCatalog(merchantId, productId);
          return this.getProduct(merchantId, productId);
        } catch (error) {
          const replayAfterConflict = await this.findReplay(idempotency);

          if (replayAfterConflict) {
            return this.getProduct(merchantId, replayAfterConflict.aggregateId);
          }
          this.rethrowCatalogConflict(error, 'slug', 'Product slug is already in use');
        }
      },
    );
  }

  async listProducts(merchantId: string, query: ProductListQueryDto): Promise<ProductListView> {
    const limit = query.limit ?? 25;
    const availableStock = this.productAvailableStockSql();
    const reorderThreshold = this.productReorderThresholdSql();
    const conditions = [eq(products.merchantId, merchantId), isNull(products.deletedAt)];

    if (query.search) {
      conditions.push(
        or(ilike(products.name, `%${query.search}%`), ilike(products.slug, `%${query.search}%`))!,
      );
    }
    if (query.status) {
      conditions.push(eq(products.status, query.status));
    }
    if (query.categoryId) {
      conditions.push(
        sql`exists (
          select 1 from product_categories pc
          where pc.merchant_id = ${merchantId}
            and pc.product_id = ${products.id}
            and pc.category_id = ${query.categoryId}
        )`,
      );
    }
    if (query.stockStatus === 'OUT_OF_STOCK') {
      conditions.push(sql`${availableStock} <= 0`);
    } else if (query.stockStatus === 'LOW_STOCK') {
      conditions.push(sql`${availableStock} > 0 and ${availableStock} <= ${reorderThreshold}`);
    } else if (query.stockStatus === 'IN_STOCK') {
      conditions.push(sql`${availableStock} > ${reorderThreshold}`);
    }
    if (query.cursor) {
      const cursor = this.decodeCursor(query.cursor);
      conditions.push(
        or(
          lt(products.updatedAt, cursor.updatedAt),
          and(eq(products.updatedAt, cursor.updatedAt), lt(products.id, cursor.id)),
        )!,
      );
    }

    const rows = await this.databaseService.db
      .select({
        availableStock,
        brandId: products.brandId,
        createdAt: products.createdAt,
        id: products.id,
        isFeatured: products.isFeatured,
        merchantId: products.merchantId,
        name: products.name,
        publishedAt: products.publishedAt,
        reorderThreshold,
        slug: products.slug,
        status: products.status,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.updatedAt), desc(products.id))
      .limit(limit + 1);
    const hasNext = rows.length > limit;
    const page = rows.slice(0, limit);
    const last = page.at(-1);

    return {
      items: page.map((row) =>
        this.productSummary(row, Number(row.availableStock), Number(row.reorderThreshold)),
      ),
      nextCursor:
        hasNext && last ? this.encodeCursor({ id: last.id, updatedAt: last.updatedAt }) : null,
    };
  }

  async getProduct(merchantId: string, productId: string): Promise<ProductDetailsView> {
    const [product] = await this.databaseService.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.merchantId, merchantId),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);

    if (!product) {
      throw this.notFound('Product not found');
    }

    const [categoryLinks, collectionLinks, optionRows, valueRows, variantRows] = await Promise.all([
      this.databaseService.db
        .select()
        .from(productCategories)
        .where(
          and(
            eq(productCategories.merchantId, merchantId),
            eq(productCategories.productId, productId),
          ),
        )
        .orderBy(desc(productCategories.isPrimary), asc(productCategories.sortOrder)),
      this.databaseService.db
        .select({ collectionId: collectionProducts.collectionId })
        .from(collectionProducts)
        .where(
          and(
            eq(collectionProducts.merchantId, merchantId),
            eq(collectionProducts.productId, productId),
          ),
        ),
      this.databaseService.db
        .select()
        .from(productOptions)
        .where(
          and(eq(productOptions.merchantId, merchantId), eq(productOptions.productId, productId)),
        )
        .orderBy(asc(productOptions.displayOrder), asc(productOptions.id)),
      this.databaseService.db
        .select()
        .from(productOptionValues)
        .where(
          and(
            eq(productOptionValues.merchantId, merchantId),
            eq(productOptionValues.productId, productId),
          ),
        )
        .orderBy(asc(productOptionValues.displayOrder), asc(productOptionValues.id)),
      this.databaseService.db
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.merchantId, merchantId),
            eq(productVariants.productId, productId),
            isNull(productVariants.deletedAt),
          ),
        )
        .orderBy(desc(productVariants.isDefault), asc(productVariants.createdAt)),
    ]);
    const variantIds = variantRows.map((variant) => variant.id);
    const [variantValues, balances] = variantIds.length
      ? await Promise.all([
          this.databaseService.db
            .select()
            .from(variantOptionValues)
            .where(
              and(
                eq(variantOptionValues.merchantId, merchantId),
                eq(variantOptionValues.productId, productId),
                inArray(variantOptionValues.variantId, variantIds),
              ),
            ),
          this.databaseService.db
            .select()
            .from(inventoryBalances)
            .where(
              and(
                eq(inventoryBalances.merchantId, merchantId),
                inArray(inventoryBalances.variantId, variantIds),
              ),
            ),
        ])
      : [[], []];
    const valueIds = this.groupIds(variantValues, 'variantId', 'optionValueId');
    const valuesByOption = new Map<string, typeof valueRows>();

    for (const value of valueRows) {
      valuesByOption.set(value.optionId, [...(valuesByOption.get(value.optionId) ?? []), value]);
    }
    const stockByVariant = new Map<string, { available: number; threshold: number }>();

    for (const balance of balances) {
      const current = stockByVariant.get(balance.variantId) ?? { available: 0, threshold: 0 };
      current.available += balance.stockOnHand - balance.stockReserved;
      current.threshold += balance.reorderThreshold;
      stockByVariant.set(balance.variantId, current);
    }
    const available = [...stockByVariant.values()].reduce((sum, value) => sum + value.available, 0);
    const threshold = [...stockByVariant.values()].reduce((sum, value) => sum + value.threshold, 0);

    return {
      ...this.productSummary(product, available, threshold),
      categoryIds: categoryLinks.map((link) => link.categoryId),
      collectionIds: collectionLinks.map((link) => link.collectionId),
      description: product.description,
      options: optionRows.map((option) => ({
        displayOrder: option.displayOrder,
        id: option.id,
        name: option.name,
        values: (valuesByOption.get(option.id) ?? []).map((value) => ({
          displayLabel: value.displayLabel,
          displayOrder: value.displayOrder,
          id: value.id,
          optionId: value.optionId,
          swatchHex: value.swatchHex,
          value: value.value,
        })),
      })),
      primaryCategoryId: categoryLinks.find((link) => link.isPrimary)?.categoryId ?? null,
      shortDescription: product.shortDescription,
      variants: variantRows.map((variant) => {
        const stock = stockByVariant.get(variant.id) ?? { available: 0, threshold: 0 };
        return {
          availableStock: stock.available,
          barcode: variant.barcode,
          compareAtPriceCentavos: variant.compareAtPriceCentavos,
          createdAt: variant.createdAt.toISOString(),
          id: variant.id,
          isActive: variant.isActive,
          isDefault: variant.isDefault,
          name: variant.name,
          optionValueIds: valueIds.get(variant.id) ?? [],
          priceCentavos: variant.priceCentavos,
          sku: variant.sku,
          stockStatus: this.stockStatus(stock.available, stock.threshold),
          updatedAt: variant.updatedAt.toISOString(),
        };
      }),
    };
  }

  async updateProduct(
    actorUserId: string,
    merchantId: string,
    productId: string,
    dto: UpdateProductDto,
    metadata: RequestMetadata,
  ): Promise<ProductDetailsView> {
    this.assertNonemptyDto(dto);

    try {
      await this.databaseService.db.transaction(async (tx) => {
        const product = await this.lockProduct(tx, merchantId, productId);

        if (product.status === 'ARCHIVED') {
          throw this.conflict('status', 'Archived products cannot be updated');
        }
        await this.assertBrandOwned(tx, merchantId, dto.brandId ?? undefined);

        if (dto.categoryIds) {
          await this.assertCategoriesExist(tx, dto.categoryIds, dto.primaryCategoryId ?? undefined);
          await this.replaceProductCategories(
            tx,
            merchantId,
            productId,
            dto.categoryIds,
            dto.primaryCategoryId ?? undefined,
          );
        } else if (dto.primaryCategoryId) {
          throw this.badRequest(
            'primaryCategoryId',
            'primaryCategoryId requires categoryIds in the same request',
          );
        }
        await tx
          .update(products)
          .set({
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
            ...(dto.brandId !== undefined ? { brandId: dto.brandId } : {}),
            ...(dto.shortDescription !== undefined
              ? { shortDescription: dto.shortDescription || null }
              : {}),
            ...(dto.description !== undefined ? { description: dto.description || null } : {}),
            ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
            updatedAt: new Date(),
            updatedByUserId: actorUserId,
          })
          .where(eq(products.id, productId));

        if (product.status === 'ACTIVE') {
          this.publicationPolicy.assertPublishable(
            await this.publicationSnapshot(tx, merchantId, productId),
          );
        }
        await this.recordEvent(tx, {
          action: 'catalog.product.updated',
          actorUserId,
          aggregateId: productId,
          aggregateType: 'PRODUCT',
          afterData: { fields: Object.keys(dto).sort() },
          beforeData: { status: product.status },
          eventType: 'catalog.product.updated',
          idempotency: this.serverIdempotency('product.update', actorUserId, productId),
          merchantId,
          metadata,
        });
      });

      await this.invalidateCatalog(merchantId, productId);
      return this.getProduct(merchantId, productId);
    } catch (error) {
      this.rethrowCatalogConflict(error, 'slug', 'Product slug is already in use');
    }
  }

  async createOption(
    actorUserId: string,
    merchantId: string,
    productId: string,
    dto: CreateProductOptionDto,
    metadata: RequestMetadata,
  ): Promise<ProductDetailsView> {
    try {
      await this.databaseService.db.transaction(async (tx) => {
        await this.assertStructuralEditAllowed(tx, merchantId, productId);
        const [option] = await tx
          .insert(productOptions)
          .values({
            displayOrder: dto.displayOrder ?? 0,
            merchantId,
            name: dto.name,
            productId,
          })
          .returning({ id: productOptions.id });

        if (!option) {
          throw new Error('Product option insert failed');
        }
        await this.recordCatalogChildEvent(
          tx,
          actorUserId,
          merchantId,
          productId,
          option.id,
          'OPTION',
          'catalog.product.option.created',
          metadata,
        );
      });
      await this.invalidateCatalog(merchantId, productId);
      return this.getProduct(merchantId, productId);
    } catch (error) {
      this.rethrowCatalogConflict(error, 'name', 'Product option name is already in use');
    }
  }

  async updateOption(
    actorUserId: string,
    merchantId: string,
    productId: string,
    optionId: string,
    dto: UpdateProductOptionDto,
    metadata: RequestMetadata,
  ): Promise<ProductDetailsView> {
    this.assertNonemptyDto(dto);
    try {
      await this.databaseService.db.transaction(async (tx) => {
        await this.assertStructuralEditAllowed(tx, merchantId, productId);
        await this.lockOption(tx, merchantId, productId, optionId);
        await tx
          .update(productOptions)
          .set({
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
            updatedAt: new Date(),
          })
          .where(eq(productOptions.id, optionId));
        await this.recordCatalogChildEvent(
          tx,
          actorUserId,
          merchantId,
          productId,
          optionId,
          'OPTION',
          'catalog.product.option.updated',
          metadata,
        );
      });
      await this.invalidateCatalog(merchantId, productId);
      return this.getProduct(merchantId, productId);
    } catch (error) {
      this.rethrowCatalogConflict(error, 'name', 'Product option name is already in use');
    }
  }

  async createOptionValue(
    actorUserId: string,
    merchantId: string,
    productId: string,
    optionId: string,
    dto: CreateProductOptionValueDto,
    metadata: RequestMetadata,
  ): Promise<ProductDetailsView> {
    try {
      await this.databaseService.db.transaction(async (tx) => {
        await this.assertStructuralEditAllowed(tx, merchantId, productId);
        await this.lockOption(tx, merchantId, productId, optionId);
        const [value] = await tx
          .insert(productOptionValues)
          .values({
            displayLabel: dto.displayLabel,
            displayOrder: dto.displayOrder ?? 0,
            merchantId,
            optionId,
            productId,
            swatchHex: dto.swatchHex ?? null,
            value: dto.value,
          })
          .returning({ id: productOptionValues.id });

        if (!value) {
          throw new Error('Product option value insert failed');
        }
        await this.recordCatalogChildEvent(
          tx,
          actorUserId,
          merchantId,
          productId,
          value.id,
          'OPTION_VALUE',
          'catalog.product.option-value.created',
          metadata,
        );
      });
      await this.invalidateCatalog(merchantId, productId);
      return this.getProduct(merchantId, productId);
    } catch (error) {
      this.rethrowCatalogConflict(error, 'value', 'Product option value is already in use');
    }
  }

  async updateOptionValue(
    actorUserId: string,
    merchantId: string,
    productId: string,
    optionId: string,
    valueId: string,
    dto: UpdateProductOptionValueDto,
    metadata: RequestMetadata,
  ): Promise<ProductDetailsView> {
    this.assertNonemptyDto(dto);
    try {
      await this.databaseService.db.transaction(async (tx) => {
        await this.assertStructuralEditAllowed(tx, merchantId, productId);
        await this.lockOptionValue(tx, merchantId, productId, optionId, valueId);
        await tx
          .update(productOptionValues)
          .set({
            ...(dto.value !== undefined ? { value: dto.value } : {}),
            ...(dto.displayLabel !== undefined ? { displayLabel: dto.displayLabel } : {}),
            ...(dto.swatchHex !== undefined ? { swatchHex: dto.swatchHex } : {}),
            ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
            updatedAt: new Date(),
          })
          .where(eq(productOptionValues.id, valueId));
        await this.recordCatalogChildEvent(
          tx,
          actorUserId,
          merchantId,
          productId,
          valueId,
          'OPTION_VALUE',
          'catalog.product.option-value.updated',
          metadata,
        );
      });
      await this.invalidateCatalog(merchantId, productId);
      return this.getProduct(merchantId, productId);
    } catch (error) {
      this.rethrowCatalogConflict(error, 'value', 'Product option value is already in use');
    }
  }

  async createVariant(
    actorUserId: string,
    merchantId: string,
    productId: string,
    dto: CreateProductVariantDto,
    metadata: RequestMetadata,
  ): Promise<ProductDetailsView> {
    this.assertVariantPricing(dto.priceCentavos, dto.compareAtPriceCentavos);

    try {
      await this.databaseService.db.transaction(async (tx) => {
        await this.assertStructuralEditAllowed(tx, merchantId, productId);
        const assignments = await this.resolveVariantAssignments(
          tx,
          merchantId,
          productId,
          dto.optionValueIds ?? [],
        );
        const [existingVariant] = await tx
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.merchantId, merchantId),
              eq(productVariants.productId, productId),
              isNull(productVariants.deletedAt),
            ),
          )
          .limit(1);
        const isDefault = dto.isDefault ?? !existingVariant;

        if (isDefault) {
          await tx
            .update(productVariants)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(
              and(
                eq(productVariants.merchantId, merchantId),
                eq(productVariants.productId, productId),
              ),
            );
        }
        const [variant] = await tx
          .insert(productVariants)
          .values({
            barcode: dto.barcode ?? null,
            compareAtPriceCentavos: dto.compareAtPriceCentavos ?? null,
            createdByUserId: actorUserId,
            isActive: dto.isActive ?? true,
            isDefault,
            merchantId,
            name: dto.name,
            optionSignature: this.optionSignature(assignments),
            priceCentavos: dto.priceCentavos,
            productId,
            sku: dto.sku,
            updatedByUserId: actorUserId,
          })
          .returning({ id: productVariants.id });

        if (!variant) {
          throw new Error('Product variant insert failed');
        }
        await this.replaceVariantAssignments(tx, merchantId, productId, variant.id, assignments);
        await this.recordCatalogChildEvent(
          tx,
          actorUserId,
          merchantId,
          productId,
          variant.id,
          'VARIANT',
          'catalog.product.variant.created',
          metadata,
        );
      });
      await this.invalidateCatalog(merchantId, productId);
      return this.getProduct(merchantId, productId);
    } catch (error) {
      this.rethrowCatalogConflict(
        error,
        'sku',
        'Variant SKU, barcode, or option combination exists',
      );
    }
  }

  async updateVariant(
    actorUserId: string,
    merchantId: string,
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
    metadata: RequestMetadata,
  ): Promise<ProductDetailsView> {
    this.assertNonemptyDto(dto);

    try {
      await this.databaseService.db.transaction(async (tx) => {
        const product = await this.lockProduct(tx, merchantId, productId);
        const variant = await this.lockVariant(tx, merchantId, productId, variantId);

        if (product.status === 'ARCHIVED') {
          throw this.conflict('status', 'Archived products cannot be updated');
        }
        if (
          product.status === 'ACTIVE' &&
          (dto.optionValueIds !== undefined ||
            dto.isActive !== undefined ||
            dto.isDefault !== undefined)
        ) {
          throw this.conflict(
            'status',
            'Deactivate the product before changing variant structure or availability',
          );
        }
        const assignments =
          dto.optionValueIds !== undefined
            ? await this.resolveVariantAssignments(tx, merchantId, productId, dto.optionValueIds)
            : null;
        const nextActive = dto.isActive ?? variant.isActive;
        const nextDefault = nextActive ? (dto.isDefault ?? variant.isDefault) : false;
        this.assertVariantPricing(
          dto.priceCentavos ?? variant.priceCentavos,
          dto.compareAtPriceCentavos ?? variant.compareAtPriceCentavos,
        );

        if (nextDefault) {
          await tx
            .update(productVariants)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(
              and(
                eq(productVariants.merchantId, merchantId),
                eq(productVariants.productId, productId),
              ),
            );
        }
        await tx
          .update(productVariants)
          .set({
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
            ...(dto.barcode !== undefined ? { barcode: dto.barcode } : {}),
            ...(dto.priceCentavos !== undefined ? { priceCentavos: dto.priceCentavos } : {}),
            ...(dto.compareAtPriceCentavos !== undefined
              ? { compareAtPriceCentavos: dto.compareAtPriceCentavos }
              : {}),
            ...(assignments ? { optionSignature: this.optionSignature(assignments) } : {}),
            isActive: nextActive,
            isDefault: nextDefault,
            updatedAt: new Date(),
            updatedByUserId: actorUserId,
          })
          .where(eq(productVariants.id, variantId));

        if (assignments) {
          await this.replaceVariantAssignments(tx, merchantId, productId, variantId, assignments);
        }
        if (product.status === 'ACTIVE') {
          this.publicationPolicy.assertPublishable(
            await this.publicationSnapshot(tx, merchantId, productId),
          );
        }
        await this.recordCatalogChildEvent(
          tx,
          actorUserId,
          merchantId,
          productId,
          variantId,
          'VARIANT',
          'catalog.product.variant.updated',
          metadata,
        );
      });
      await this.invalidateCatalog(merchantId, productId);
      return this.getProduct(merchantId, productId);
    } catch (error) {
      this.rethrowCatalogConflict(
        error,
        'sku',
        'Variant SKU, barcode, or option combination exists',
      );
    }
  }

  publishProduct(
    actorUserId: string,
    merchantId: string,
    productId: string,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<ProductDetailsView> {
    return this.changeProductStatus(
      actorUserId,
      merchantId,
      productId,
      'ACTIVE',
      rawIdempotencyKey,
      metadata,
    );
  }

  deactivateProduct(
    actorUserId: string,
    merchantId: string,
    productId: string,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<ProductDetailsView> {
    return this.changeProductStatus(
      actorUserId,
      merchantId,
      productId,
      'INACTIVE',
      rawIdempotencyKey,
      metadata,
    );
  }

  archiveProduct(
    actorUserId: string,
    merchantId: string,
    productId: string,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<ProductDetailsView> {
    return this.changeProductStatus(
      actorUserId,
      merchantId,
      productId,
      'ARCHIVED',
      rawIdempotencyKey,
      metadata,
    );
  }

  private async changeProductStatus(
    actorUserId: string,
    merchantId: string,
    productId: string,
    targetStatus: Exclude<ProductStatus, 'DRAFT'>,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<ProductDetailsView> {
    const action = `product.${targetStatus.toLowerCase()}`;
    const idempotency = this.idempotency(action, actorUserId, productId, rawIdempotencyKey, {});
    const replay = await this.findReplay(idempotency);

    if (replay) {
      return this.getProduct(merchantId, replay.aggregateId);
    }

    return this.operationCoordinator.run(
      `catalog:lifecycle:${productId}:${idempotency.databaseKey}`,
      async () => {
        try {
          await this.databaseService.db.transaction(async (tx) => {
            const product = await this.lockProduct(tx, merchantId, productId);
            const existing = await this.findEvent(tx, idempotency);

            if (existing) {
              return;
            }
            this.assertLifecycleTransition(product.status, targetStatus);

            if (targetStatus === 'ACTIVE') {
              this.publicationPolicy.assertPublishable(
                await this.publicationSnapshot(tx, merchantId, productId),
              );
            }
            const now = new Date();
            await tx
              .update(products)
              .set({
                publishedAt:
                  targetStatus === 'ACTIVE' ? (product.publishedAt ?? now) : product.publishedAt,
                status: targetStatus,
                updatedAt: now,
                updatedByUserId: actorUserId,
              })
              .where(eq(products.id, productId));
            await this.recordEvent(tx, {
              action: `catalog.product.${targetStatus.toLowerCase()}`,
              actorUserId,
              aggregateId: productId,
              aggregateType: 'PRODUCT',
              afterData: { status: targetStatus },
              beforeData: { status: product.status },
              eventType: `catalog.product.${targetStatus.toLowerCase()}`,
              idempotency,
              merchantId,
              metadata,
              payload: { previousStatus: product.status, status: targetStatus },
            });
          });
          await this.invalidateCatalog(merchantId, productId);
          return this.getProduct(merchantId, productId);
        } catch (error) {
          const replayAfterConflict = await this.findReplay(idempotency);

          if (replayAfterConflict) {
            return this.getProduct(merchantId, replayAfterConflict.aggregateId);
          }
          throw error;
        }
      },
    );
  }

  private assertLifecycleTransition(current: ProductStatus, target: ProductStatus): void {
    if (current === target) {
      return;
    }
    const allowed =
      (target === 'ACTIVE' && ['DRAFT', 'INACTIVE'].includes(current)) ||
      (target === 'INACTIVE' && current === 'ACTIVE') ||
      (target === 'ARCHIVED' && ['DRAFT', 'INACTIVE'].includes(current));

    if (!allowed) {
      throw this.conflict('status', `Product cannot transition from ${current} to ${target}`);
    }
  }

  private async publicationSnapshot(
    tx: Transaction,
    merchantId: string,
    productId: string,
  ): Promise<PublicationSnapshot> {
    const [product] = await tx
      .select({ description: products.description })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.merchantId, merchantId)))
      .limit(1);
    const categoryRows = await tx
      .select({ id: productCategories.categoryId })
      .from(productCategories)
      .where(
        and(
          eq(productCategories.merchantId, merchantId),
          eq(productCategories.productId, productId),
        ),
      );
    const optionRows = await tx
      .select({ id: productOptions.id })
      .from(productOptions)
      .where(
        and(eq(productOptions.merchantId, merchantId), eq(productOptions.productId, productId)),
      );
    const valueRows = await tx
      .select({ id: productOptionValues.id, optionId: productOptionValues.optionId })
      .from(productOptionValues)
      .where(
        and(
          eq(productOptionValues.merchantId, merchantId),
          eq(productOptionValues.productId, productId),
        ),
      );
    const variantRows = await tx
      .select({
        id: productVariants.id,
        isActive: productVariants.isActive,
        isDefault: productVariants.isDefault,
        priceCentavos: productVariants.priceCentavos,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.merchantId, merchantId),
          eq(productVariants.productId, productId),
          isNull(productVariants.deletedAt),
        ),
      );
    const assignments = variantRows.length
      ? await tx
          .select({
            optionId: variantOptionValues.optionId,
            variantId: variantOptionValues.variantId,
          })
          .from(variantOptionValues)
          .where(
            and(
              eq(variantOptionValues.merchantId, merchantId),
              eq(variantOptionValues.productId, productId),
              inArray(
                variantOptionValues.variantId,
                variantRows.map((variant) => variant.id),
              ),
            ),
          )
      : [];
    const assignmentGroups = this.groupIds(assignments, 'variantId', 'optionId');

    return {
      categoryCount: categoryRows.length,
      description: product?.description ?? null,
      options: optionRows.map((option) => ({
        id: option.id,
        valueCount: valueRows.filter((value) => value.optionId === option.id).length,
      })),
      variants: variantRows.map((variant) => ({
        ...variant,
        optionIds: assignmentGroups.get(variant.id) ?? [],
      })),
    };
  }

  private async assertStructuralEditAllowed(
    tx: Transaction,
    merchantId: string,
    productId: string,
  ): Promise<void> {
    const product = await this.lockProduct(tx, merchantId, productId);

    if (!['DRAFT', 'INACTIVE'].includes(product.status)) {
      throw this.conflict('status', 'Deactivate the product before changing catalog structure');
    }
  }

  private async assertBrandOwned(
    tx: Transaction,
    merchantId: string,
    brandId: string | undefined,
  ): Promise<void> {
    if (!brandId) {
      return;
    }
    const [brand] = await tx
      .select({ id: brands.id })
      .from(brands)
      .where(
        and(eq(brands.id, brandId), eq(brands.merchantId, merchantId), isNull(brands.deletedAt)),
      )
      .limit(1);

    if (!brand) {
      throw this.badRequest('brandId', 'Brand does not belong to this merchant');
    }
  }

  private async assertCategoriesExist(
    tx: Transaction,
    categoryIds: string[],
    primaryCategoryId: string | undefined,
  ): Promise<void> {
    if (primaryCategoryId && !categoryIds.includes(primaryCategoryId)) {
      throw this.badRequest(
        'primaryCategoryId',
        'Primary category must be included in categoryIds',
      );
    }
    if (categoryIds.length === 0) {
      return;
    }
    const rows = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          inArray(categories.id, categoryIds),
          eq(categories.isActive, true),
          isNull(categories.deletedAt),
        ),
      );

    if (rows.length !== categoryIds.length) {
      throw this.badRequest('categoryIds', 'One or more categories are unavailable');
    }
  }

  private async assertProductsOwned(
    tx: Transaction,
    merchantId: string,
    productIds: string[],
  ): Promise<void> {
    if (productIds.length === 0) {
      return;
    }
    const rows = await tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.merchantId, merchantId),
          inArray(products.id, productIds),
          isNull(products.deletedAt),
        ),
      );

    if (rows.length !== productIds.length) {
      throw this.badRequest('productIds', 'One or more products do not belong to this merchant');
    }
  }

  private async resolveVariantAssignments(
    tx: Transaction,
    merchantId: string,
    productId: string,
    optionValueIds: string[],
  ): Promise<Array<{ optionId: string; optionValueId: string }>> {
    const options = await tx
      .select({ id: productOptions.id })
      .from(productOptions)
      .where(
        and(eq(productOptions.merchantId, merchantId), eq(productOptions.productId, productId)),
      );

    if (optionValueIds.length !== options.length) {
      throw this.badRequest('optionValueIds', 'Select exactly one value for every product option');
    }
    if (optionValueIds.length === 0) {
      return [];
    }
    const values = await tx
      .select({ id: productOptionValues.id, optionId: productOptionValues.optionId })
      .from(productOptionValues)
      .where(
        and(
          eq(productOptionValues.merchantId, merchantId),
          eq(productOptionValues.productId, productId),
          inArray(productOptionValues.id, optionValueIds),
        ),
      );
    const distinctOptionIds = new Set(values.map((value) => value.optionId));

    if (values.length !== optionValueIds.length || distinctOptionIds.size !== options.length) {
      throw this.badRequest(
        'optionValueIds',
        'Option values must belong to this product with one value per option',
      );
    }
    return values.map((value) => ({ optionId: value.optionId, optionValueId: value.id }));
  }

  private async replaceProductCategories(
    tx: Transaction,
    merchantId: string,
    productId: string,
    categoryIds: string[],
    primaryCategoryId?: string,
  ): Promise<void> {
    await tx
      .delete(productCategories)
      .where(
        and(
          eq(productCategories.merchantId, merchantId),
          eq(productCategories.productId, productId),
        ),
      );

    if (categoryIds.length) {
      await tx.insert(productCategories).values(
        categoryIds.map((categoryId, sortOrder) => ({
          categoryId,
          isPrimary: categoryId === (primaryCategoryId ?? categoryIds[0]),
          merchantId,
          productId,
          sortOrder,
        })),
      );
    }
  }

  private async replaceCollectionProducts(
    tx: Transaction,
    merchantId: string,
    collectionId: string,
    productIds: string[],
  ): Promise<void> {
    await tx
      .delete(collectionProducts)
      .where(
        and(
          eq(collectionProducts.merchantId, merchantId),
          eq(collectionProducts.collectionId, collectionId),
        ),
      );

    if (productIds.length) {
      await tx.insert(collectionProducts).values(
        productIds.map((productId, sortOrder) => ({
          collectionId,
          merchantId,
          productId,
          sortOrder,
        })),
      );
    }
  }

  private async replaceVariantAssignments(
    tx: Transaction,
    merchantId: string,
    productId: string,
    variantId: string,
    assignments: Array<{ optionId: string; optionValueId: string }>,
  ): Promise<void> {
    await tx
      .delete(variantOptionValues)
      .where(
        and(
          eq(variantOptionValues.merchantId, merchantId),
          eq(variantOptionValues.productId, productId),
          eq(variantOptionValues.variantId, variantId),
        ),
      );

    if (assignments.length) {
      await tx.insert(variantOptionValues).values(
        assignments.map((assignment) => ({
          ...assignment,
          merchantId,
          productId,
          variantId,
        })),
      );
    }
  }

  private lockProduct(
    tx: Transaction,
    merchantId: string,
    productId: string,
  ): Promise<typeof products.$inferSelect> {
    return tx
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.merchantId, merchantId),
          isNull(products.deletedAt),
        ),
      )
      .for('update')
      .limit(1)
      .then(([product]) => {
        if (!product) {
          throw this.notFound('Product not found');
        }
        return product;
      });
  }

  private lockBrand(
    tx: Transaction,
    merchantId: string,
    brandId: string,
  ): Promise<typeof brands.$inferSelect> {
    return tx
      .select()
      .from(brands)
      .where(
        and(eq(brands.id, brandId), eq(brands.merchantId, merchantId), isNull(brands.deletedAt)),
      )
      .for('update')
      .limit(1)
      .then(([brand]) => {
        if (!brand) {
          throw this.notFound('Brand not found');
        }
        return brand;
      });
  }

  private lockCollection(
    tx: Transaction,
    merchantId: string,
    collectionId: string,
  ): Promise<typeof collections.$inferSelect> {
    return tx
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionId),
          eq(collections.merchantId, merchantId),
          isNull(collections.deletedAt),
        ),
      )
      .for('update')
      .limit(1)
      .then(([collection]) => {
        if (!collection) {
          throw this.notFound('Collection not found');
        }
        return collection;
      });
  }

  private lockOption(
    tx: Transaction,
    merchantId: string,
    productId: string,
    optionId: string,
  ): Promise<typeof productOptions.$inferSelect> {
    return tx
      .select()
      .from(productOptions)
      .where(
        and(
          eq(productOptions.id, optionId),
          eq(productOptions.productId, productId),
          eq(productOptions.merchantId, merchantId),
        ),
      )
      .for('update')
      .limit(1)
      .then(([option]) => {
        if (!option) {
          throw this.notFound('Product option not found');
        }
        return option;
      });
  }

  private lockOptionValue(
    tx: Transaction,
    merchantId: string,
    productId: string,
    optionId: string,
    valueId: string,
  ): Promise<typeof productOptionValues.$inferSelect> {
    return tx
      .select()
      .from(productOptionValues)
      .where(
        and(
          eq(productOptionValues.id, valueId),
          eq(productOptionValues.optionId, optionId),
          eq(productOptionValues.productId, productId),
          eq(productOptionValues.merchantId, merchantId),
        ),
      )
      .for('update')
      .limit(1)
      .then(([value]) => {
        if (!value) {
          throw this.notFound('Product option value not found');
        }
        return value;
      });
  }

  private lockVariant(
    tx: Transaction,
    merchantId: string,
    productId: string,
    variantId: string,
  ): Promise<typeof productVariants.$inferSelect> {
    return tx
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.productId, productId),
          eq(productVariants.merchantId, merchantId),
          isNull(productVariants.deletedAt),
        ),
      )
      .for('update')
      .limit(1)
      .then(([variant]) => {
        if (!variant) {
          throw this.notFound('Product variant not found');
        }
        return variant;
      });
  }

  private async recordCatalogChildEvent(
    tx: Transaction,
    actorUserId: string,
    merchantId: string,
    productId: string,
    entityId: string,
    entityType: string,
    eventType: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    await this.recordEvent(tx, {
      action: eventType,
      actorUserId,
      aggregateId: productId,
      aggregateType: 'PRODUCT',
      afterData: { entityId, entityType },
      eventType,
      idempotency: this.serverIdempotency(eventType, actorUserId, entityId),
      merchantId,
      metadata,
      payload: { entityId, entityType },
    });
  }

  private async recordEvent(tx: Transaction, input: EventInput): Promise<void> {
    await tx.insert(auditLogs).values({
      action: input.action,
      actorUserId: input.actorUserId,
      afterData: input.afterData,
      beforeData: input.beforeData,
      correlationId: input.metadata.correlationId,
      entityId: input.aggregateId,
      entityType: input.aggregateType,
      ipAddress: input.metadata.ipAddress,
      merchantId: input.merchantId,
      metadata: { outcome: 'SUCCESS' },
      requestId: input.metadata.requestId,
      userAgent: input.metadata.userAgent,
    });
    const [event] = await tx
      .insert(domainEvents)
      .values({
        aggregateId: input.aggregateId,
        aggregateType: input.aggregateType,
        eventType: input.eventType,
        idempotencyKey: input.idempotency.databaseKey,
        merchantId: input.merchantId,
        payload: {
          ...input.payload,
          actorUserId: input.actorUserId,
          requestFingerprint: input.idempotency.fingerprint,
        },
      })
      .returning({ id: domainEvents.id });

    if (!event) {
      throw new Error('Catalog domain event insert failed');
    }
    await tx.insert(outboxMessages).values({
      domainEventId: event.id,
      idempotencyKey: `outbox:${event.id}`,
      topic: input.eventType,
    });
  }

  private idempotency(
    action: string,
    actorUserId: string,
    resourceId: string,
    rawKey: string | undefined,
    request: unknown,
  ): IdempotencyContext {
    const key = rawKey?.trim();

    if (!key || key.length < 8 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
      throw this.badRequest(
        'idempotency-key',
        'Idempotency-Key must contain 8-128 safe characters',
      );
    }
    return {
      databaseKey: `merchant-catalog:${this.hash(`${action}:${actorUserId}:${resourceId}:${key}`)}`,
      fingerprint: this.hash(this.stableStringify(request)),
    };
  }

  private serverIdempotency(
    action: string,
    actorUserId: string,
    resourceId: string,
  ): IdempotencyContext {
    return {
      databaseKey: `merchant-catalog:${this.hash(`${action}:${actorUserId}:${resourceId}:${randomUUID()}`)}`,
      fingerprint: this.hash('{}'),
    };
  }

  private async findReplay(
    idempotency: IdempotencyContext,
  ): Promise<{ aggregateId: string } | null> {
    const [event] = await this.databaseService.db
      .select({ aggregateId: domainEvents.aggregateId, payload: domainEvents.payload })
      .from(domainEvents)
      .where(eq(domainEvents.idempotencyKey, idempotency.databaseKey))
      .limit(1);

    if (!event) {
      return null;
    }
    this.assertFingerprint(event.payload, idempotency);
    return { aggregateId: event.aggregateId };
  }

  private async findEvent(
    tx: Transaction,
    idempotency: IdempotencyContext,
  ): Promise<{ aggregateId: string } | null> {
    const [event] = await tx
      .select({ aggregateId: domainEvents.aggregateId, payload: domainEvents.payload })
      .from(domainEvents)
      .where(eq(domainEvents.idempotencyKey, idempotency.databaseKey))
      .limit(1);

    if (!event) {
      return null;
    }
    this.assertFingerprint(event.payload, idempotency);
    return { aggregateId: event.aggregateId };
  }

  private assertFingerprint(
    payload: Record<string, unknown>,
    idempotency: IdempotencyContext,
  ): void {
    if (payload.requestFingerprint !== idempotency.fingerprint) {
      throw this.conflict(
        'idempotency-key',
        'Idempotency-Key was already used with a different request',
      );
    }
  }

  private productAvailableStockSql(): SQL<number> {
    return sql<number>`(
      select coalesce(sum(ib.stock_on_hand - ib.stock_reserved), 0)::integer
      from product_variants pv
      left join inventory_balances ib
        on ib.merchant_id = pv.merchant_id and ib.variant_id = pv.id
      where pv.merchant_id = ${products.merchantId}
        and pv.product_id = ${products.id}
        and pv.is_active = true
        and pv.deleted_at is null
    )`;
  }

  private productReorderThresholdSql(): SQL<number> {
    return sql<number>`(
      select coalesce(sum(ib.reorder_threshold), 0)::integer
      from product_variants pv
      left join inventory_balances ib
        on ib.merchant_id = pv.merchant_id and ib.variant_id = pv.id
      where pv.merchant_id = ${products.merchantId}
        and pv.product_id = ${products.id}
        and pv.is_active = true
        and pv.deleted_at is null
    )`;
  }

  private productSummary(
    product: Pick<
      ProductRow,
      | 'id'
      | 'merchantId'
      | 'brandId'
      | 'name'
      | 'slug'
      | 'status'
      | 'isFeatured'
      | 'publishedAt'
      | 'createdAt'
      | 'updatedAt'
    >,
    availableStock: number,
    reorderThreshold: number,
  ): ProductSummaryView {
    return {
      availableStock,
      brandId: product.brandId,
      createdAt: product.createdAt.toISOString(),
      id: product.id,
      isFeatured: product.isFeatured,
      merchantId: product.merchantId,
      name: product.name,
      publishedAt: product.publishedAt?.toISOString() ?? null,
      slug: product.slug,
      status: product.status,
      stockStatus: this.stockStatus(availableStock, reorderThreshold),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private stockStatus(available: number, threshold: number): StockStatus {
    if (available <= 0) {
      return 'OUT_OF_STOCK';
    }
    return available <= threshold ? 'LOW_STOCK' : 'IN_STOCK';
  }

  private brandView(brand: typeof brands.$inferSelect): BrandView {
    return {
      createdAt: brand.createdAt.toISOString(),
      description: brand.description,
      id: brand.id,
      isActive: brand.isActive,
      merchantId: brand.merchantId,
      name: brand.name,
      slug: brand.slug,
      updatedAt: brand.updatedAt.toISOString(),
    };
  }

  private categoryView(category: typeof categories.$inferSelect): CategoryView {
    return {
      description: category.description,
      id: category.id,
      isActive: category.isActive,
      name: category.name,
      parentId: category.parentId,
      slug: category.slug,
      sortOrder: category.sortOrder,
    };
  }

  private collectionView(
    collection: typeof collections.$inferSelect,
    productIds: string[],
  ): CollectionView {
    return {
      createdAt: collection.createdAt.toISOString(),
      description: collection.description,
      endsAt: collection.endsAt?.toISOString() ?? null,
      id: collection.id,
      isActive: collection.isActive,
      merchantId: collection.merchantId,
      name: collection.name,
      productIds,
      slug: collection.slug,
      sortOrder: collection.sortOrder,
      startsAt: collection.startsAt?.toISOString() ?? null,
      updatedAt: collection.updatedAt.toISOString(),
    };
  }

  private optionSignature(assignments: Array<{ optionId: string; optionValueId: string }>): string {
    return assignments.length
      ? [...assignments]
          .sort((left, right) => left.optionId.localeCompare(right.optionId))
          .map((assignment) => `${assignment.optionId}:${assignment.optionValueId}`)
          .join('|')
      : 'default';
  }

  private groupIds<
    T extends Record<GroupKey | ValueKey, string>,
    GroupKey extends keyof T,
    ValueKey extends keyof T,
  >(rows: T[], groupKey: GroupKey, valueKey: ValueKey): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const row of rows) {
      const key = row[groupKey];
      const value = row[valueKey];
      groups.set(key, [...(groups.get(key) ?? []), value]);
    }
    return groups;
  }

  private invalidateCatalog(merchantId: string, productId?: string): Promise<void[]> {
    const keys = [
      `catalog:merchant:${merchantId}:published-products`,
      `catalog:merchant:${merchantId}:collections`,
      ...(productId ? [`catalog:product:${productId}:published`] : []),
    ];
    return Promise.all([
      ...keys.map((key) => this.redisService.delete(key)),
      this.redisService.increment(STOREFRONT_CATALOG_REVISION_KEY).then(() => undefined),
    ]);
  }

  private assertCollectionWindow(startsAt?: string, endsAt?: string): void {
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      throw this.badRequest('endsAt', 'endsAt must be later than startsAt');
    }
  }

  private assertVariantPricing(
    priceCentavos: number,
    compareAtPriceCentavos: number | null | undefined,
  ): void {
    if (compareAtPriceCentavos != null && compareAtPriceCentavos <= priceCentavos) {
      throw this.badRequest(
        'compareAtPriceCentavos',
        'compareAtPriceCentavos must be greater than priceCentavos',
      );
    }
  }

  private assertNonemptyDto(dto: object): void {
    if (Object.keys(dto).length === 0) {
      throw this.badRequest('request', 'At least one field is required');
    }
  }

  private encodeCursor(cursor: { updatedAt: Date; id: string }): string {
    return Buffer.from(
      JSON.stringify({ id: cursor.id, updatedAt: cursor.updatedAt.toISOString() }),
    ).toString('base64url');
  }

  private decodeCursor(value: string): { updatedAt: Date; id: string } {
    try {
      const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
        id?: unknown;
        updatedAt?: unknown;
      };
      const updatedAt = new Date(String(parsed.updatedAt));

      if (
        typeof parsed.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.id) ||
        Number.isNaN(updatedAt.getTime())
      ) {
        throw new Error('invalid');
      }
      return { id: parsed.id, updatedAt };
    } catch {
      throw this.badRequest('cursor', 'Cursor is invalid');
    }
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`)
        .join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
  }

  private rethrowCatalogConflict(error: unknown, field: string, message: string): never {
    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      throw error;
    }
    if (error instanceof ConflictException) {
      throw error;
    }
    if (this.isUniqueViolation(error)) {
      throw this.conflict(field, message);
    }
    throw error;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === '23505'
    );
  }

  private badRequest(field: string, message: string): BadRequestException {
    return new BadRequestException({ message: 'Validation failed', errors: [{ field, message }] });
  }

  private conflict(field: string, message: string): ConflictException {
    return new ConflictException({ message, errors: [{ field, message }] });
  }

  private notFound(message: string): NotFoundException {
    return new NotFoundException({ message, errors: [{ field: 'resource', message }] });
  }
}
