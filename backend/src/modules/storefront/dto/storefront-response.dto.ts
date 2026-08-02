import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class StorefrontSuccessResponseDto<T> {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty() message!: string;
  data!: T;
}

export class StorefrontMerchantSummaryDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() displayName!: string;
}

export class StorefrontImageDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ nullable: true }) altText!: string | null;
  @ApiProperty() signedUrl!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class StorefrontBrandDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ type: StorefrontMerchantSummaryDataDto })
  merchant!: StorefrontMerchantSummaryDataDto;
}

export class StorefrontCategoryDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) parentId!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
}

export class StorefrontCollectionDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) startsAt!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) endsAt!: string | null;
  @ApiProperty({ type: StorefrontMerchantSummaryDataDto })
  merchant!: StorefrontMerchantSummaryDataDto;
}

export class StorefrontProductBrandDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
}

export class StorefrontProductSummaryDataDto {
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional({ nullable: true }) shortDescription!: string | null;
  @ApiProperty() isFeatured!: boolean;
  @ApiProperty({ format: 'date-time' }) publishedAt!: string;
  @ApiProperty({ enum: ['PHP'] }) currency!: 'PHP';
  @ApiProperty({ description: 'Integer Philippine centavos.' }) minPriceCentavos!: number;
  @ApiProperty({ description: 'Integer Philippine centavos.' }) maxPriceCentavos!: number;
  @ApiProperty({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] })
  stockStatus!: string;
  @ApiProperty({ type: StorefrontMerchantSummaryDataDto })
  merchant!: StorefrontMerchantSummaryDataDto;
  @ApiPropertyOptional({ nullable: true, type: StorefrontProductBrandDataDto })
  brand!: StorefrontProductBrandDataDto | null;
  @ApiPropertyOptional({ nullable: true, type: StorefrontImageDataDto })
  primaryImage!: StorefrontImageDataDto | null;
}

export class StorefrontOptionValueDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() value!: string;
  @ApiProperty() displayLabel!: string;
  @ApiPropertyOptional({ nullable: true }) swatchHex!: string | null;
}

export class StorefrontOptionDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [StorefrontOptionValueDataDto] }) values!: StorefrontOptionValueDataDto[];
}

export class StorefrontVariantDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ description: 'Integer Philippine centavos.' }) priceCentavos!: number;
  @ApiPropertyOptional({ nullable: true }) compareAtPriceCentavos!: number | null;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty({ format: 'uuid', isArray: true }) optionValueIds!: string[];
  @ApiProperty({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] })
  stockStatus!: string;
}

export class StorefrontProductDetailsDataDto extends StorefrontProductSummaryDataDto {
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ type: [StorefrontCategoryDataDto] }) categories!: StorefrontCategoryDataDto[];
  @ApiProperty({ type: [StorefrontCollectionDataDto] })
  collections!: StorefrontCollectionDataDto[];
  @ApiProperty({ type: [StorefrontOptionDataDto] }) options!: StorefrontOptionDataDto[];
  @ApiProperty({ type: [StorefrontVariantDataDto] }) variants!: StorefrontVariantDataDto[];
}

export class StorefrontProductListDataDto {
  @ApiProperty({ type: [StorefrontProductSummaryDataDto] })
  items!: StorefrontProductSummaryDataDto[];
  @ApiPropertyOptional({ nullable: true }) nextCursor!: string | null;
}

export class StorefrontProductListResponseDto extends StorefrontSuccessResponseDto<StorefrontProductListDataDto> {
  @ApiProperty({ type: StorefrontProductListDataDto }) declare data: StorefrontProductListDataDto;
}

export class StorefrontProductResponseDto extends StorefrontSuccessResponseDto<StorefrontProductDetailsDataDto> {
  @ApiProperty({ type: StorefrontProductDetailsDataDto })
  declare data: StorefrontProductDetailsDataDto;
}

export class StorefrontCategoryListDataDto {
  @ApiProperty({ type: [StorefrontCategoryDataDto] }) items!: StorefrontCategoryDataDto[];
}

export class StorefrontCategoryListResponseDto extends StorefrontSuccessResponseDto<StorefrontCategoryListDataDto> {
  @ApiProperty({ type: StorefrontCategoryListDataDto })
  declare data: StorefrontCategoryListDataDto;
}

export class StorefrontCollectionListDataDto {
  @ApiProperty({ type: [StorefrontCollectionDataDto] }) items!: StorefrontCollectionDataDto[];
}

export class StorefrontCollectionListResponseDto extends StorefrontSuccessResponseDto<StorefrontCollectionListDataDto> {
  @ApiProperty({ type: StorefrontCollectionListDataDto })
  declare data: StorefrontCollectionListDataDto;
}

export class StorefrontCollectionDetailsDataDto extends StorefrontCollectionDataDto {
  @ApiProperty({ type: StorefrontProductListDataDto }) products!: StorefrontProductListDataDto;
}

export class StorefrontCollectionResponseDto extends StorefrontSuccessResponseDto<StorefrontCollectionDetailsDataDto> {
  @ApiProperty({ type: StorefrontCollectionDetailsDataDto })
  declare data: StorefrontCollectionDetailsDataDto;
}

export class StorefrontBrandListDataDto {
  @ApiProperty({ type: [StorefrontBrandDataDto] }) items!: StorefrontBrandDataDto[];
}

export class StorefrontBrandListResponseDto extends StorefrontSuccessResponseDto<StorefrontBrandListDataDto> {
  @ApiProperty({ type: StorefrontBrandListDataDto }) declare data: StorefrontBrandListDataDto;
}

export class StorefrontMerchantDataDto extends StorefrontMerchantSummaryDataDto {
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true }) websiteUrl!: string | null;
  @ApiProperty({ enum: ['PHP'] }) currency!: 'PHP';
}

export class StorefrontMerchantResponseDto extends StorefrontSuccessResponseDto<StorefrontMerchantDataDto> {
  @ApiProperty({ type: StorefrontMerchantDataDto }) declare data: StorefrontMerchantDataDto;
}
