import { ApiProperty } from '@nestjs/swagger';

export class HealthDataDto {
  @ApiProperty({ example: 'healthy' })
  declare status: 'healthy';

  @ApiProperty({ example: 'connected' })
  declare database: 'connected';

  @ApiProperty({
    example: '2026-07-30T00:00:00.000Z',
    format: 'date-time',
  })
  declare timestamp: string;
}

export class HealthSuccessResponseDto {
  @ApiProperty({ example: true })
  declare success: true;

  @ApiProperty({ example: 'Stylish API is running' })
  declare message: string;

  @ApiProperty({ type: HealthDataDto })
  declare data: HealthDataDto;
}

export class HealthErrorItemDto {
  @ApiProperty({ example: 'database' })
  declare field: string;

  @ApiProperty({ example: 'Database connection is unavailable' })
  declare message: string;
}

export class HealthUnavailableResponseDto {
  @ApiProperty({ example: false })
  declare success: false;

  @ApiProperty({ example: 'Stylish API is temporarily unavailable' })
  declare message: string;

  @ApiProperty({ isArray: true, type: HealthErrorItemDto })
  declare errors: HealthErrorItemDto[];
}
