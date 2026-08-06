import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import databaseConfig from '../config/database.config';
import { validateDatabaseEnvironment } from '../config/env.validation';
import { DatabaseModule } from '../database/database.module';
import { AccessControlBootstrapService } from '../modules/access-control/bootstrap/access-control-bootstrap.service';
import { PasswordService } from '../modules/auth/services/password.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      expandVariables: false,
      isGlobal: true,
      load: [databaseConfig],
      validate: validateDatabaseEnvironment,
    }),
    DatabaseModule,
  ],
  providers: [AccessControlBootstrapService, PasswordService],
})
export class CliApplicationModule {}
