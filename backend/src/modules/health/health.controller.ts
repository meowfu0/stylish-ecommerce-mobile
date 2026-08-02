import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ApiMessage } from '../../common/decorators/api-message.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  HealthDataDto,
  HealthSuccessResponseDto,
  HealthUnavailableResponseDto,
} from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiMessage('Stylish API is running')
  @ApiOperation({
    summary: 'Check API and PostgreSQL availability',
  })
  @ApiOkResponse({
    description: 'The API and PostgreSQL database are available.',
    type: HealthSuccessResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'The PostgreSQL database is unavailable.',
    type: HealthUnavailableResponseDto,
  })
  getHealth(): Promise<HealthDataDto> {
    return this.healthService.getHealth();
  }
}
