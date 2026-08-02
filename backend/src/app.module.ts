import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import emailConfig from './config/email.config';
import redisConfig from './config/redis.config';
import { validateEnvironment } from './config/env.validation';
import supabaseConfig from './config/supabase.config';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { SupabaseStorageModule } from './infrastructure/storage/supabase-storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccessTokenGuard } from './modules/auth/guards/access-token.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { StorefrontModule } from './modules/storefront/storefront.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      expandVariables: false,
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig, emailConfig, redisConfig, supabaseConfig],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', limit: 100, ttl: 60_000 }],
    }),
    DatabaseModule,
    RedisModule,
    SupabaseStorageModule,
    AuthModule,
    MerchantsModule,
    CatalogModule,
    InventoryModule,
    StorefrontModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes({ path: '*splat', method: RequestMethod.ALL });
  }
}
