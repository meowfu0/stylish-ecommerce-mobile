import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);

  if (!configService.getOrThrow<boolean>('app.swaggerEnabled')) {
    return;
  }

  const apiPrefix = configService.getOrThrow<string>('app.apiPrefix');
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Stylish API')
    .setDescription('REST API for the Stylish multi-vendor marketplace.')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '15-minute access token returned by login or refresh.',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    customSiteTitle: 'Stylish API Documentation',
    jsonDocumentUrl: `${apiPrefix}/docs-json`,
    swaggerOptions: {
      displayRequestDuration: true,
      persistAuthorization: false,
    },
  });
}
