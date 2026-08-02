import { Module } from '@nestjs/common';

import { MerchantCatalogController } from './merchant-catalog.controller';
import { ProductImagesController } from './images/product-images.controller';
import { ProductImagePolicy } from './images/services/product-image.policy';
import { ProductImagesService } from './images/services/product-images.service';
import { CatalogPublicationPolicy } from './services/catalog-publication.policy';
import { MerchantCatalogService } from './services/merchant-catalog.service';

@Module({
  controllers: [MerchantCatalogController, ProductImagesController],
  providers: [
    CatalogPublicationPolicy,
    MerchantCatalogService,
    ProductImagePolicy,
    ProductImagesService,
  ],
})
export class CatalogModule {}
