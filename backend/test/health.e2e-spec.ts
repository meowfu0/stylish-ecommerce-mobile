import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { DatabaseService } from '../src/database/database.service';

const healthyResponseSchema = z.object({
  success: z.literal(true),
  message: z.literal('Stylish API is running'),
  data: z.object({
    status: z.literal('healthy'),
    database: z.literal('connected'),
    timestamp: z.iso.datetime(),
  }),
});

const unavailableResponseSchema = z.object({
  success: z.literal(false),
  message: z.literal('Stylish API is temporarily unavailable'),
  errors: z.tuple([
    z.object({
      field: z.literal('database'),
      message: z.literal('Database connection is unavailable'),
    }),
  ]),
});

describe('Health endpoint (e2e)', () => {
  const checkConnection = jest.fn<Promise<boolean>, []>();
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({
        checkConnection,
      })
      .compile();

    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    checkConnection.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 and the healthy response contract', async () => {
    checkConnection.mockResolvedValue(true);

    const response = await request(server)
      .get('/api/health')
      .set('X-Request-Id', 'health-e2e-healthy')
      .expect('Content-Type', /json/)
      .expect('X-Request-Id', 'health-e2e-healthy')
      .expect(200);
    const body = healthyResponseSchema.parse(JSON.parse(response.text) as unknown);

    expect(body.data.timestamp).toBeTruthy();
  });

  it('returns 503 and the safe database-unavailable response contract', async () => {
    checkConnection.mockResolvedValue(false);

    const response = await request(server)
      .get('/api/health')
      .set('X-Request-Id', 'health-e2e-unavailable')
      .expect('Content-Type', /json/)
      .expect('X-Request-Id', 'health-e2e-unavailable')
      .expect(503);
    const body = unavailableResponseSchema.parse(JSON.parse(response.text) as unknown);

    expect(body).toEqual({
      success: false,
      message: 'Stylish API is temporarily unavailable',
      errors: [
        {
          field: 'database',
          message: 'Database connection is unavailable',
        },
      ],
    });
  });
});
