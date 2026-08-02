import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { and, asc, count, eq, gt, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { timingSafeEqual } from 'node:crypto';

import { DatabaseService } from '../../../database/database.service';
import {
  authActionTokens,
  authRefreshTokens,
  authSessions,
  merchantMembershipRoles,
  merchantMemberships,
  merchants,
  permissions,
  rolePermissions,
  roles,
  userPlatformRoles,
  userProfiles,
  users,
} from '../../../database/schema';
import type {
  AccessPrincipalResult,
  ActionTokenConsumptionResult,
  AuthMeResult,
  RefreshRotationResult,
  RequestMetadata,
  SessionCreationResult,
  UserAuthRecord,
} from '../types/auth.types';

type ActionPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

type NewActionToken = {
  tokenHash: string;
  expiresAt: Date;
  idempotencyKey: string;
};

type NewRefreshToken = {
  id: string;
  tokenHash: string;
  expiresAt: Date;
};

const toUserAuthRecord = (user: typeof users.$inferSelect): UserAuthRecord => ({
  id: user.id,
  email: user.email,
  passwordHash: user.passwordHash,
  status: user.status,
  emailVerifiedAt: user.emailVerifiedAt,
  authVersion: user.authVersion,
  deletedAt: user.deletedAt,
});

const hashesMatch = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

@Injectable()
export class AuthStore {
  constructor(private readonly databaseService: DatabaseService) {}

  async findUserByEmail(email: string): Promise<UserAuthRecord | null> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    return user ? toUserAuthRecord(user) : null;
  }

  async registerUser(input: {
    email: string;
    passwordHash: string;
    displayName?: string;
    actionToken: NewActionToken;
  }): Promise<UserAuthRecord> {
    return this.databaseService.db.transaction(async (tx) => {
      const [customerRole] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(
          and(
            eq(roles.scope, 'PLATFORM'),
            sql`lower(${roles.key}) = 'customer'`,
            isNull(roles.deletedAt),
          ),
        )
        .limit(1);

      if (!customerRole) {
        throw new ServiceUnavailableException({
          message: 'Authentication is temporarily unavailable',
          errors: [{ field: 'server', message: 'Access-control bootstrap is required' }],
        });
      }

      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          passwordHash: input.passwordHash,
        })
        .returning();

      if (!user) {
        throw new Error('User insert did not return a row');
      }

      await tx.insert(userProfiles).values({
        userId: user.id,
        displayName: input.displayName?.trim() || null,
      });
      await tx.insert(userPlatformRoles).values({
        userId: user.id,
        roleId: customerRole.id,
      });
      await tx.insert(authActionTokens).values({
        userId: user.id,
        purpose: 'EMAIL_VERIFICATION',
        ...input.actionToken,
      });

      return toUserAuthRecord(user);
    });
  }

  async replaceActionToken(
    userId: string,
    purpose: ActionPurpose,
    token: NewActionToken,
  ): Promise<void> {
    await this.databaseService.db.transaction(async (tx) => {
      const now = new Date();

      // Serializing per user prevents concurrent resend/reset requests from
      // racing the partial unique constraint for pending action tokens.
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .for('update')
        .limit(1);

      await tx
        .update(authActionTokens)
        .set({ revokedAt: now })
        .where(
          and(
            eq(authActionTokens.userId, userId),
            eq(authActionTokens.purpose, purpose),
            isNull(authActionTokens.consumedAt),
            isNull(authActionTokens.revokedAt),
          ),
        );
      await tx.insert(authActionTokens).values({
        userId,
        purpose,
        ...token,
      });
    });
  }

  async consumeEmailVerification(tokenHash: string): Promise<ActionTokenConsumptionResult> {
    return this.databaseService.db.transaction(async (tx) => {
      const now = new Date();
      const [actionToken] = await tx
        .select()
        .from(authActionTokens)
        .where(
          and(
            eq(authActionTokens.tokenHash, tokenHash),
            eq(authActionTokens.purpose, 'EMAIL_VERIFICATION'),
          ),
        )
        .for('update')
        .limit(1);

      if (
        !actionToken ||
        actionToken.consumedAt ||
        actionToken.revokedAt ||
        actionToken.expiresAt <= now
      ) {
        return { kind: 'INVALID' };
      }

      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, actionToken.userId))
        .for('update')
        .limit(1);

      if (!user || user.deletedAt || user.status === 'DISABLED') {
        return { kind: 'INVALID' };
      }

      await tx
        .update(authActionTokens)
        .set({ consumedAt: now })
        .where(eq(authActionTokens.id, actionToken.id));
      await tx
        .update(users)
        .set({
          emailVerifiedAt: user.emailVerifiedAt ?? now,
          status: 'ACTIVE',
          statusChangedAt: user.status === 'ACTIVE' ? user.statusChangedAt : now,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));

      return { kind: 'CONSUMED', userId: user.id };
    });
  }

  async consumePasswordReset(
    tokenHash: string,
    passwordHash: string,
  ): Promise<ActionTokenConsumptionResult> {
    return this.databaseService.db.transaction(async (tx) => {
      const now = new Date();
      const [actionToken] = await tx
        .select()
        .from(authActionTokens)
        .where(
          and(
            eq(authActionTokens.tokenHash, tokenHash),
            eq(authActionTokens.purpose, 'PASSWORD_RESET'),
          ),
        )
        .for('update')
        .limit(1);

      if (
        !actionToken ||
        actionToken.consumedAt ||
        actionToken.revokedAt ||
        actionToken.expiresAt <= now
      ) {
        return { kind: 'INVALID' };
      }

      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, actionToken.userId))
        .for('update')
        .limit(1);

      if (!user || user.deletedAt || user.status === 'DISABLED') {
        return { kind: 'INVALID' };
      }

      await tx
        .update(authActionTokens)
        .set({ consumedAt: now })
        .where(eq(authActionTokens.id, actionToken.id));
      await tx
        .update(users)
        .set({
          passwordHash,
          passwordChangedAt: now,
          authVersion: sql`${users.authVersion} + 1`,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));
      await this.revokeSessionsInTransaction(tx, user.id, 'PASSWORD_RESET', now);

      return { kind: 'CONSUMED', userId: user.id };
    });
  }

  async createSession(input: {
    user: UserAuthRecord;
    sessionId: string;
    refreshToken: NewRefreshToken;
    metadata: RequestMetadata;
    maxActiveSessions: number;
  }): Promise<SessionCreationResult> {
    return this.databaseService.db.transaction(async (tx) => {
      const now = new Date();
      const [lockedUser] = await tx
        .select()
        .from(users)
        .where(eq(users.id, input.user.id))
        .for('update')
        .limit(1);

      if (
        !lockedUser ||
        lockedUser.deletedAt ||
        lockedUser.status !== 'ACTIVE' ||
        lockedUser.authVersion !== input.user.authVersion
      ) {
        return { kind: 'INVALID_USER' };
      }

      const [activeSessionCount] = await tx
        .select({ value: count() })
        .from(authSessions)
        .where(
          and(
            eq(authSessions.userId, input.user.id),
            isNull(authSessions.revokedAt),
            gt(authSessions.expiresAt, now),
          ),
        );

      if ((activeSessionCount?.value ?? 0) >= input.maxActiveSessions) {
        return { kind: 'SESSION_LIMIT' };
      }

      await tx.insert(authSessions).values({
        id: input.sessionId,
        userId: input.user.id,
        expiresAt: input.refreshToken.expiresAt,
        lastUsedAt: now,
        deviceName: input.metadata.deviceName,
        ipAddress: input.metadata.ipAddress,
        userAgent: input.metadata.userAgent,
      });
      await tx.insert(authRefreshTokens).values({
        id: input.refreshToken.id,
        sessionId: input.sessionId,
        tokenHash: input.refreshToken.tokenHash,
        expiresAt: input.refreshToken.expiresAt,
      });
      await tx
        .update(users)
        .set({ lastLoginAt: now, updatedAt: now })
        .where(eq(users.id, input.user.id));

      return { kind: 'CREATED' };
    });
  }

  async rotateRefreshToken(input: {
    userId: string;
    sessionId: string;
    authVersion: number;
    currentTokenId: string;
    currentTokenHash: string;
    nextToken: NewRefreshToken;
  }): Promise<RefreshRotationResult> {
    return this.databaseService.db.transaction(async (tx) => {
      const now = new Date();
      const [row] = await tx
        .select({
          token: authRefreshTokens,
          session: authSessions,
          user: users,
        })
        .from(authRefreshTokens)
        .innerJoin(authSessions, eq(authSessions.id, authRefreshTokens.sessionId))
        .innerJoin(users, eq(users.id, authSessions.userId))
        .where(eq(authRefreshTokens.id, input.currentTokenId))
        .for('update')
        .limit(1);

      if (
        !row ||
        row.user.id !== input.userId ||
        row.session.id !== input.sessionId ||
        !hashesMatch(row.token.tokenHash, input.currentTokenHash)
      ) {
        return { kind: 'INVALID' };
      }

      if (row.token.usedAt) {
        await tx
          .update(authRefreshTokens)
          .set({ reuseDetectedAt: now })
          .where(eq(authRefreshTokens.id, row.token.id));
        await this.revokeOneSessionInTransaction(tx, row.session.id, 'REFRESH_TOKEN_REUSE', now);
        return { kind: 'REUSED' };
      }

      if (
        row.token.expiresAt <= now ||
        row.session.revokedAt ||
        row.session.expiresAt <= now ||
        row.user.deletedAt ||
        row.user.status !== 'ACTIVE' ||
        row.user.authVersion !== input.authVersion
      ) {
        return { kind: 'INVALID' };
      }

      await tx
        .update(authRefreshTokens)
        .set({ usedAt: now, revokedAt: now, revokeReason: 'ROTATED' })
        .where(eq(authRefreshTokens.id, row.token.id));
      await tx.insert(authRefreshTokens).values({
        id: input.nextToken.id,
        sessionId: row.session.id,
        parentTokenId: row.token.id,
        tokenHash: input.nextToken.tokenHash,
        expiresAt: input.nextToken.expiresAt,
      });
      await tx
        .update(authSessions)
        .set({
          lastUsedAt: now,
          expiresAt: input.nextToken.expiresAt,
          updatedAt: now,
        })
        .where(eq(authSessions.id, row.session.id));

      return { kind: 'ROTATED', user: toUserAuthRecord(row.user) };
    });
  }

  async validateAccessPrincipal(
    userId: string,
    sessionId: string,
    authVersion: number,
  ): Promise<AccessPrincipalResult> {
    const [row] = await this.databaseService.db
      .select({ user: users, session: authSessions })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId)))
      .limit(1);
    const now = new Date();

    if (
      !row ||
      row.session.revokedAt ||
      row.session.expiresAt <= now ||
      row.user.deletedAt ||
      row.user.status !== 'ACTIVE' ||
      row.user.authVersion !== authVersion
    ) {
      return { kind: 'INVALID' };
    }

    return {
      kind: 'VALID',
      principal: {
        userId: row.user.id,
        sessionId: row.session.id,
        authVersion: row.user.authVersion,
        email: row.user.email,
      },
    };
  }

  async revokeSession(userId: string, sessionId: string, reason: string): Promise<void> {
    await this.databaseService.db.transaction(async (tx) => {
      const now = new Date();
      await tx
        .update(authSessions)
        .set({ revokedAt: now, revokeReason: reason, updatedAt: now })
        .where(
          and(
            eq(authSessions.id, sessionId),
            eq(authSessions.userId, userId),
            isNull(authSessions.revokedAt),
          ),
        );
      await tx
        .update(authRefreshTokens)
        .set({ revokedAt: now, revokeReason: reason })
        .where(
          and(eq(authRefreshTokens.sessionId, sessionId), isNull(authRefreshTokens.revokedAt)),
        );
    });
  }

  async revokeAllSessions(userId: string, reason: string): Promise<void> {
    await this.databaseService.db.transaction(async (tx) => {
      await this.revokeSessionsInTransaction(tx, userId, reason, new Date());
    });
  }

  async getMe(userId: string): Promise<AuthMeResult | null> {
    const [row] = await this.databaseService.db
      .select({ user: users, profile: userProfiles })
      .from(users)
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(
        and(
          eq(users.id, userId),
          eq(users.status, 'ACTIVE'),
          isNotNull(users.emailVerifiedAt),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    const platformRoleRows = await this.getAuthorizedPlatformRoles(userId);
    const membershipRows = await this.databaseService.db
      .select({
        membershipId: merchantMemberships.id,
        merchantId: merchants.id,
        merchantName: merchants.displayName,
      })
      .from(merchantMemberships)
      .innerJoin(merchants, eq(merchants.id, merchantMemberships.merchantId))
      .where(
        and(
          eq(merchantMemberships.userId, userId),
          eq(merchantMemberships.status, 'ACTIVE'),
          eq(merchants.status, 'ACTIVE'),
          eq(merchants.verificationStatus, 'VERIFIED'),
          isNull(merchantMemberships.deletedAt),
          isNull(merchants.deletedAt),
        ),
      );
    const memberships = await this.attachAuthorizedMerchantRoles(membershipRows);

    return {
      id: row.user.id,
      email: row.user.email,
      status: row.user.status,
      emailVerifiedAt: row.user.emailVerifiedAt,
      profile: row.profile
        ? {
            displayName: row.profile.displayName,
            firstName: row.profile.firstName,
            lastName: row.profile.lastName,
            avatarStoragePath: row.profile.avatarStoragePath,
          }
        : null,
      platformRoles: platformRoleRows.map(({ key }) => key),
      merchantMemberships: memberships,
    };
  }

  private async getAuthorizedPlatformRoles(userId: string): Promise<Array<{ key: string }>> {
    return await this.databaseService.db
      .select({ key: roles.key })
      .from(userPlatformRoles)
      .innerJoin(roles, eq(roles.id, userPlatformRoles.roleId))
      .where(
        and(
          eq(userPlatformRoles.userId, userId),
          eq(roles.scope, 'PLATFORM'),
          isNull(roles.deletedAt),
        ),
      )
      .orderBy(asc(roles.key));
  }

  private async attachAuthorizedMerchantRoles(
    memberships: Array<{
      membershipId: string;
      merchantId: string;
      merchantName: string;
    }>,
  ): Promise<AuthMeResult['merchantMemberships']> {
    if (memberships.length === 0) {
      return [];
    }

    const roleRows = await this.databaseService.db
      .select({
        key: roles.key,
        membershipId: merchantMembershipRoles.membershipId,
        merchantId: merchantMembershipRoles.merchantId,
      })
      .from(merchantMembershipRoles)
      .innerJoin(roles, eq(roles.id, merchantMembershipRoles.roleId))
      .where(
        and(
          inArray(
            merchantMembershipRoles.membershipId,
            memberships.map(({ membershipId }) => membershipId),
          ),
          eq(roles.scope, 'MERCHANT'),
          isNull(roles.deletedAt),
        ),
      )
      .orderBy(asc(roles.key));
    const rolesByMembership = new Map<string, string[]>();

    for (const role of roleRows) {
      const membershipKey = `${role.membershipId}:${role.merchantId}`;
      const membershipRoles = rolesByMembership.get(membershipKey) ?? [];
      membershipRoles.push(role.key);
      rolesByMembership.set(membershipKey, membershipRoles);
    }

    return memberships.flatMap((membership) => {
      const membershipKey = `${membership.membershipId}:${membership.merchantId}`;
      const membershipRoles = rolesByMembership.get(membershipKey) ?? [];

      return membershipRoles.length > 0 ? [{ ...membership, roles: membershipRoles }] : [];
    });
  }

  async hasPlatformPermissions(userId: string, permissionKeys: string[]): Promise<boolean> {
    if (permissionKeys.length === 0) {
      return false;
    }

    const rows = await this.databaseService.db
      .selectDistinct({ key: permissions.key })
      .from(userPlatformRoles)
      .innerJoin(roles, eq(roles.id, userPlatformRoles.roleId))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(userPlatformRoles.userId, userId),
          eq(roles.scope, 'PLATFORM'),
          isNull(roles.deletedAt),
          inArray(permissions.key, permissionKeys),
        ),
      );

    return new Set(rows.map(({ key }) => key)).size === new Set(permissionKeys).size;
  }

  async hasMerchantPermissions(
    userId: string,
    merchantId: string,
    permissionKeys: string[],
  ): Promise<boolean> {
    if (permissionKeys.length === 0) {
      return false;
    }

    const rows = await this.databaseService.db
      .selectDistinct({ key: permissions.key })
      .from(merchantMemberships)
      .innerJoin(
        merchantMembershipRoles,
        and(
          eq(merchantMembershipRoles.membershipId, merchantMemberships.id),
          eq(merchantMembershipRoles.merchantId, merchantMemberships.merchantId),
        ),
      )
      .innerJoin(roles, eq(roles.id, merchantMembershipRoles.roleId))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .innerJoin(merchants, eq(merchants.id, merchantMemberships.merchantId))
      .where(
        and(
          eq(merchantMemberships.userId, userId),
          eq(merchantMemberships.merchantId, merchantId),
          eq(merchantMemberships.status, 'ACTIVE'),
          eq(roles.scope, 'MERCHANT'),
          eq(merchants.status, 'ACTIVE'),
          isNull(merchantMemberships.deletedAt),
          isNull(roles.deletedAt),
          isNull(merchants.deletedAt),
          inArray(permissions.key, permissionKeys),
        ),
      );

    return new Set(rows.map(({ key }) => key)).size === new Set(permissionKeys).size;
  }

  private async revokeSessionsInTransaction(
    tx: Parameters<Parameters<typeof this.databaseService.db.transaction>[0]>[0],
    userId: string,
    reason: string,
    now: Date,
  ): Promise<void> {
    const sessionRows = await tx
      .select({ id: authSessions.id })
      .from(authSessions)
      .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
    const sessionIds = sessionRows.map(({ id }) => id);

    await tx
      .update(authSessions)
      .set({ revokedAt: now, revokeReason: reason, updatedAt: now })
      .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));

    if (sessionIds.length > 0) {
      await tx
        .update(authRefreshTokens)
        .set({ revokedAt: now, revokeReason: reason })
        .where(
          and(
            inArray(authRefreshTokens.sessionId, sessionIds),
            isNull(authRefreshTokens.revokedAt),
          ),
        );
    }
  }

  private async revokeOneSessionInTransaction(
    tx: Parameters<Parameters<typeof this.databaseService.db.transaction>[0]>[0],
    sessionId: string,
    reason: string,
    now: Date,
  ): Promise<void> {
    await tx
      .update(authSessions)
      .set({ revokedAt: now, revokeReason: reason, updatedAt: now })
      .where(and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)));
    await tx
      .update(authRefreshTokens)
      .set({ revokedAt: now, revokeReason: reason })
      .where(and(eq(authRefreshTokens.sessionId, sessionId), isNull(authRefreshTokens.revokedAt)));
  }
}
