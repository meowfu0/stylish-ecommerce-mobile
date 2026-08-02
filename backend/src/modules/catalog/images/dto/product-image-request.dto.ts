import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import {
  PRODUCT_IMAGE_ALLOWED_MIME_TYPES,
  PRODUCT_IMAGE_MAX_BYTES,
} from '../../../../infrastructure/storage/supabase-storage.constants';

const trimNullable = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || null : value;

export class InitializeProductImageUploadDto {
  @ApiProperty({ enum: PRODUCT_IMAGE_ALLOWED_MIME_TYPES, example: 'image/jpeg' })
  @IsIn(PRODUCT_IMAGE_ALLOWED_MIME_TYPES)
  contentType!: (typeof PRODUCT_IMAGE_ALLOWED_MIME_TYPES)[number];

  @ApiProperty({ maximum: PRODUCT_IMAGE_MAX_BYTES, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PRODUCT_IMAGE_MAX_BYTES)
  fileSizeBytes!: number;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @IsOptional()
  @Transform(trimNullable)
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @MaxLength(255)
  altText?: string | null;
}

export class UpdateProductImageDto {
  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @IsOptional()
  @Transform(trimNullable)
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @MaxLength(255)
  altText?: string | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class ReorderProductImagesDto {
  @ApiProperty({ format: 'uuid', isArray: true, maxItems: 50, minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  imageIds!: string[];
}
