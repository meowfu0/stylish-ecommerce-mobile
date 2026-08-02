import { Module } from '@nestjs/common';

import { StorefrontCacheService } from './services/storefront-cache.service';
import { StorefrontCursorService } from './services/storefront-cursor.service';
import { StorefrontService } from './services/storefront.service';
import { StorefrontController } from './storefront.controller';

@Module({
  controllers: [StorefrontController],
  providers: [StorefrontCacheService, StorefrontCursorService, StorefrontService],
})
export class StorefrontModule {}
