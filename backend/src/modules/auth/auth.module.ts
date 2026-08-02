import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { EmailModule } from '../../infrastructure/email/email.module';

import { AuthController } from './auth.controller';
import { AuthAuditService } from './services/auth-audit.service';
import { AuthService } from './services/auth.service';
import { AuthStore } from './services/auth.store';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

@Module({
  controllers: [AuthController],
  imports: [JwtModule.register({}), EmailModule],
  exports: [AuthService, AuthStore],
  providers: [AuthAuditService, AuthService, AuthStore, PasswordService, TokenService],
})
export class AuthModule {}
