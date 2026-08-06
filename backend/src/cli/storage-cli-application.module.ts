import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import supabaseConfig from '../config/supabase.config';
import { validateStorageEnvironment } from '../config/env.validation';
import { SupabaseStorageModule } from '../infrastructure/storage/supabase-storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      expandVariables: false,
      isGlobal: true,
      load: [supabaseConfig],
      validate: validateStorageEnvironment,
    }),
    SupabaseStorageModule,
  ],
})
export class StorageCliApplicationModule {}
