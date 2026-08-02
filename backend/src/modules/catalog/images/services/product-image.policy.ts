import { BadRequestException, Injectable } from '@nestjs/common';

import {
  PRODUCT_IMAGE_ALLOWED_MIME_TYPES,
  PRODUCT_IMAGE_MAX_BYTES,
} from '../../../../infrastructure/storage/supabase-storage.constants';

@Injectable()
export class ProductImagePolicy {
  extensionFor(contentType: string): 'jpg' | 'png' | 'webp' {
    if (contentType === 'image/jpeg') return 'jpg';
    if (contentType === 'image/png') return 'png';
    if (contentType === 'image/webp') return 'webp';
    throw this.invalid('contentType', 'Only JPEG, PNG, and WebP images are supported');
  }

  assertDeclaredFile(contentType: string, sizeBytes: number): void {
    if (!(PRODUCT_IMAGE_ALLOWED_MIME_TYPES as readonly string[]).includes(contentType)) {
      throw this.invalid('contentType', 'Only JPEG, PNG, and WebP images are supported');
    }
    if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > PRODUCT_IMAGE_MAX_BYTES) {
      throw this.invalid('fileSizeBytes', 'Image size must be between 1 byte and 5 MB');
    }
  }

  assertUploadedFile(
    expected: { contentType: string; sizeBytes: number },
    actual: { contentType: string | null; sizeBytes: number | null },
  ): void {
    if (actual.contentType !== expected.contentType) {
      throw this.invalid('contentType', 'Uploaded image content type does not match the request');
    }
    if (actual.sizeBytes !== expected.sizeBytes) {
      throw this.invalid('fileSizeBytes', 'Uploaded image size does not match the request');
    }
    this.assertDeclaredFile(actual.contentType, actual.sizeBytes);
  }

  private invalid(field: string, message: string): BadRequestException {
    return new BadRequestException({
      errors: [{ field, message }],
      message: 'Image validation failed',
    });
  }
}
