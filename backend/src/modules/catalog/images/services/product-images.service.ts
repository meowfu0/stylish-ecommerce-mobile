import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull, max } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';

import { DatabaseService } from '../../../../database/database.service';
import {
  auditLogs,
  domainEvents,
  outboxMessages,
  productImages,
  products,
} from '../../../../database/schema';
import { RedisOperationCoordinator } from '../../../../infrastructure/redis/redis-operation-coordinator.service';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { SupabaseStorageService } from '../../../../infrastructure/storage/supabase-storage.service';
import type { RequestMetadata } from '../../../auth/types/auth.types';
import { STOREFRONT_CATALOG_REVISION_KEY } from '../../../storefront/storefront.constants';
import type {
  InitializeProductImageUploadDto,
  ReorderProductImagesDto,
  UpdateProductImageDto,
} from '../dto/product-image-request.dto';
import type {
  ProductImageDeleteView,
  ProductImageUploadRequestView,
  ProductImageView,
} from '../types/product-image.types';
import { ProductImagePolicy } from './product-image.policy';

type Transaction = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];
type ProductImageRow = typeof productImages.$inferSelect;
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
export class ProductImagesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly operationCoordinator: RedisOperationCoordinator,
    private readonly policy: ProductImagePolicy,
    private readonly redisService: RedisService,
    private readonly storageService: SupabaseStorageService,
  ) {}

  async listImages(merchantId: string, productId: string): Promise<{ items: ProductImageView[] }> {
    await this.assertProductOwned(merchantId, productId);
    const rows = await this.databaseService.db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.merchantId, merchantId),
          eq(productImages.productId, productId),
          eq(productImages.status, 'CONFIRMED'),
        ),
      )
      .orderBy(asc(productImages.sortOrder), asc(productImages.id));

    return { items: await Promise.all(rows.map((row) => this.imageView(row))) };
  }

  async initializeUpload(
    actorUserId: string,
    merchantId: string,
    productId: string,
    dto: InitializeProductImageUploadDto,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<ProductImageUploadRequestView> {
    this.policy.assertDeclaredFile(dto.contentType, dto.fileSizeBytes);
    const idempotency = this.idempotency(
      'upload.initialize',
      actorUserId,
      `${merchantId}:${productId}`,
      rawIdempotencyKey,
      dto,
    );

    return this.operationCoordinator.run(
      `product-image-upload:${merchantId}:${productId}:${idempotency.databaseKey}`,
      async () => {
        const replay = await this.findInitializationReplay(idempotency, merchantId, productId);

        if (replay) {
          return this.createUploadResponse(replay);
        }

        const imageId = randomUUID();
        const extension = this.policy.extensionFor(dto.contentType);
        const storagePath = `merchants/${merchantId}/products/${productId}/${randomUUID()}.${extension}`;
        const expiresAt = new Date(
          Date.now() + this.storageService.getSignedUploadTtlSeconds() * 1000,
        );
        const committedImageId = await this.databaseService.db.transaction(async (tx) => {
          await this.lockWritableProduct(tx, merchantId, productId);
          const existing = await this.findInitializationReplayInTransaction(
            tx,
            idempotency,
            merchantId,
            productId,
          );

          if (existing) {
            return existing.id;
          }
          const [position] = await tx
            .select({ maximum: max(productImages.sortOrder) })
            .from(productImages)
            .where(
              and(eq(productImages.merchantId, merchantId), eq(productImages.productId, productId)),
            );
          const [image] = await tx
            .insert(productImages)
            .values({
              altText: dto.altText ?? null,
              contentType: dto.contentType,
              id: imageId,
              merchantId,
              productId,
              publicUrl: null,
              sizeBytes: dto.fileSizeBytes,
              sortOrder: Number(position?.maximum ?? -1) + 1,
              status: 'PENDING',
              storagePath,
              uploadExpiresAt: expiresAt,
            })
            .returning({ id: productImages.id });

          if (!image) {
            throw new Error('Product image upload initialization failed');
          }
          await this.recordEvent(tx, {
            action: 'catalog.product-image.upload-initialized',
            actorUserId,
            afterData: {
              contentType: dto.contentType,
              fileSizeBytes: dto.fileSizeBytes,
              status: 'PENDING',
            },
            aggregateId: image.id,
            aggregateType: 'PRODUCT_IMAGE',
            eventType: 'catalog.product_image.upload_initialized',
            idempotency,
            merchantId,
            metadata,
            payload: { productId },
          });
          return image.id;
        });
        const image = await this.getPendingImage(merchantId, productId, committedImageId);

        return this.createUploadResponse(image);
      },
    );
  }

  async confirmUpload(
    actorUserId: string,
    merchantId: string,
    productId: string,
    imageId: string,
    metadata: RequestMetadata,
  ): Promise<ProductImageView> {
    return this.operationCoordinator.run(
      `product-image-confirm:${merchantId}:${productId}:${imageId}`,
      async () => {
        const image = await this.getOwnedImage(merchantId, productId, imageId);

        if (image.status === 'CONFIRMED') {
          return this.imageView(image);
        }
        if (image.uploadExpiresAt <= new Date()) {
          await this.cleanupAbandonedUpload(image);
          throw this.conflict('imageId', 'The signed upload request has expired');
        }
        const object = await this.storageService.getObjectInfo(image.storagePath);

        if (!object) {
          throw this.notFound('Uploaded image object was not found');
        }

        try {
          this.policy.assertUploadedFile(
            { contentType: image.contentType, sizeBytes: image.sizeBytes },
            object,
          );
        } catch (error) {
          await this.cleanupAbandonedUpload(image);
          throw error;
        }

        try {
          await this.databaseService.db.transaction(async (tx) => {
            await this.lockWritableProduct(tx, merchantId, productId);
            const current = await this.lockImage(tx, merchantId, productId, imageId);

            if (current.status === 'CONFIRMED') {
              return;
            }
            const confirmed = await tx
              .select({ id: productImages.id })
              .from(productImages)
              .where(
                and(
                  eq(productImages.merchantId, merchantId),
                  eq(productImages.productId, productId),
                  eq(productImages.status, 'CONFIRMED'),
                ),
              )
              .orderBy(asc(productImages.id))
              .for('update');
            const now = new Date();

            await tx
              .update(productImages)
              .set({
                confirmedAt: now,
                isPrimary: confirmed.length === 0,
                status: 'CONFIRMED',
                updatedAt: now,
              })
              .where(
                and(
                  eq(productImages.id, imageId),
                  eq(productImages.merchantId, merchantId),
                  eq(productImages.productId, productId),
                  eq(productImages.status, 'PENDING'),
                ),
              );
            await this.recordEvent(tx, {
              action: 'catalog.product-image.confirmed',
              actorUserId,
              afterData: { isPrimary: confirmed.length === 0, status: 'CONFIRMED' },
              aggregateId: imageId,
              aggregateType: 'PRODUCT_IMAGE',
              eventType: 'catalog.product_image.confirmed',
              idempotency: this.serverIdempotency('image.confirm', actorUserId, imageId),
              merchantId,
              metadata,
              payload: { productId },
            });
          });
        } catch (error) {
          const confirmed = await this.findConfirmedImage(merchantId, productId, imageId);

          if (!confirmed) {
            await this.cleanupAbandonedUpload(image).catch(() => undefined);
            throw error;
          }
        }

        await this.invalidateCatalog(merchantId, productId);
        return this.getImage(merchantId, productId, imageId);
      },
    );
  }

  async updateImage(
    actorUserId: string,
    merchantId: string,
    productId: string,
    imageId: string,
    dto: UpdateProductImageDto,
    metadata: RequestMetadata,
  ): Promise<ProductImageView> {
    this.assertNonemptyDto(dto);
    await this.databaseService.db.transaction(async (tx) => {
      await this.lockWritableProduct(tx, merchantId, productId);
      const image = await this.lockConfirmedImage(tx, merchantId, productId, imageId);

      await tx
        .update(productImages)
        .set({
          ...(dto.altText !== undefined ? { altText: dto.altText } : {}),
          ...(dto.displayOrder !== undefined ? { sortOrder: dto.displayOrder } : {}),
          updatedAt: new Date(),
        })
        .where(eq(productImages.id, imageId));
      await this.recordEvent(tx, {
        action: 'catalog.product-image.updated',
        actorUserId,
        afterData: { fields: Object.keys(dto).sort() },
        aggregateId: imageId,
        aggregateType: 'PRODUCT_IMAGE',
        beforeData: { altText: image.altText, displayOrder: image.sortOrder },
        eventType: 'catalog.product_image.updated',
        idempotency: this.serverIdempotency('image.update', actorUserId, imageId),
        merchantId,
        metadata,
        payload: { productId },
      });
    });

    await this.invalidateCatalog(merchantId, productId);
    return this.getImage(merchantId, productId, imageId);
  }

  async setPrimary(
    actorUserId: string,
    merchantId: string,
    productId: string,
    imageId: string,
    metadata: RequestMetadata,
  ): Promise<ProductImageView> {
    await this.databaseService.db.transaction(async (tx) => {
      await this.lockWritableProduct(tx, merchantId, productId);
      const images = await this.lockConfirmedImages(tx, merchantId, productId);
      const target = images.find((image) => image.id === imageId);

      if (!target) {
        throw this.notFound('Product image not found');
      }
      if (!target.isPrimary) {
        await tx
          .update(productImages)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(
            and(
              eq(productImages.merchantId, merchantId),
              eq(productImages.productId, productId),
              eq(productImages.status, 'CONFIRMED'),
            ),
          );
        await tx
          .update(productImages)
          .set({ isPrimary: true, updatedAt: new Date() })
          .where(eq(productImages.id, imageId));
      }
      await this.recordEvent(tx, {
        action: 'catalog.product-image.primary-changed',
        actorUserId,
        afterData: { isPrimary: true },
        aggregateId: imageId,
        aggregateType: 'PRODUCT_IMAGE',
        beforeData: { isPrimary: target.isPrimary },
        eventType: 'catalog.product_image.primary_changed',
        idempotency: this.serverIdempotency('image.set-primary', actorUserId, imageId),
        merchantId,
        metadata,
        payload: { productId },
      });
    });

    await this.invalidateCatalog(merchantId, productId);
    return this.getImage(merchantId, productId, imageId);
  }

  async reorderImages(
    actorUserId: string,
    merchantId: string,
    productId: string,
    dto: ReorderProductImagesDto,
    metadata: RequestMetadata,
  ): Promise<{ items: ProductImageView[] }> {
    await this.databaseService.db.transaction(async (tx) => {
      await this.lockWritableProduct(tx, merchantId, productId);
      const current = await this.lockConfirmedImages(tx, merchantId, productId);
      const currentIds = new Set(current.map((image) => image.id));

      if (
        dto.imageIds.length !== current.length ||
        dto.imageIds.some((imageId) => !currentIds.has(imageId))
      ) {
        throw this.badRequest(
          'imageIds',
          'imageIds must contain every confirmed product image exactly once',
        );
      }

      for (const [displayOrder, imageId] of dto.imageIds.entries()) {
        await tx
          .update(productImages)
          .set({ sortOrder: displayOrder, updatedAt: new Date() })
          .where(
            and(
              eq(productImages.id, imageId),
              eq(productImages.merchantId, merchantId),
              eq(productImages.productId, productId),
            ),
          );
      }
      await this.recordEvent(tx, {
        action: 'catalog.product-images.reordered',
        actorUserId,
        afterData: { imageIds: dto.imageIds },
        aggregateId: productId,
        aggregateType: 'PRODUCT',
        eventType: 'catalog.product_images.reordered',
        idempotency: this.serverIdempotency('images.reorder', actorUserId, productId),
        merchantId,
        metadata,
      });
    });

    await this.invalidateCatalog(merchantId, productId);
    return this.listImages(merchantId, productId);
  }

  async createSignedReadUrl(
    merchantId: string,
    productId: string,
    imageId: string,
  ): Promise<{ expiresAt: string; imageId: string; signedUrl: string }> {
    const image = await this.getConfirmedImage(merchantId, productId, imageId);
    const object = await this.storageService.getObjectInfo(image.storagePath);

    if (!object) {
      throw this.notFound('Stored product image was not found');
    }
    const signed = await this.storageService.createSignedReadUrl(image.storagePath);
    return { ...signed, imageId };
  }

  async deleteImage(
    actorUserId: string,
    merchantId: string,
    productId: string,
    imageId: string,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<ProductImageDeleteView> {
    const idempotency = this.idempotency(
      'image.delete',
      actorUserId,
      `${merchantId}:${productId}:${imageId}`,
      rawIdempotencyKey,
      {},
    );

    return this.operationCoordinator.run(
      `product-image-delete:${merchantId}:${productId}:${imageId}`,
      async () => {
        const replay = await this.findDeleteReplay(idempotency);

        if (replay) {
          return { deleted: true, imageId: replay.imageId };
        }
        await this.assertWritableProductOwned(merchantId, productId);
        const image = await this.getOwnedImage(merchantId, productId, imageId);
        await this.storageService.removeObject(image.storagePath);

        await this.databaseService.db.transaction(async (tx) => {
          await this.lockWritableProduct(tx, merchantId, productId);
          const existingReplay = await this.findDeleteReplayInTransaction(tx, idempotency);

          if (existingReplay) {
            return;
          }
          const images = await tx
            .select()
            .from(productImages)
            .where(
              and(eq(productImages.merchantId, merchantId), eq(productImages.productId, productId)),
            )
            .orderBy(asc(productImages.sortOrder), asc(productImages.id))
            .for('update');
          const target = images.find((candidate) => candidate.id === imageId);

          if (!target) {
            throw this.notFound('Product image not found');
          }
          await tx
            .delete(productImages)
            .where(
              and(
                eq(productImages.id, imageId),
                eq(productImages.merchantId, merchantId),
                eq(productImages.productId, productId),
              ),
            );
          const remainingConfirmed = images.filter(
            (candidate) => candidate.id !== imageId && candidate.status === 'CONFIRMED',
          );

          if (target.isPrimary && remainingConfirmed.length > 0) {
            await tx
              .update(productImages)
              .set({ isPrimary: true, updatedAt: new Date() })
              .where(eq(productImages.id, remainingConfirmed[0]!.id));
          }
          for (const [displayOrder, remaining] of remainingConfirmed.entries()) {
            await tx
              .update(productImages)
              .set({ sortOrder: displayOrder, updatedAt: new Date() })
              .where(eq(productImages.id, remaining.id));
          }
          await this.recordEvent(tx, {
            action: 'catalog.product-image.deleted',
            actorUserId,
            afterData: { deleted: true },
            aggregateId: imageId,
            aggregateType: 'PRODUCT_IMAGE',
            beforeData: { isPrimary: target.isPrimary, status: target.status },
            eventType: 'catalog.product_image.deleted',
            idempotency,
            merchantId,
            metadata,
            payload: { imageId, productId },
          });
        });

        await this.invalidateCatalog(merchantId, productId);
        return { deleted: true, imageId };
      },
    );
  }

  private async createUploadResponse(
    image: ProductImageRow,
  ): Promise<ProductImageUploadRequestView> {
    if (image.status !== 'PENDING') {
      throw this.conflict('imageId', 'The upload request has already been confirmed');
    }
    if (image.uploadExpiresAt <= new Date()) {
      throw this.conflict('imageId', 'The signed upload request has expired');
    }
    const signed = await this.storageService.createSignedUpload(image.storagePath);

    return {
      contentType: image.contentType,
      expiresAt: image.uploadExpiresAt.toISOString(),
      fileSizeBytes: image.sizeBytes,
      imageId: image.id,
      productId: image.productId,
      ...signed,
    };
  }

  private async getImage(
    merchantId: string,
    productId: string,
    imageId: string,
  ): Promise<ProductImageView> {
    return this.imageView(await this.getConfirmedImage(merchantId, productId, imageId));
  }

  private async imageView(image: ProductImageRow): Promise<ProductImageView> {
    const object = await this.storageService.getObjectInfo(image.storagePath);
    const signed = object ? await this.storageService.createSignedReadUrl(image.storagePath) : null;

    if (!image.confirmedAt) {
      throw new Error('Confirmed product image is missing confirmedAt');
    }
    return {
      altText: image.altText,
      confirmedAt: image.confirmedAt.toISOString(),
      contentType: image.contentType,
      createdAt: image.createdAt.toISOString(),
      displayOrder: image.sortOrder,
      id: image.id,
      isPrimary: image.isPrimary,
      merchantId: image.merchantId,
      productId: image.productId,
      readUrlExpiresAt: signed?.expiresAt ?? null,
      signedUrl: signed?.signedUrl ?? null,
      sizeBytes: image.sizeBytes,
      updatedAt: image.updatedAt.toISOString(),
    };
  }

  private async getOwnedImage(
    merchantId: string,
    productId: string,
    imageId: string,
  ): Promise<ProductImageRow> {
    const [image] = await this.databaseService.db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.id, imageId),
          eq(productImages.merchantId, merchantId),
          eq(productImages.productId, productId),
        ),
      )
      .limit(1);

    if (!image) {
      throw this.notFound('Product image not found');
    }
    return image;
  }

  private async getPendingImage(
    merchantId: string,
    productId: string,
    imageId: string,
  ): Promise<ProductImageRow> {
    const image = await this.getOwnedImage(merchantId, productId, imageId);

    if (image.status !== 'PENDING') {
      throw this.conflict('imageId', 'The upload request is no longer pending');
    }
    return image;
  }

  private async getConfirmedImage(
    merchantId: string,
    productId: string,
    imageId: string,
  ): Promise<ProductImageRow> {
    const image = await this.getOwnedImage(merchantId, productId, imageId);

    if (image.status !== 'CONFIRMED') {
      throw this.notFound('Product image not found');
    }
    return image;
  }

  private async findConfirmedImage(
    merchantId: string,
    productId: string,
    imageId: string,
  ): Promise<ProductImageRow | null> {
    const [image] = await this.databaseService.db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.id, imageId),
          eq(productImages.merchantId, merchantId),
          eq(productImages.productId, productId),
          eq(productImages.status, 'CONFIRMED'),
        ),
      )
      .limit(1);

    return image ?? null;
  }

  private async assertProductOwned(merchantId: string, productId: string): Promise<void> {
    const [product] = await this.databaseService.db
      .select({ id: products.id })
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
  }

  private async assertWritableProductOwned(merchantId: string, productId: string): Promise<void> {
    const [product] = await this.databaseService.db
      .select({ id: products.id, status: products.status })
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
    if (product.status === 'ARCHIVED') {
      throw this.conflict('productId', 'Archived products cannot be modified');
    }
  }

  private async lockWritableProduct(
    tx: Transaction,
    merchantId: string,
    productId: string,
  ): Promise<void> {
    const [product] = await tx
      .select({ id: products.id, status: products.status })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.merchantId, merchantId),
          isNull(products.deletedAt),
        ),
      )
      .for('update')
      .limit(1);

    if (!product) {
      throw this.notFound('Product not found');
    }
    if (product.status === 'ARCHIVED') {
      throw this.conflict('productId', 'Archived products cannot be modified');
    }
  }

  private async lockImage(
    tx: Transaction,
    merchantId: string,
    productId: string,
    imageId: string,
  ): Promise<ProductImageRow> {
    const [image] = await tx
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.id, imageId),
          eq(productImages.merchantId, merchantId),
          eq(productImages.productId, productId),
        ),
      )
      .for('update')
      .limit(1);

    if (!image) {
      throw this.notFound('Product image not found');
    }
    return image;
  }

  private async lockConfirmedImage(
    tx: Transaction,
    merchantId: string,
    productId: string,
    imageId: string,
  ): Promise<ProductImageRow> {
    const image = await this.lockImage(tx, merchantId, productId, imageId);

    if (image.status !== 'CONFIRMED') {
      throw this.notFound('Product image not found');
    }
    return image;
  }

  private lockConfirmedImages(
    tx: Transaction,
    merchantId: string,
    productId: string,
  ): Promise<ProductImageRow[]> {
    return tx
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.merchantId, merchantId),
          eq(productImages.productId, productId),
          eq(productImages.status, 'CONFIRMED'),
        ),
      )
      .orderBy(asc(productImages.sortOrder), asc(productImages.id))
      .for('update');
  }

  private async cleanupAbandonedUpload(image: ProductImageRow): Promise<void> {
    await this.storageService.removeObject(image.storagePath);
    await this.databaseService.db
      .delete(productImages)
      .where(
        and(
          eq(productImages.id, image.id),
          eq(productImages.merchantId, image.merchantId),
          eq(productImages.productId, image.productId),
          eq(productImages.status, 'PENDING'),
        ),
      );
  }

  private async findInitializationReplay(
    idempotency: IdempotencyContext,
    merchantId: string,
    productId: string,
  ): Promise<ProductImageRow | null> {
    const [event] = await this.databaseService.db
      .select({ aggregateId: domainEvents.aggregateId, payload: domainEvents.payload })
      .from(domainEvents)
      .where(eq(domainEvents.idempotencyKey, idempotency.databaseKey))
      .limit(1);

    if (!event) return null;
    this.assertFingerprint(event.payload, idempotency);

    try {
      return await this.getOwnedImage(merchantId, productId, event.aggregateId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw this.conflict(
          'idempotency-key',
          'The original upload request is no longer available',
        );
      }
      throw error;
    }
  }

  private async findInitializationReplayInTransaction(
    tx: Transaction,
    idempotency: IdempotencyContext,
    merchantId: string,
    productId: string,
  ): Promise<ProductImageRow | null> {
    const [event] = await tx
      .select({ aggregateId: domainEvents.aggregateId, payload: domainEvents.payload })
      .from(domainEvents)
      .where(eq(domainEvents.idempotencyKey, idempotency.databaseKey))
      .limit(1);

    if (!event) return null;
    this.assertFingerprint(event.payload, idempotency);
    const [image] = await tx
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.id, event.aggregateId),
          eq(productImages.merchantId, merchantId),
          eq(productImages.productId, productId),
        ),
      )
      .limit(1);

    if (!image) {
      throw this.conflict('idempotency-key', 'The original upload request is no longer available');
    }
    return image;
  }

  private async findDeleteReplay(
    idempotency: IdempotencyContext,
  ): Promise<{ imageId: string } | null> {
    const [event] = await this.databaseService.db
      .select({ aggregateId: domainEvents.aggregateId, payload: domainEvents.payload })
      .from(domainEvents)
      .where(eq(domainEvents.idempotencyKey, idempotency.databaseKey))
      .limit(1);

    if (!event) return null;
    this.assertFingerprint(event.payload, idempotency);
    return { imageId: event.aggregateId };
  }

  private async findDeleteReplayInTransaction(
    tx: Transaction,
    idempotency: IdempotencyContext,
  ): Promise<{ imageId: string } | null> {
    const [event] = await tx
      .select({ aggregateId: domainEvents.aggregateId, payload: domainEvents.payload })
      .from(domainEvents)
      .where(eq(domainEvents.idempotencyKey, idempotency.databaseKey))
      .limit(1);

    if (!event) return null;
    this.assertFingerprint(event.payload, idempotency);
    return { imageId: event.aggregateId };
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
      throw new Error('Product image domain event insert failed');
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
      databaseKey: `product-images:${this.hash(`${action}:${actorUserId}:${resourceId}:${key}`)}`,
      fingerprint: this.hash(this.stableStringify(request)),
    };
  }

  private serverIdempotency(
    action: string,
    actorUserId: string,
    resourceId: string,
  ): IdempotencyContext {
    return {
      databaseKey: `product-images:${this.hash(`${action}:${actorUserId}:${resourceId}:${randomUUID()}`)}`,
      fingerprint: this.hash('{}'),
    };
  }

  private assertFingerprint(
    payload: Record<string, unknown>,
    idempotency: IdempotencyContext,
  ): void {
    if (payload.requestFingerprint !== idempotency.fingerprint) {
      throw this.conflict(
        'idempotency-key',
        'Idempotency-Key was already used with a different image request',
      );
    }
  }

  private invalidateCatalog(merchantId: string, productId: string): Promise<void[]> {
    return Promise.all(
      [
        `catalog:merchant:${merchantId}:published-products`,
        `catalog:merchant:${merchantId}:collections`,
        `catalog:product:${productId}:published`,
        `storefront:product:${productId}`,
      ]
        .map((key) => this.redisService.delete(key))
        .concat(this.redisService.increment(STOREFRONT_CATALOG_REVISION_KEY).then(() => undefined)),
    );
  }

  private assertNonemptyDto(dto: object): void {
    if (Object.keys(dto).length === 0) {
      throw this.badRequest('request', 'At least one field is required');
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
