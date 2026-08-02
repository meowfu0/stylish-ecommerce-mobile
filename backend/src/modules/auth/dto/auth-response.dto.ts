import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ enum: ['PENDING_VERIFICATION', 'ACTIVE', 'DISABLED'] })
  status!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  emailVerifiedAt!: string | null;
}

export class AuthTokensDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ enum: ['Bearer'] })
  tokenType!: 'Bearer';

  @ApiProperty({ example: 900 })
  expiresIn!: number;

  @ApiProperty({ format: 'date-time' })
  refreshTokenExpiresAt!: string;
}

export class RegistrationDataDto {
  @ApiProperty({ type: UserSummaryDto })
  user!: UserSummaryDto;
}

export class AuthenticatedDataDto {
  @ApiProperty({ type: UserSummaryDto })
  user!: UserSummaryDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens!: AuthTokensDto;
}

export class MessageAcceptedDataDto {
  @ApiProperty({ example: true })
  accepted!: boolean;
}

export class ProfileSummaryDto {
  @ApiPropertyOptional({ nullable: true })
  displayName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  firstName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatarStoragePath!: string | null;
}

export class MerchantAccessDto {
  @ApiProperty({ format: 'uuid' })
  merchantId!: string;

  @ApiProperty()
  merchantName!: string;

  @ApiProperty({ format: 'uuid' })
  membershipId!: string;

  @ApiProperty({ type: [String] })
  roles!: string[];
}

export class MeDataDto extends UserSummaryDto {
  @ApiPropertyOptional({ type: ProfileSummaryDto, nullable: true })
  profile!: ProfileSummaryDto | null;

  @ApiProperty({ type: [String] })
  platformRoles!: string[];

  @ApiProperty({ type: [MerchantAccessDto] })
  merchantMemberships!: MerchantAccessDto[];
}

export class RegistrationSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: RegistrationDataDto })
  data!: RegistrationDataDto;
}

export class AuthenticatedSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: AuthenticatedDataDto })
  data!: AuthenticatedDataDto;
}

export class MessageAcceptedSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: MessageAcceptedDataDto })
  data!: MessageAcceptedDataDto;
}

export class MeSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: MeDataDto })
  data!: MeDataDto;
}
