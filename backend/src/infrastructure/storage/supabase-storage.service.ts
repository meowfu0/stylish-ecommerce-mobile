import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  PRODUCT_IMAGE_ALLOWED_MIME_TYPES,
  PRODUCT_IMAGE_MAX_BYTES,
  SUPABASE_STORAGE_CLIENT,
} from './supabase-storage.constants';

type StorageErrorLike = {
  status?: number;
  statusCode?: string;
};

export type ProductImagesBucketStatus = {
  allowedMimeTypesValid: boolean;
  exists: boolean;
  fileSizeLimitValid: boolean;
  isPrivate: boolean;
};

export type StorageObjectInfo = {
  contentType: string | null;
  sizeBytes: number | null;
};

@Injectable()
export class SupabaseStorageService {
  private readonly bucket: string;
  private readonly signedReadTtlSeconds: number;
  private readonly signedUploadTtlSeconds: number;

  constructor(
    @Inject(SUPABASE_STORAGE_CLIENT) private readonly client: SupabaseClient,
    configService: ConfigService,
  ) {
    this.bucket = configService.getOrThrow<string>('supabase.storageBucket');
    this.signedReadTtlSeconds = configService.getOrThrow<number>('supabase.signedReadTtlSeconds');
    this.signedUploadTtlSeconds = configService.getOrThrow<number>(
      'supabase.signedUploadTtlSeconds',
    );
  }

  getBucketName(): string {
    return this.bucket;
  }

  getSignedReadTtlSeconds(): number {
    return this.signedReadTtlSeconds;
  }

  getSignedUploadTtlSeconds(): number {
    return this.signedUploadTtlSeconds;
  }

  async inspectProductImagesBucket(): Promise<ProductImagesBucketStatus> {
    const { data, error } = await this.client.storage.getBucket(this.bucket);

    if (error) {
      if (this.isNotFound(error)) {
        return {
          allowedMimeTypesValid: false,
          exists: false,
          fileSizeLimitValid: false,
          isPrivate: false,
        };
      }
      throw this.unavailable();
    }

    const allowedMimeTypes = [...(data.allowed_mime_types ?? [])].sort();
    const requiredMimeTypes = [...PRODUCT_IMAGE_ALLOWED_MIME_TYPES].sort();

    return {
      allowedMimeTypesValid:
        allowedMimeTypes.length === requiredMimeTypes.length &&
        allowedMimeTypes.every((value, index) => value === requiredMimeTypes[index]),
      exists: true,
      fileSizeLimitValid: Number(data.file_size_limit) === PRODUCT_IMAGE_MAX_BYTES,
      isPrivate: data.public === false,
    };
  }

  async ensureProductImagesBucket(): Promise<{
    created: boolean;
    status: ProductImagesBucketStatus;
    updated: boolean;
  }> {
    const before = await this.inspectProductImagesBucket();
    let created = false;
    let updated = false;
    const options = {
      allowedMimeTypes: [...PRODUCT_IMAGE_ALLOWED_MIME_TYPES],
      fileSizeLimit: PRODUCT_IMAGE_MAX_BYTES,
      public: false,
    };

    if (!before.exists) {
      const { error } = await this.client.storage.createBucket(this.bucket, options);

      if (error) {
        throw this.unavailable();
      }
      created = true;
    } else if (!before.isPrivate || !before.allowedMimeTypesValid || !before.fileSizeLimitValid) {
      const { error } = await this.client.storage.updateBucket(this.bucket, options);

      if (error) {
        throw this.unavailable();
      }
      updated = true;
    }

    const status = await this.inspectProductImagesBucket();

    if (
      !status.exists ||
      !status.isPrivate ||
      !status.allowedMimeTypesValid ||
      !status.fileSizeLimitValid
    ) {
      throw this.unavailable();
    }

    return { created, status, updated };
  }

  async createSignedUpload(storagePath: string): Promise<{
    storagePath: string;
    uploadToken: string;
    uploadUrl: string;
  }> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(storagePath, { upsert: false });

    if (error || !data) {
      throw this.unavailable();
    }

    return {
      storagePath: data.path,
      uploadToken: data.token,
      uploadUrl: data.signedUrl,
    };
  }

  async getObjectInfo(storagePath: string): Promise<StorageObjectInfo | null> {
    const { data, error } = await this.client.storage.from(this.bucket).info(storagePath);

    if (error) {
      if (this.isNotFound(error)) {
        return null;
      }
      throw this.unavailable();
    }

    return {
      contentType: data.contentType ?? data.metadata?.mimetype ?? null,
      sizeBytes: data.size ?? data.metadata?.size ?? null,
    };
  }

  async createSignedReadUrl(storagePath: string): Promise<{
    expiresAt: string;
    signedUrl: string;
  }> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, this.signedReadTtlSeconds);

    if (error || !data) {
      if (error && this.isNotFound(error)) {
        throw this.notFound();
      }
      throw this.unavailable();
    }

    return {
      expiresAt: new Date(Date.now() + this.signedReadTtlSeconds * 1000).toISOString(),
      signedUrl: data.signedUrl,
    };
  }

  async removeObject(storagePath: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([storagePath]);

    if (error && !this.isNotFound(error)) {
      throw this.unavailable();
    }
  }

  private isNotFound(error: StorageErrorLike): boolean {
    return (
      error.status === 404 ||
      error.statusCode === '404' ||
      error.statusCode === 'not_found' ||
      error.statusCode === 'NoSuchKey'
    );
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      errors: [{ field: 'storage', message: 'Storage service is unavailable' }],
      message: 'Storage service is temporarily unavailable',
    });
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      errors: [{ field: 'storage', message: 'Stored image was not found' }],
      message: 'Stored image was not found',
    });
  }
}
