import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

import {
  SUPABASE_STORAGE_CLIENT,
  SUPABASE_STORAGE_REQUEST_TIMEOUT_MS,
} from './supabase-storage.constants';
import { SupabaseStorageService } from './supabase-storage.service';

const storageFetch: typeof fetch = (input, init = {}) => {
  const timeoutSignal = AbortSignal.timeout(SUPABASE_STORAGE_REQUEST_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;

  return fetch(input, { ...init, signal });
};

@Global()
@Module({
  exports: [SupabaseStorageService],
  providers: [
    {
      inject: [ConfigService],
      provide: SUPABASE_STORAGE_CLIENT,
      useFactory: (configService: ConfigService) =>
        createClient(
          configService.getOrThrow<string>('supabase.url'),
          configService.getOrThrow<string>('supabase.serviceRoleKey'),
          {
            auth: {
              autoRefreshToken: false,
              detectSessionInUrl: false,
              persistSession: false,
            },
            global: { fetch: storageFetch },
          },
        ),
    },
    SupabaseStorageService,
  ],
})
export class SupabaseStorageModule {}
