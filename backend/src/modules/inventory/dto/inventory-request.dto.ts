import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const upper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const booleanQuery = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export class InventoryCursorQueryDto {
  @ApiPropertyOptional({ description: 'Opaque cursor returned by the previous page.' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @ApiPropertyOptional({ default: 25, maximum: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class LocationListQueryDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(booleanQuery)
  @IsBoolean()
  activeOnly?: boolean;
}

export class CreateInventoryLocationDto {
  @ApiProperty({ example: 'WAREHOUSE-2', maxLength: 100 })
  @Transform(upper)
  @Matches(/^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/)
  @MaxLength(100)
  code!: string;

  @ApiProperty({ example: 'Quezon City Warehouse', maxLength: 150 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  addressSnapshot?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateInventoryLocationDto extends PartialType(CreateInventoryLocationDto) {}

export class InventoryLevelQueryDto extends InventoryCursorQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  productId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  variantId?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] })
  @IsOptional()
  @IsIn(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'])
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(booleanQuery)
  @IsBoolean()
  activeOnly?: boolean;
}

export class InventoryMovementQueryDto extends InventoryCursorQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  productId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  variantId?: string;

  @ApiPropertyOptional({ enum: ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'] })
  @IsOptional()
  @IsIn(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'])
  movementType?: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  createdFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  createdTo?: string;
}

export class CreateInventoryAdjustmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  locationId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  variantId!: string;

  @ApiProperty({ enum: ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'] })
  @IsIn(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'])
  operation!: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

  @ApiProperty({
    description: 'Positive for STOCK_IN/STOCK_OUT; signed non-zero delta for ADJUSTMENT.',
    maximum: 2147483647,
    minimum: -2147483647,
  })
  @IsInt()
  @Min(-2_147_483_647)
  @Max(2_147_483_647)
  quantity!: number;

  @ApiProperty({
    description: 'Current balance version returned by an inventory read.',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @ApiProperty({ minLength: 3, maxLength: 500 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderThreshold?: number;
}
