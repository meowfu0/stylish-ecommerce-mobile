import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CatalogSuccessResponseDto<T> {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty()
  message!: string;

  data!: T;
}

export class BrandDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) merchantId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class BrandSuccessResponseDto extends CatalogSuccessResponseDto<BrandDataDto> {
  @ApiProperty({ type: BrandDataDto }) declare data: BrandDataDto;
}

export class BrandListDataDto {
  @ApiProperty({ type: [BrandDataDto] }) items!: BrandDataDto[];
}

export class BrandListSuccessResponseDto extends CatalogSuccessResponseDto<BrandListDataDto> {
  @ApiProperty({ type: BrandListDataDto }) declare data: BrandListDataDto;
}

export class CategoryDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) parentId!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() sortOrder!: number;
}

export class CategorySuccessResponseDto extends CatalogSuccessResponseDto<CategoryDataDto> {
  @ApiProperty({ type: CategoryDataDto }) declare data: CategoryDataDto;
}

export class CategoryListDataDto {
  @ApiProperty({ type: [CategoryDataDto] }) items!: CategoryDataDto[];
}

export class CategoryListSuccessResponseDto extends CatalogSuccessResponseDto<CategoryListDataDto> {
  @ApiProperty({ type: CategoryListDataDto }) declare data: CategoryListDataDto;
}

export class CollectionDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) merchantId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) startsAt!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) endsAt!: string | null;
  @ApiProperty() sortOrder!: number;
  @ApiProperty({ format: 'uuid', isArray: true }) productIds!: string[];
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class CollectionSuccessResponseDto extends CatalogSuccessResponseDto<CollectionDataDto> {
  @ApiProperty({ type: CollectionDataDto }) declare data: CollectionDataDto;
}

export class CollectionListDataDto {
  @ApiProperty({ type: [CollectionDataDto] }) items!: CollectionDataDto[];
}

export class CollectionListSuccessResponseDto extends CatalogSuccessResponseDto<CollectionListDataDto> {
  @ApiProperty({ type: CollectionListDataDto }) declare data: CollectionListDataDto;
}

export class ProductOptionValueDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) optionId!: string;
  @ApiProperty() value!: string;
  @ApiProperty() displayLabel!: string;
  @ApiPropertyOptional({ nullable: true }) swatchHex!: string | null;
  @ApiProperty() displayOrder!: number;
}

export class ProductOptionDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() displayOrder!: number;
  @ApiProperty({ type: [ProductOptionValueDataDto] }) values!: ProductOptionValueDataDto[];
}

export class ProductVariantDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sku!: string;
  @ApiPropertyOptional({ nullable: true }) barcode!: string | null;
  @ApiProperty({ description: 'Integer Philippine centavos.' }) priceCentavos!: number;
  @ApiPropertyOptional({ nullable: true }) compareAtPriceCentavos!: number | null;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'uuid', isArray: true }) optionValueIds!: string[];
  @ApiProperty() availableStock!: number;
  @ApiProperty({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] }) stockStatus!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ProductSummaryDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) merchantId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) brandId!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] }) status!: string;
  @ApiProperty() isFeatured!: boolean;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) publishedAt!: string | null;
  @ApiProperty() availableStock!: number;
  @ApiProperty({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] }) stockStatus!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ProductDetailsDataDto extends ProductSummaryDataDto {
  @ApiPropertyOptional({ nullable: true }) shortDescription!: string | null;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ format: 'uuid', isArray: true }) categoryIds!: string[];
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) primaryCategoryId!: string | null;
  @ApiProperty({ format: 'uuid', isArray: true }) collectionIds!: string[];
  @ApiProperty({ type: [ProductOptionDataDto] }) options!: ProductOptionDataDto[];
  @ApiProperty({ type: [ProductVariantDataDto] }) variants!: ProductVariantDataDto[];
}

export class ProductSuccessResponseDto extends CatalogSuccessResponseDto<ProductDetailsDataDto> {
  @ApiProperty({ type: ProductDetailsDataDto }) declare data: ProductDetailsDataDto;
}

export class ProductListDataDto {
  @ApiProperty({ type: [ProductSummaryDataDto] }) items!: ProductSummaryDataDto[];
  @ApiPropertyOptional({ nullable: true }) nextCursor!: string | null;
}

export class ProductListSuccessResponseDto extends CatalogSuccessResponseDto<ProductListDataDto> {
  @ApiProperty({ type: ProductListDataDto }) declare data: ProductListDataDto;
}
