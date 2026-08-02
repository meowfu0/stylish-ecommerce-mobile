import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ProductImageSuccessResponseDto<T> {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty() message!: string;
  data!: T;
}

export class ProductImageDataDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) merchantId!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiPropertyOptional({ nullable: true }) altText!: string | null;
  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] }) contentType!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty() displayOrder!: number;
  @ApiProperty() isPrimary!: boolean;
  @ApiPropertyOptional({ nullable: true }) signedUrl!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) readUrlExpiresAt!: string | null;
  @ApiProperty({ format: 'date-time' }) confirmedAt!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ProductImageResponseDto extends ProductImageSuccessResponseDto<ProductImageDataDto> {
  @ApiProperty({ type: ProductImageDataDto }) declare data: ProductImageDataDto;
}

export class ProductImageListDataDto {
  @ApiProperty({ type: [ProductImageDataDto] }) items!: ProductImageDataDto[];
}

export class ProductImageListResponseDto extends ProductImageSuccessResponseDto<ProductImageListDataDto> {
  @ApiProperty({ type: ProductImageListDataDto }) declare data: ProductImageListDataDto;
}

export class ProductImageUploadRequestDataDto {
  @ApiProperty({ format: 'uuid' }) imageId!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] }) contentType!: string;
  @ApiProperty() fileSizeBytes!: number;
  @ApiProperty() storagePath!: string;
  @ApiProperty({ description: 'Short-lived Supabase signed upload URL.' }) uploadUrl!: string;
  @ApiProperty({ description: 'Short-lived token used by uploadToSignedUrl.' })
  uploadToken!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class ProductImageUploadRequestResponseDto extends ProductImageSuccessResponseDto<ProductImageUploadRequestDataDto> {
  @ApiProperty({ type: ProductImageUploadRequestDataDto })
  declare data: ProductImageUploadRequestDataDto;
}

export class ProductImageSignedReadDataDto {
  @ApiProperty({ format: 'uuid' }) imageId!: string;
  @ApiProperty() signedUrl!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class ProductImageSignedReadResponseDto extends ProductImageSuccessResponseDto<ProductImageSignedReadDataDto> {
  @ApiProperty({ type: ProductImageSignedReadDataDto })
  declare data: ProductImageSignedReadDataDto;
}

export class ProductImageDeleteDataDto {
  @ApiProperty({ example: true }) deleted!: true;
  @ApiProperty({ format: 'uuid' }) imageId!: string;
}

export class ProductImageDeleteResponseDto extends ProductImageSuccessResponseDto<ProductImageDeleteDataDto> {
  @ApiProperty({ type: ProductImageDeleteDataDto }) declare data: ProductImageDeleteDataDto;
}
