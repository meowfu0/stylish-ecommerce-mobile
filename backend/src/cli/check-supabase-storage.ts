import { NestFactory } from '@nestjs/core';

import { SupabaseStorageService } from '../infrastructure/storage/supabase-storage.service';
import { StorageCliApplicationModule } from './storage-cli-application.module';

async function checkSupabaseStorage(): Promise<void> {
  const application = await NestFactory.createApplicationContext(StorageCliApplicationModule, {
    logger: false,
  });

  try {
    const storage = application.get(SupabaseStorageService);
    const status = await storage.inspectProductImagesBucket();
    const ready =
      status.exists &&
      status.isPrivate &&
      status.allowedMimeTypesValid &&
      status.fileSizeLimitValid;

    process.stdout.write(
      `${JSON.stringify({
        bucket: storage.getBucketName(),
        allowedMimeTypesValid: status.allowedMimeTypesValid,
        connected: true,
        exists: status.exists,
        fileSizeLimitValid: status.fileSizeLimitValid,
        private: status.isPrivate,
        ready,
        restrictionsValid: status.allowedMimeTypesValid && status.fileSizeLimitValid,
      })}\n`,
    );

    if (!ready) {
      process.exitCode = 2;
    }
  } finally {
    await application.close();
  }
}

void checkSupabaseStorage().catch(() => {
  process.stderr.write(`${JSON.stringify({ error: 'Supabase Storage check failed safely' })}\n`);
  process.exitCode = 1;
});
