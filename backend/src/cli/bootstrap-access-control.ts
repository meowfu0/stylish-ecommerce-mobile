import 'dotenv/config';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AccessControlBootstrapService } from '../modules/access-control/bootstrap/access-control-bootstrap.service';
import { CliApplicationModule } from './cli-application.module';

const logger = new Logger('AccessControlBootstrapCommand');

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(CliApplicationModule, {
    logger: ['error', 'warn'],
  });

  try {
    const result = await app.get(AccessControlBootstrapService).bootstrap();
    logger.log({
      event: 'access_control.bootstrap.completed',
      permissions: result.permissions,
      roles: result.roles,
    });
  } finally {
    await app.close();
  }
}

void main().catch(() => {
  logger.error({
    event: 'access_control.bootstrap.failed',
    message: 'Access-control bootstrap did not complete',
  });
  process.exitCode = 1;
});
