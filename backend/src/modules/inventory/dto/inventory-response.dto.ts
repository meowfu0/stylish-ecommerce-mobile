import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class InventorySuccessResponseDto<T> {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty() message!: string;
  data!: T;
}

export class InventoryLocationDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) merchantId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty() isActive!: boolean;
  @ApiPropertyOptional({ nullable: true }) addressSnapshot!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class InventoryLocationSuccessResponseDto extends InventorySuccessResponseDto<InventoryLocationDataDto> {
  @ApiProperty({ type: InventoryLocationDataDto }) declare data: InventoryLocationDataDto;
}

export class InventoryLocationListDataDto {
  @ApiProperty({ type: [InventoryLocationDataDto] }) items!: InventoryLocationDataDto[];
}

export class InventoryLocationListSuccessResponseDto extends InventorySuccessResponseDto<InventoryLocationListDataDto> {
  @ApiProperty({ type: InventoryLocationListDataDto }) declare data: InventoryLocationListDataDto;
}

export class InventoryLevelDataDto {
  @ApiProperty({ format: 'uuid' }) merchantId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) locationId!: string | null;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty({ format: 'uuid' }) variantId!: string;
  @ApiProperty() variantName!: string;
  @ApiProperty() sku!: string;
  @ApiPropertyOptional({ nullable: true }) barcode!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() onHand!: number;
  @ApiProperty() reserved!: number;
  @ApiProperty() available!: number;
  @ApiProperty() reorderThreshold!: number;
  @ApiPropertyOptional({ nullable: true }) version!: number | null;
  @ApiProperty({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] }) stockStatus!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class InventoryLevelPageDataDto {
  @ApiProperty({ type: [InventoryLevelDataDto] }) items!: InventoryLevelDataDto[];
  @ApiPropertyOptional({ nullable: true }) nextCursor!: string | null;
}

export class InventoryLevelPageSuccessResponseDto extends InventorySuccessResponseDto<InventoryLevelPageDataDto> {
  @ApiProperty({ type: InventoryLevelPageDataDto }) declare data: InventoryLevelPageDataDto;
}

export class InventoryVariantLocationDataDto {
  @ApiProperty({ format: 'uuid' }) locationId!: string;
  @ApiProperty() locationCode!: string;
  @ApiProperty() locationName!: string;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() onHand!: number;
  @ApiProperty() reserved!: number;
  @ApiProperty() available!: number;
  @ApiProperty() reorderThreshold!: number;
  @ApiProperty() version!: number;
  @ApiProperty({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] }) stockStatus!: string;
}

export class InventoryVariantTotalsDataDto {
  @ApiProperty() onHand!: number;
  @ApiProperty() reserved!: number;
  @ApiProperty() available!: number;
  @ApiProperty() reorderThreshold!: number;
  @ApiProperty({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] }) stockStatus!: string;
}

export class InventoryVariantDataDto {
  @ApiProperty({ format: 'uuid' }) merchantId!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty({ format: 'uuid' }) variantId!: string;
  @ApiProperty() variantName!: string;
  @ApiProperty() sku!: string;
  @ApiPropertyOptional({ nullable: true }) barcode!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: InventoryVariantTotalsDataDto }) totals!: InventoryVariantTotalsDataDto;
  @ApiProperty({ type: [InventoryVariantLocationDataDto] })
  locations!: InventoryVariantLocationDataDto[];
}

export class InventoryVariantSuccessResponseDto extends InventorySuccessResponseDto<InventoryVariantDataDto> {
  @ApiProperty({ type: InventoryVariantDataDto }) declare data: InventoryVariantDataDto;
}

export class InventoryMovementDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) merchantId!: string;
  @ApiProperty({ format: 'uuid' }) locationId!: string;
  @ApiProperty() locationCode!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty({ format: 'uuid' }) variantId!: string;
  @ApiProperty() variantName!: string;
  @ApiProperty() sku!: string;
  @ApiProperty({ enum: ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'] }) movementType!: string;
  @ApiProperty() deltaOnHand!: number;
  @ApiProperty() beforeOnHand!: number;
  @ApiProperty() afterOnHand!: number;
  @ApiProperty() beforeReserved!: number;
  @ApiProperty() afterReserved!: number;
  @ApiProperty() reason!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) createdByUserId!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class InventoryMovementPageDataDto {
  @ApiProperty({ type: [InventoryMovementDataDto] }) items!: InventoryMovementDataDto[];
  @ApiPropertyOptional({ nullable: true }) nextCursor!: string | null;
}

export class InventoryMovementPageSuccessResponseDto extends InventorySuccessResponseDto<InventoryMovementPageDataDto> {
  @ApiProperty({ type: InventoryMovementPageDataDto }) declare data: InventoryMovementPageDataDto;
}

export class InventoryAdjustmentDataDto {
  @ApiProperty({ type: InventoryMovementDataDto }) movement!: InventoryMovementDataDto;
  @ApiProperty({ type: InventoryLevelDataDto }) balance!: InventoryLevelDataDto;
}

export class InventoryAdjustmentSuccessResponseDto extends InventorySuccessResponseDto<InventoryAdjustmentDataDto> {
  @ApiProperty({ type: InventoryAdjustmentDataDto }) declare data: InventoryAdjustmentDataDto;
}
