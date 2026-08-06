import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';

export class MerchantProfileResponseDto {
  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  supportEmail!: string | null;

  @ApiPropertyOptional({ nullable: true })
  supportPhone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  websiteUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoStoragePath!: string | null;

  @ApiPropertyOptional({ nullable: true })
  bannerStoragePath!: string | null;
}

export class MerchantAddressResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  contactName!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  addressLine1!: string;

  @ApiPropertyOptional({ nullable: true })
  addressLine2!: string | null;

  @ApiPropertyOptional({ nullable: true })
  barangay!: string | null;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  province!: string;

  @ApiProperty()
  postalCode!: string;

  @ApiProperty()
  countryCode!: string;
}

export class MerchantVerificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['PENDING', 'CHANGES_REQUESTED', 'VERIFIED', 'REJECTED'] })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  submittedAt!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  reviewedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  rejectionReason!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewNote!: string | null;
}

export class MerchantApplicationDataDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'] })
  applicationStatus!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  legalName!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'] })
  status!: string;

  @ApiProperty({ enum: ['UNVERIFIED', 'PENDING', 'CHANGES_REQUESTED', 'VERIFIED', 'REJECTED'] })
  verificationStatus!: string;

  @ApiPropertyOptional({ type: MerchantProfileResponseDto, nullable: true })
  profile!: MerchantProfileResponseDto | null;

  @ApiPropertyOptional({ type: MerchantAddressResponseDto, nullable: true })
  businessAddress!: MerchantAddressResponseDto | null;

  @ApiPropertyOptional({ type: MerchantVerificationResponseDto, nullable: true })
  latestVerification!: MerchantVerificationResponseDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class MerchantApplicationSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: MerchantApplicationDataDto })
  data!: MerchantApplicationDataDto;
}

export class MerchantApplicationListDataDto {
  @ApiProperty({ type: [MerchantApplicationDataDto] })
  items!: MerchantApplicationDataDto[];

  @ApiPropertyOptional({ nullable: true })
  nextCursor!: string | null;
}

export class MerchantApplicationListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: MerchantApplicationListDataDto })
  data!: MerchantApplicationListDataDto;
}

export class MerchantApplicationDetailsDataDto extends MerchantApplicationDataDto {
  @ApiProperty({ type: [MerchantVerificationResponseDto] })
  verificationHistory!: MerchantVerificationResponseDto[];
}

export class MerchantApplicationDetailsSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: MerchantApplicationDetailsDataDto })
  data!: MerchantApplicationDetailsDataDto;
}

export class ApprovedMerchantDataDto extends OmitType(MerchantApplicationDataDto, [
  'latestVerification',
] as const) {
  @ApiProperty({ enum: ['APPROVED'] })
  declare applicationStatus: 'APPROVED';

  @ApiProperty({ minimum: 0, maximum: 10000 })
  commissionRateBasisPoints!: number;
}

export class ApprovedMerchantSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: ApprovedMerchantDataDto })
  data!: ApprovedMerchantDataDto;
}
