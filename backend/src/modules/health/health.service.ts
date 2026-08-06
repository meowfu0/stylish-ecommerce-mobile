import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import type { HealthDataDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getHealth(): Promise<HealthDataDto> {
    const databaseConnected = await this.databaseService.checkConnection();

    if (!databaseConnected) {
      throw new ServiceUnavailableException({
        message: 'Stylish API is temporarily unavailable',
        errors: [
          {
            field: 'database',
            message: 'Database connection is unavailable',
          },
        ],
      });
    }

    return {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
