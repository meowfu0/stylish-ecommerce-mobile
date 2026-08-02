import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { STOREFRONT_SORT_VALUES } from '../storefront.constants';
import type { StorefrontSort } from '../storefront.constants';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const lower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const booleanQuery = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export class StorefrontDirectoryQueryDto {
  @ApiPropertyOptional({ default: 100, maximum: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class StorefrontMerchantDirectoryQueryDto extends StorefrontDirectoryQueryDto {
  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @Transform(lower)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(180)
  merchantSlug?: string;
}

export class StorefrontProductListQueryDto {
  @ApiPropertyOptional({ description: 'Opaque cursor returned by the previous page.' })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  cursor?: string;

  @ApiPropertyOptional({ default: 20, maximum: 50, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @Transform(lower)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(180)
  categorySlug?: string;

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @Transform(lower)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(180)
  collectionSlug?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  brandId?: string;

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @Transform(lower)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(180)
  merchantSlug?: string;

  @ApiPropertyOptional({ description: 'Minimum variant price in Philippine centavos.', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPriceCentavos?: number;

  @ApiPropertyOptional({ description: 'Maximum variant price in Philippine centavos.', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceCentavos?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(booleanQuery)
  @IsBoolean()
  inStockOnly?: boolean;

  @ApiPropertyOptional({ enum: STOREFRONT_SORT_VALUES, default: 'recommended' })
  @IsOptional()
  @IsIn(STOREFRONT_SORT_VALUES)
  sort?: StorefrontSort;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(booleanQuery)
  @IsBoolean()
  featured?: boolean;
}

export const storefrontSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
