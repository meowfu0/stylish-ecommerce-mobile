import { NestFactory } from '@nestjs/core';

import { SupabaseStorageService } from '../infrastructure/storage/supabase-storage.service';
import { StorageCliApplicationModule } from './storage-cli-application.module';

async function bootstrapProductImagesBucket(): Promise<void> {
  const application = await NestFactory.createApplicationContext(StorageCliApplicationModule, {
    logger: false,
  });

  try {
    const storage = application.get(SupabaseStorageService);
    const result = await storage.ensureProductImagesBucket();

    process.stdout.write(
      `${JSON.stringify({
        bucket: storage.getBucketName(),
        created: result.created,
        private: result.status.isPrivate,
        restrictionsValid: result.status.allowedMimeTypesValid && result.status.fileSizeLimitValid,
        updated: result.updated,
      })}\n`,
    );
  } finally {
    await application.close();
  }
}

void bootstrapProductImagesBucket().catch(() => {
  process.stderr.write(
    `${JSON.stringify({ error: 'Product images bucket bootstrap failed safely' })}\n`,
  );
  process.exitCode = 1;
});
