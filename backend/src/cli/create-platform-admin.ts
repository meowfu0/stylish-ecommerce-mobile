import 'dotenv/config';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { CliApplicationModule } from './cli-application.module';
import { DatabaseService } from '../database/database.service';
import { auditLogs, roles, userPlatformRoles, userProfiles, users } from '../database/schema';
import { AccessControlBootstrapService } from '../modules/access-control/bootstrap/access-control-bootstrap.service';
import { PasswordService } from '../modules/auth/services/password.service';

const logger = new Logger('CreatePlatformAdminCommand');

const getEmailArgument = (): string | undefined => {
  const argument = process.argv.find((value) => value.startsWith('--email='));
  return argument?.slice('--email='.length).trim().toLowerCase();
};

async function main(): Promise<void> {
  const email = getEmailArgument();

  if (!email) {
    throw new Error('Provide --email=admin@example.com');
  }

  const app = await NestFactory.createApplicationContext(CliApplicationModule, {
    logger: ['error', 'warn'],
  });

  try {
    await app.get(AccessControlBootstrapService).bootstrap();
    const databaseService = app.get(DatabaseService);
    const passwordService = app.get(PasswordService);
    const result = await databaseService.db.transaction(async (tx) => {
      const [adminRole] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(
          and(
            eq(roles.scope, 'PLATFORM'),
            eq(roles.key, 'platform_admin'),
            isNull(roles.deletedAt),
          ),
        )
        .limit(1);

      if (!adminRole) {
        throw new Error('Platform administrator role is unavailable');
      }

      let [user] = await tx
        .select()
        .from(users)
        .where(eq(users.email, email))
        .for('update')
        .limit(1);
      let outcome: 'CREATED' | 'PROMOTED' | 'UNCHANGED' = 'PROMOTED';

      if (!user) {
        const password = process.env.INITIAL_ADMIN_PASSWORD;

        if (!password || password.length < 12 || password.length > 128) {
          throw new Error(
            'INITIAL_ADMIN_PASSWORD must contain between 12 and 128 characters when creating a user',
          );
        }

        const passwordHash = await passwordService.hash(password);
        const now = new Date();
        [user] = await tx
          .insert(users)
          .values({
            email,
            passwordHash,
            status: 'ACTIVE',
            emailVerifiedAt: now,
            statusChangedAt: now,
          })
          .returning();

        if (!user) {
          throw new Error('Platform administrator creation failed');
        }

        await tx.insert(userProfiles).values({ userId: user.id });
        outcome = 'CREATED';
      } else if (user.status !== 'ACTIVE' || !user.emailVerifiedAt || user.deletedAt) {
        const now = new Date();
        [user] = await tx
          .update(users)
          .set({
            status: 'ACTIVE',
            emailVerifiedAt: user.emailVerifiedAt ?? now,
            deletedAt: null,
            statusChangedAt: now,
            updatedAt: now,
            authVersion: sql`${users.authVersion} + 1`,
          })
          .where(eq(users.id, user.id))
          .returning();
      }

      if (!user) {
        throw new Error('Platform administrator update failed');
      }

      const assignment = await tx
        .insert(userPlatformRoles)
        .values({ userId: user.id, roleId: adminRole.id, assignedByUserId: user.id })
        .onConflictDoNothing()
        .returning({ userId: userPlatformRoles.userId });

      if (outcome === 'PROMOTED' && assignment.length === 0) {
        outcome = 'UNCHANGED';
      }

      await tx.insert(auditLogs).values({
        actorUserId: user.id,
        action: 'access_control.platform_admin_assigned',
        entityType: 'USER',
        entityId: user.id,
        metadata: { outcome, source: 'EXPLICIT_CLI' },
      });

      return outcome;
    });

    logger.log({ event: 'platform_admin.command.completed', outcome: result });
  } finally {
    await app.close();
  }
}

void main().catch(() => {
  logger.error({
    event: 'platform_admin.command.failed',
    message: 'Platform administrator command did not complete',
  });
  process.exitCode = 1;
});
