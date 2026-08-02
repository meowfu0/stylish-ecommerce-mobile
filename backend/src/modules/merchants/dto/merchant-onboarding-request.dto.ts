import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const lower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class MerchantProfileInputDto {
  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ example: 'support@example.com', maxLength: 320 })
  @IsOptional()
  @Transform(lower)
  @IsEmail()
  @MaxLength(320)
  supportEmail?: string;

  @ApiPropertyOptional({ example: '+639171234567', maxLength: 32 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  supportPhone?: string;

  @ApiPropertyOptional({ example: 'https://merchant.example.com' })
  @IsOptional()
  @Transform(trim)
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  websiteUrl?: string;
}

export class MerchantBusinessAddressInputDto {
  @ApiProperty({ example: 'Juan Dela Cruz', maxLength: 150 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  contactName!: string;

  @ApiProperty({ example: '+639171234567', maxLength: 32 })
  @Transform(trim)
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  phone!: string;

  @ApiProperty({ example: '123 Rizal Street', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  addressLine1!: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  barangay?: string;

  @ApiProperty({ example: 'Makati', maxLength: 150 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  city!: string;

  @ApiProperty({ example: 'Metro Manila', maxLength: 150 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  province!: string;

  @ApiProperty({ example: '1200', maxLength: 20 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  postalCode!: string;

  @ApiPropertyOptional({ default: 'PH', example: 'PH' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;
}

export class CreateMerchantApplicationDto {
  @ApiProperty({ example: 'juan-fashion', maxLength: 180 })
  @Transform(lower)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(180)
  slug!: string;

  @ApiProperty({ example: 'Juan Fashion Trading', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  legalName!: string;

  @ApiProperty({ example: 'Juan Fashion', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName!: string;

  @ApiPropertyOptional({ type: MerchantProfileInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MerchantProfileInputDto)
  profile?: MerchantProfileInputDto;

  @ApiPropertyOptional({ type: MerchantBusinessAddressInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MerchantBusinessAddressInputDto)
  businessAddress?: MerchantBusinessAddressInputDto;
}

export class UpdateMerchantApplicationDto {
  @ApiPropertyOptional({ example: 'juan-fashion', maxLength: 180 })
  @IsOptional()
  @Transform(lower)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(180)
  slug?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional({ type: MerchantProfileInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MerchantProfileInputDto)
  profile?: MerchantProfileInputDto;

  @ApiPropertyOptional({ type: MerchantBusinessAddressInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MerchantBusinessAddressInputDto)
  businessAddress?: MerchantBusinessAddressInputDto;
}

export class ReviewMerchantApplicationDto {
  @ApiProperty({ minLength: 3, maxLength: 1000 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class ApproveMerchantApplicationDto {
  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  commissionRateBasisPoints?: number;
}

export class UpdateApprovedMerchantDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional({ type: MerchantProfileInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MerchantProfileInputDto)
  profile?: MerchantProfileInputDto;
}

export class MerchantApplicationListQueryDto {
  @ApiPropertyOptional({
    enum: ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'],
  })
  @IsOptional()
  @IsString()
  @Matches(/^(DRAFT|SUBMITTED|CHANGES_REQUESTED|APPROVED|REJECTED)$/)
  status?: 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Opaque cursor returned by the previous response.' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;
}
