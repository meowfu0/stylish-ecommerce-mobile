import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createValidationException } from '../common/validation/validation-exception.factory';

export function configureApplication(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const apiPrefix = configService.getOrThrow<string>('app.apiPrefix');
  const corsOrigins = configService.getOrThrow<string[]>('app.corsOrigins');

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    credentials: false,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: corsOrigins,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: createValidationException,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      whitelist: true,
    }),
  );
}
