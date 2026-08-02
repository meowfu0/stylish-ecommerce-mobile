import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApplication } from './bootstrap/configure-application';
import { setupSwagger } from './docs/swagger.config';

const bootstrapLogger = new ConsoleLogger({
  colors: false,
  json: true,
  prefix: 'StylishAPI',
});

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: bootstrapLogger,
  });
  const configService = app.get(ConfigService);
  const apiPrefix = configService.getOrThrow<string>('app.apiPrefix');
  const port = configService.getOrThrow<number>('app.port');

  configureApplication(app);
  setupSwagger(app);
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  bootstrapLogger.log({
    apiPrefix: `/${apiPrefix}`,
    event: 'application.started',
    port,
  });
}

void bootstrap().catch(() => {
  bootstrapLogger.error({
    event: 'application.startup-failed',
    message: 'Stylish API failed to start',
  });
  process.exitCode = 1;
});
