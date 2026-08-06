import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseStorageService } from './supabase-storage.service';

describe('SupabaseStorageService', () => {
  const config = new ConfigService({
    supabase: {
      signedReadTtlSeconds: 300,
      signedUploadTtlSeconds: 7200,
      storageBucket: 'product-images',
    },
  });
  let bucketApi: {
    createBucket: jest.Mock;
    getBucket: jest.Mock;
    updateBucket: jest.Mock;
  };
  let fileApi: {
    createSignedReadUrl?: never;
    createSignedUrl: jest.Mock;
    createSignedUploadUrl: jest.Mock;
    info: jest.Mock;
    remove: jest.Mock;
  };
  let service: SupabaseStorageService;

  beforeEach(() => {
    bucketApi = {
      createBucket: jest.fn(),
      getBucket: jest.fn(),
      updateBucket: jest.fn(),
    };
    fileApi = {
      createSignedUrl: jest.fn(),
      createSignedUploadUrl: jest.fn(),
      info: jest.fn(),
      remove: jest.fn(),
    };
    const client = {
      storage: {
        ...bucketApi,
        from: jest.fn().mockReturnValue(fileApi),
      },
    } as unknown as SupabaseClient;
    service = new SupabaseStorageService(client, config);
  });

  it('creates the private restricted bucket only when missing', async () => {
    bucketApi.getBucket
      .mockResolvedValueOnce({ data: null, error: { status: 404 } })
      .mockResolvedValueOnce({
        data: {
          allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
          file_size_limit: 5 * 1024 * 1024,
          public: false,
        },
        error: null,
      });
    bucketApi.createBucket.mockResolvedValue({ data: { name: 'product-images' }, error: null });

    await expect(service.ensureProductImagesBucket()).resolves.toEqual(
      expect.objectContaining({ created: true, updated: false }),
    );
    expect(bucketApi.createBucket).toHaveBeenCalledWith(
      'product-images',
      expect.objectContaining({ public: false, fileSizeLimit: 5 * 1024 * 1024 }),
    );
  });

  it('returns object metadata and treats missing objects safely', async () => {
    fileApi.info
      .mockResolvedValueOnce({ data: { contentType: 'image/webp', size: 1234 }, error: null })
      .mockResolvedValueOnce({ data: null, error: { status: 404 } });

    await expect(service.getObjectInfo('safe/path.webp')).resolves.toEqual({
      contentType: 'image/webp',
      sizeBytes: 1234,
    });
    await expect(service.getObjectInfo('missing.webp')).resolves.toBeNull();
  });

  it('sanitizes upload, read, and deletion failures', async () => {
    fileApi.createSignedUploadUrl.mockResolvedValue({
      data: null,
      error: { message: 'raw provider detail' },
    });
    fileApi.createSignedUrl.mockResolvedValue({ data: null, error: { status: 404 } });
    fileApi.remove.mockResolvedValue({ data: null, error: { message: 'raw provider detail' } });

    await expect(service.createSignedUpload('safe/path.jpg')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.createSignedReadUrl('missing.jpg')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await service.removeObject('safe/path.jpg').catch((error: unknown) => {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(JSON.stringify((error as ServiceUnavailableException).getResponse())).not.toContain(
        'raw provider detail',
      );
    });
  });
});
