import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const checkConnection = jest.fn<Promise<boolean>, []>();
  let healthService: HealthService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: DatabaseService,
          useValue: {
            checkConnection,
          },
        },
      ],
    }).compile();

    healthService = moduleRef.get(HealthService);
    checkConnection.mockReset();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-30T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns healthy data when PostgreSQL is reachable', async () => {
    checkConnection.mockResolvedValue(true);

    await expect(healthService.getHealth()).resolves.toEqual({
      status: 'healthy',
      database: 'connected',
      timestamp: '2026-07-30T00:00:00.000Z',
    });
  });

  it('throws a safe service-unavailable response when PostgreSQL is unreachable', async () => {
    checkConnection.mockResolvedValue(false);

    await expect(healthService.getHealth()).rejects.toMatchObject({
      response: {
        message: 'Stylish API is temporarily unavailable',
        errors: [
          {
            field: 'database',
            message: 'Database connection is unavailable',
          },
        ],
      },
      status: 503,
    });
  });
});
