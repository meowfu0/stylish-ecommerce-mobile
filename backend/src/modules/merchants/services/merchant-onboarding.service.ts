import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';

import { DatabaseService } from '../../../database/database.service';
import {
  auditLogs,
  domainEvents,
  inventoryLocations,
  merchantAddresses,
  merchantMembershipRoles,
  merchantMemberships,
  merchantProfiles,
  merchants,
  merchantVerifications,
  outboxMessages,
  roles,
} from '../../../database/schema';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { RedisOperationCoordinator } from '../../../infrastructure/redis/redis-operation-coordinator.service';
import type { RequestMetadata } from '../../auth/types/auth.types';
import { STOREFRONT_CATALOG_REVISION_KEY } from '../../storefront/storefront.constants';
import type {
  ApproveMerchantApplicationDto,
  CreateMerchantApplicationDto,
  MerchantApplicationListQueryDto,
  MerchantBusinessAddressInputDto,
  MerchantProfileInputDto,
  ReviewMerchantApplicationDto,
  UpdateApprovedMerchantDto,
  UpdateMerchantApplicationDto,
} from '../dto/merchant-onboarding-request.dto';
import type {
  ApplicationListView,
  ApplicationStatus,
  ApprovedMerchantView,
  MerchantApplicationDetailsView,
  MerchantApplicationView,
} from '../types/merchant-onboarding.types';

type Transaction = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];
type MerchantRow = typeof merchants.$inferSelect;
type ProfileRow = typeof merchantProfiles.$inferSelect;
type AddressRow = typeof merchantAddresses.$inferSelect;
type VerificationRow = typeof merchantVerifications.$inferSelect;
type ApplicationRecord = MerchantRow & {
  addresses: AddressRow[];
  profile: ProfileRow | null;
  verifications: VerificationRow[];
};

type IdempotencyContext = {
  databaseKey: string;
  fingerprint: string;
};

type EventInput = {
  action: string;
  actorUserId: string;
  afterData?: Record<string, unknown>;
  beforeData?: Record<string, unknown>;
  eventType: string;
  idempotency: IdempotencyContext;
  merchantId: string;
  metadata: RequestMetadata;
  payload?: Record<string, unknown>;
};

const OPEN_VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'CHANGES_REQUESTED'] as const;

@Injectable()
export class MerchantOnboardingService {
  private readonly idempotencyTtlSeconds: number;
  private readonly profileCacheTtlSeconds: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly operationCoordinator: RedisOperationCoordinator,
    private readonly redisService: RedisService,
  ) {
    this.idempotencyTtlSeconds = configService.getOrThrow<number>('redis.idempotencyTtlSeconds');
    this.profileCacheTtlSeconds = configService.getOrThrow<number>('redis.defaultTtlSeconds');
  }

  async createApplication(
    actorUserId: string,
    dto: CreateMerchantApplicationDto,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<MerchantApplicationView> {
    const idempotency = this.idempotency(
      'application.create',
      actorUserId,
      actorUserId,
      rawIdempotencyKey,
      dto,
    );
    const replay = await this.findIdempotentReplay(idempotency);

    if (replay) {
      return this.getApplication(replay.aggregateId, actorUserId);
    }

    return this.operationCoordinator.run(
      `application-create:${actorUserId}:${idempotency.databaseKey}:${idempotency.fingerprint}`,
      async () => {
        try {
          const merchantId = await this.databaseService.db.transaction(async (tx) => {
            const existingEvent = await this.findEvent(tx, idempotency);

            if (existingEvent) {
              return existingEvent.aggregateId;
            }

            const [existingApplication] = await tx
              .select({ id: merchants.id })
              .from(merchants)
              .where(
                and(
                  eq(merchants.createdByUserId, actorUserId),
                  eq(merchants.status, 'PENDING'),
                  inArray(merchants.verificationStatus, [...OPEN_VERIFICATION_STATUSES]),
                  isNull(merchants.deletedAt),
                ),
              )
              .limit(1);

            if (existingApplication) {
              return existingApplication.id;
            }

            const [merchant] = await tx
              .insert(merchants)
              .values({
                createdByUserId: actorUserId,
                displayName: dto.displayName,
                legalName: dto.legalName,
                slug: dto.slug,
                updatedByUserId: actorUserId,
              })
              .returning({ id: merchants.id });

            if (!merchant) {
              throw new Error('Merchant application insert failed');
            }

            await tx.insert(merchantProfiles).values({
              merchantId: merchant.id,
              ...this.profileValues(dto.profile),
            });

            if (dto.businessAddress) {
              await this.upsertBusinessAddress(tx, merchant.id, dto.businessAddress);
            }

            await this.recordEvent(tx, {
              action: 'merchant.application.created',
              actorUserId,
              afterData: { status: 'DRAFT' },
              eventType: 'merchant.application.created',
              idempotency,
              merchantId: merchant.id,
              metadata,
              payload: { applicationStatus: 'DRAFT' },
            });

            return merchant.id;
          });

          return await this.getApplication(merchantId, actorUserId);
        } catch (error) {
          const existing = await this.findOpenApplicationForUser(actorUserId);

          if (existing) {
            return existing;
          }

          if (this.isUniqueViolation(error)) {
            throw this.conflict('slug', 'Merchant slug is already in use');
          }

          throw error;
        }
      },
    );
  }

  async getMyApplication(actorUserId: string): Promise<MerchantApplicationView> {
    const open = await this.findOpenApplicationForUser(actorUserId);

    if (open) {
      return open;
    }

    const record = await this.databaseService.db.query.merchants.findFirst({
      orderBy: [desc(merchants.createdAt), desc(merchants.id)],
      where: and(eq(merchants.createdByUserId, actorUserId), isNull(merchants.deletedAt)),
      with: this.applicationRelations(),
    });

    if (!record) {
      throw this.notFound();
    }

    return this.toApplicationView(record);
  }

  async updateApplication(
    actorUserId: string,
    applicationId: string,
    dto: UpdateMerchantApplicationDto,
    metadata: RequestMetadata,
  ): Promise<MerchantApplicationView> {
    if (Object.keys(dto).length === 0) {
      throw this.badRequest('request', 'At least one application field is required');
    }

    try {
      await this.databaseService.db.transaction(async (tx) => {
        const [merchant] = await tx
          .select()
          .from(merchants)
          .where(
            and(
              eq(merchants.id, applicationId),
              eq(merchants.createdByUserId, actorUserId),
              isNull(merchants.deletedAt),
            ),
          )
          .for('update')
          .limit(1);

        if (!merchant) {
          throw this.notFound();
        }

        if (
          merchant.status !== 'PENDING' ||
          !['UNVERIFIED', 'CHANGES_REQUESTED'].includes(merchant.verificationStatus)
        ) {
          throw this.conflict('status', 'Only draft or change-requested applications are editable');
        }

        const merchantChanges: Partial<typeof merchants.$inferInsert> = {
          updatedAt: new Date(),
          updatedByUserId: actorUserId,
          ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
          ...(dto.legalName !== undefined ? { legalName: dto.legalName } : {}),
          ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        };

        await tx.update(merchants).set(merchantChanges).where(eq(merchants.id, applicationId));

        if (dto.profile) {
          await tx
            .insert(merchantProfiles)
            .values({ merchantId: applicationId, ...this.profileValues(dto.profile) })
            .onConflictDoUpdate({
              target: merchantProfiles.merchantId,
              set: { ...this.profileValues(dto.profile), updatedAt: new Date() },
            });
        }

        if (dto.businessAddress) {
          await this.upsertBusinessAddress(tx, applicationId, dto.businessAddress);
        }

        await this.recordEvent(tx, {
          action: 'merchant.application.updated',
          actorUserId,
          afterData: { applicationStatus: this.applicationStatus(merchant) },
          beforeData: { applicationStatus: this.applicationStatus(merchant) },
          eventType: 'merchant.application.updated',
          idempotency: this.serverIdempotency('application.update', actorUserId, applicationId),
          merchantId: applicationId,
          metadata,
          payload: { fields: Object.keys(dto).sort() },
        });
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw this.conflict('slug', 'Merchant slug is already in use');
      }

      throw error;
    }

    return this.getApplication(applicationId, actorUserId);
  }

  async submitApplication(
    actorUserId: string,
    applicationId: string,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<MerchantApplicationView> {
    const idempotency = this.idempotency(
      'application.submit',
      actorUserId,
      applicationId,
      rawIdempotencyKey,
      {},
    );
    const replay = await this.findIdempotentReplay(idempotency);

    if (replay) {
      return this.getApplication(replay.aggregateId, actorUserId);
    }

    return this.operationCoordinator.run(
      `application-submit:${applicationId}:${idempotency.databaseKey}:${idempotency.fingerprint}`,
      async () => {
        await this.databaseService.db.transaction(async (tx) => {
          const [merchant] = await tx
            .select()
            .from(merchants)
            .where(
              and(
                eq(merchants.id, applicationId),
                eq(merchants.createdByUserId, actorUserId),
                isNull(merchants.deletedAt),
              ),
            )
            .for('update')
            .limit(1);

          if (!merchant) {
            throw this.notFound();
          }

          const existingEvent = await this.findEvent(tx, idempotency);

          if (existingEvent || merchant.verificationStatus === 'PENDING') {
            return;
          }

          if (
            merchant.status !== 'PENDING' ||
            !['UNVERIFIED', 'CHANGES_REQUESTED'].includes(merchant.verificationStatus)
          ) {
            throw this.conflict(
              'status',
              'Application cannot be submitted from its current status',
            );
          }

          const [profile] = await tx
            .select({ supportEmail: merchantProfiles.supportEmail })
            .from(merchantProfiles)
            .where(eq(merchantProfiles.merchantId, applicationId))
            .limit(1);
          const [businessAddress] = await tx
            .select({ id: merchantAddresses.id })
            .from(merchantAddresses)
            .where(
              and(
                eq(merchantAddresses.merchantId, applicationId),
                eq(merchantAddresses.addressType, 'BUSINESS'),
                eq(merchantAddresses.isDefault, true),
                isNull(merchantAddresses.deletedAt),
              ),
            )
            .limit(1);

          if (!profile?.supportEmail) {
            throw this.badRequest(
              'profile.supportEmail',
              'A support email is required before submission',
            );
          }

          if (!businessAddress) {
            throw this.badRequest(
              'businessAddress',
              'An active default BUSINESS address is required before submission',
            );
          }

          const now = new Date();
          await tx.insert(merchantVerifications).values({
            merchantId: applicationId,
            status: 'PENDING',
            submittedAt: now,
            submittedByUserId: actorUserId,
          });
          await tx
            .update(merchants)
            .set({
              updatedAt: now,
              updatedByUserId: actorUserId,
              verificationStatus: 'PENDING',
            })
            .where(eq(merchants.id, applicationId));
          await this.recordEvent(tx, {
            action: 'merchant.application.submitted',
            actorUserId,
            afterData: { applicationStatus: 'SUBMITTED' },
            beforeData: { applicationStatus: this.applicationStatus(merchant) },
            eventType: 'merchant.application.submitted',
            idempotency,
            merchantId: applicationId,
            metadata,
            payload: { applicationStatus: 'SUBMITTED' },
          });
        });

        return this.getApplication(applicationId, actorUserId);
      },
    );
  }

  async listApplications(query: MerchantApplicationListQueryDto): Promise<ApplicationListView> {
    const limit = query.limit ?? 25;
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const conditions = [isNull(merchants.deletedAt), this.statusCondition(query.status)];

    if (cursor) {
      conditions.push(
        or(
          lt(merchants.createdAt, cursor.createdAt),
          and(eq(merchants.createdAt, cursor.createdAt), lt(merchants.id, cursor.id)),
        ),
      );
    }

    const records = await this.databaseService.db.query.merchants.findMany({
      limit: limit + 1,
      orderBy: [desc(merchants.createdAt), desc(merchants.id)],
      where: and(...conditions),
      with: this.applicationRelations(),
    });
    const hasMore = records.length > limit;
    const page = records.slice(0, limit);
    const last = page.at(-1);

    return {
      items: page.map((record) => this.toApplicationView(record)),
      nextCursor:
        hasMore && last ? this.encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
    };
  }

  async getApplicationDetails(applicationId: string): Promise<MerchantApplicationDetailsView> {
    const [application, verificationHistory] = await Promise.all([
      this.getApplication(applicationId),
      this.databaseService.db
        .select()
        .from(merchantVerifications)
        .where(eq(merchantVerifications.merchantId, applicationId))
        .orderBy(desc(merchantVerifications.submittedAt), desc(merchantVerifications.id)),
    ]);

    return {
      ...application,
      verificationHistory: verificationHistory.map((verification) => ({
        id: verification.id,
        rejectionReason: verification.rejectionReason,
        reviewNote: verification.reviewNote,
        reviewedAt: verification.reviewedAt?.toISOString() ?? null,
        status: verification.status,
        submittedAt: verification.submittedAt.toISOString(),
      })),
    };
  }

  approveApplication(
    actorUserId: string,
    applicationId: string,
    dto: ApproveMerchantApplicationDto,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<ApprovedMerchantView> {
    return this.reviewApplication(
      'APPROVE',
      actorUserId,
      applicationId,
      dto,
      rawIdempotencyKey,
      metadata,
    );
  }

  rejectApplication(
    actorUserId: string,
    applicationId: string,
    dto: ReviewMerchantApplicationDto,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<MerchantApplicationView> {
    return this.reviewApplication(
      'REJECT',
      actorUserId,
      applicationId,
      dto,
      rawIdempotencyKey,
      metadata,
    );
  }

  requestChanges(
    actorUserId: string,
    applicationId: string,
    dto: ReviewMerchantApplicationDto,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<MerchantApplicationView> {
    return this.reviewApplication(
      'REQUEST_CHANGES',
      actorUserId,
      applicationId,
      dto,
      rawIdempotencyKey,
      metadata,
    );
  }

  async getApprovedMerchant(merchantId: string): Promise<ApprovedMerchantView> {
    const cached = await this.redisService.getJson<ApprovedMerchantView>(
      this.profileCacheKey(merchantId),
    );

    if (cached) {
      return cached;
    }

    const application = await this.getApplication(merchantId);

    if (application.status !== 'ACTIVE' || application.verificationStatus !== 'VERIFIED') {
      throw this.notFound('Merchant not found');
    }

    const [commission] = await this.databaseService.db
      .select({ value: merchants.commissionRateBasisPoints })
      .from(merchants)
      .where(eq(merchants.id, merchantId))
      .limit(1);
    const { latestVerification, ...approvedProfile } = application;
    void latestVerification;
    const result: ApprovedMerchantView = {
      ...approvedProfile,
      applicationStatus: 'APPROVED',
      commissionRateBasisPoints: commission?.value ?? 0,
    };

    await this.redisService.setJson(
      this.profileCacheKey(merchantId),
      result,
      this.profileCacheTtlSeconds,
    );
    return result;
  }

  async updateApprovedMerchant(
    actorUserId: string,
    merchantId: string,
    dto: UpdateApprovedMerchantDto,
    metadata: RequestMetadata,
  ): Promise<ApprovedMerchantView> {
    if (Object.keys(dto).length === 0) {
      throw this.badRequest('request', 'At least one profile field is required');
    }

    await this.databaseService.db.transaction(async (tx) => {
      const [merchant] = await tx
        .select()
        .from(merchants)
        .where(
          and(
            eq(merchants.id, merchantId),
            eq(merchants.status, 'ACTIVE'),
            eq(merchants.verificationStatus, 'VERIFIED'),
            isNull(merchants.deletedAt),
          ),
        )
        .for('update')
        .limit(1);

      if (!merchant) {
        throw this.notFound('Merchant not found');
      }

      if (dto.displayName !== undefined) {
        await tx
          .update(merchants)
          .set({
            displayName: dto.displayName,
            updatedAt: new Date(),
            updatedByUserId: actorUserId,
          })
          .where(eq(merchants.id, merchantId));
      }

      if (dto.profile) {
        await tx
          .insert(merchantProfiles)
          .values({ merchantId, ...this.profileValues(dto.profile) })
          .onConflictDoUpdate({
            target: merchantProfiles.merchantId,
            set: { ...this.profileValues(dto.profile), updatedAt: new Date() },
          });
      }

      await this.recordEvent(tx, {
        action: 'merchant.profile.updated',
        actorUserId,
        afterData: { displayName: dto.displayName ?? merchant.displayName },
        beforeData: { displayName: merchant.displayName },
        eventType: 'merchant.profile.updated',
        idempotency: this.serverIdempotency('profile.update', actorUserId, merchantId),
        merchantId,
        metadata,
        payload: { fields: Object.keys(dto).sort() },
      });
    });

    await this.invalidateMerchantProfile(merchantId);
    return this.getApprovedMerchant(merchantId);
  }

  private reviewApplication(
    decision: 'APPROVE',
    actorUserId: string,
    applicationId: string,
    dto: ApproveMerchantApplicationDto,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<ApprovedMerchantView>;
  private reviewApplication(
    decision: 'REJECT' | 'REQUEST_CHANGES',
    actorUserId: string,
    applicationId: string,
    dto: ReviewMerchantApplicationDto,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<MerchantApplicationView>;
  private async reviewApplication(
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES',
    actorUserId: string,
    applicationId: string,
    dto: ApproveMerchantApplicationDto | ReviewMerchantApplicationDto,
    rawIdempotencyKey: string | undefined,
    metadata: RequestMetadata,
  ): Promise<ApprovedMerchantView | MerchantApplicationView> {
    const action = `application.${decision.toLowerCase()}`;
    const idempotency = this.idempotency(
      action,
      actorUserId,
      applicationId,
      rawIdempotencyKey,
      dto,
    );
    const replay = await this.findIdempotentReplay(idempotency);

    if (replay) {
      if (decision === 'APPROVE') {
        const cached = await this.redisService.getJson<ApprovedMerchantView>(
          this.idempotencyCacheKey(idempotency),
        );

        return cached ?? this.getApprovedMerchant(replay.aggregateId);
      }

      return this.getApplication(replay.aggregateId);
    }

    return this.operationCoordinator.run(
      `application-review:${decision}:${applicationId}:${idempotency.databaseKey}:${idempotency.fingerprint}`,
      async () => {
        await this.databaseService.db.transaction(async (tx) => {
          const [merchant] = await tx
            .select()
            .from(merchants)
            .where(and(eq(merchants.id, applicationId), isNull(merchants.deletedAt)))
            .for('update')
            .limit(1);

          if (!merchant) {
            throw this.notFound();
          }

          const existingEvent = await this.findEvent(tx, idempotency);

          if (existingEvent) {
            return;
          }

          const alreadyInTargetState =
            (decision === 'APPROVE' &&
              merchant.status === 'ACTIVE' &&
              merchant.verificationStatus === 'VERIFIED') ||
            (decision === 'REJECT' && merchant.verificationStatus === 'REJECTED') ||
            (decision === 'REQUEST_CHANGES' && merchant.verificationStatus === 'CHANGES_REQUESTED');

          if (alreadyInTargetState) {
            return;
          }

          if (merchant.status !== 'PENDING' || merchant.verificationStatus !== 'PENDING') {
            throw this.conflict('status', 'Application is not awaiting platform review');
          }

          const [verification] = await tx
            .select()
            .from(merchantVerifications)
            .where(
              and(
                eq(merchantVerifications.merchantId, applicationId),
                eq(merchantVerifications.status, 'PENDING'),
              ),
            )
            .for('update')
            .limit(1);

          if (!verification) {
            throw this.conflict('verification', 'Pending verification attempt was not found');
          }

          const now = new Date();

          if (decision === 'APPROVE') {
            const approvalDto = dto as ApproveMerchantApplicationDto;
            const [ownerRole] = await tx
              .select({ id: roles.id })
              .from(roles)
              .where(
                and(eq(roles.key, 'owner'), eq(roles.scope, 'MERCHANT'), isNull(roles.deletedAt)),
              )
              .limit(1);

            if (!ownerRole || !merchant.createdByUserId) {
              throw new Error('Merchant owner provisioning configuration is unavailable');
            }

            await tx
              .update(merchantVerifications)
              .set({
                reviewedAt: now,
                reviewedByUserId: actorUserId,
                status: 'VERIFIED',
                updatedAt: now,
              })
              .where(eq(merchantVerifications.id, verification.id));
            await tx
              .update(merchants)
              .set({
                commissionRateBasisPoints: approvalDto.commissionRateBasisPoints ?? 0,
                status: 'ACTIVE',
                updatedAt: now,
                updatedByUserId: actorUserId,
                verificationStatus: 'VERIFIED',
              })
              .where(eq(merchants.id, applicationId));

            await tx
              .insert(merchantMemberships)
              .values({
                joinedAt: now,
                merchantId: applicationId,
                status: 'ACTIVE',
                userId: merchant.createdByUserId,
              })
              .onConflictDoUpdate({
                target: [merchantMemberships.merchantId, merchantMemberships.userId],
                set: { deletedAt: null, joinedAt: now, status: 'ACTIVE', updatedAt: now },
              });
            const [membership] = await tx
              .select({ id: merchantMemberships.id })
              .from(merchantMemberships)
              .where(
                and(
                  eq(merchantMemberships.merchantId, applicationId),
                  eq(merchantMemberships.userId, merchant.createdByUserId),
                ),
              )
              .limit(1);

            if (!membership) {
              throw new Error('Merchant owner membership provisioning failed');
            }

            await tx
              .insert(merchantMembershipRoles)
              .values({
                assignedByUserId: actorUserId,
                membershipId: membership.id,
                merchantId: applicationId,
                roleId: ownerRole.id,
                roleScope: 'MERCHANT',
              })
              .onConflictDoNothing();
            await this.ensureDefaultInventoryLocation(tx, applicationId, actorUserId, now);
          } else {
            const reviewDto = dto as ReviewMerchantApplicationDto;
            const status = decision === 'REJECT' ? 'REJECTED' : 'CHANGES_REQUESTED';
            await tx
              .update(merchantVerifications)
              .set({
                ...(decision === 'REJECT'
                  ? { rejectionReason: reviewDto.reason }
                  : { reviewNote: reviewDto.reason }),
                reviewedAt: now,
                reviewedByUserId: actorUserId,
                status,
                updatedAt: now,
              })
              .where(eq(merchantVerifications.id, verification.id));
            await tx
              .update(merchants)
              .set({
                updatedAt: now,
                updatedByUserId: actorUserId,
                verificationStatus: status,
              })
              .where(eq(merchants.id, applicationId));
          }

          const targetStatus =
            decision === 'APPROVE'
              ? 'APPROVED'
              : decision === 'REJECT'
                ? 'REJECTED'
                : 'CHANGES_REQUESTED';
          await this.recordEvent(tx, {
            action: `merchant.application.${decision.toLowerCase()}`,
            actorUserId,
            afterData: { applicationStatus: targetStatus },
            beforeData: { applicationStatus: 'SUBMITTED' },
            eventType: `merchant.application.${decision.toLowerCase()}`,
            idempotency,
            merchantId: applicationId,
            metadata,
            payload: { applicationStatus: targetStatus },
          });
        });

        await this.invalidateMerchantProfile(applicationId);

        if (decision === 'APPROVE') {
          const approved = await this.getApprovedMerchant(applicationId);
          await this.redisService.setJson(
            this.idempotencyCacheKey(idempotency),
            approved,
            this.idempotencyTtlSeconds,
          );
          return approved;
        }

        return this.getApplication(applicationId);
      },
    );
  }

  private async ensureDefaultInventoryLocation(
    tx: Transaction,
    merchantId: string,
    actorUserId: string,
    now: Date,
  ): Promise<void> {
    const [existingDefault] = await tx
      .select({ id: inventoryLocations.id })
      .from(inventoryLocations)
      .where(
        and(
          eq(inventoryLocations.merchantId, merchantId),
          eq(inventoryLocations.isDefault, true),
          eq(inventoryLocations.isActive, true),
        ),
      )
      .limit(1);

    if (existingDefault) {
      return;
    }

    const [businessAddress] = await tx
      .select()
      .from(merchantAddresses)
      .where(
        and(
          eq(merchantAddresses.merchantId, merchantId),
          eq(merchantAddresses.addressType, 'BUSINESS'),
          eq(merchantAddresses.isDefault, true),
          isNull(merchantAddresses.deletedAt),
        ),
      )
      .limit(1);
    const addressSnapshot = businessAddress
      ? [
          businessAddress.addressLine1,
          businessAddress.addressLine2,
          businessAddress.barangay,
          businessAddress.city,
          businessAddress.province,
          businessAddress.postalCode,
          businessAddress.countryCode,
        ]
          .filter(Boolean)
          .join(', ')
      : null;
    const [mainLocation] = await tx
      .select({ id: inventoryLocations.id })
      .from(inventoryLocations)
      .where(
        and(
          eq(inventoryLocations.merchantId, merchantId),
          sql`lower(${inventoryLocations.code}) = 'main'`,
        ),
      )
      .limit(1);

    if (mainLocation) {
      await tx
        .update(inventoryLocations)
        .set({
          addressSnapshot,
          isActive: true,
          isDefault: true,
          name: 'Main Location',
          updatedAt: now,
        })
        .where(eq(inventoryLocations.id, mainLocation.id));
      return;
    }

    await tx.insert(inventoryLocations).values({
      addressSnapshot,
      code: 'MAIN',
      createdByUserId: actorUserId,
      isActive: true,
      isDefault: true,
      merchantId,
      name: 'Main Location',
    });
  }

  private async upsertBusinessAddress(
    tx: Transaction,
    merchantId: string,
    dto: MerchantBusinessAddressInputDto,
  ): Promise<void> {
    const [existing] = await tx
      .select({ id: merchantAddresses.id })
      .from(merchantAddresses)
      .where(
        and(
          eq(merchantAddresses.merchantId, merchantId),
          eq(merchantAddresses.addressType, 'BUSINESS'),
          eq(merchantAddresses.isDefault, true),
          isNull(merchantAddresses.deletedAt),
        ),
      )
      .limit(1);
    const values = {
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2 ?? null,
      barangay: dto.barangay ?? null,
      city: dto.city,
      contactName: dto.contactName,
      countryCode: dto.countryCode ?? 'PH',
      phone: dto.phone,
      postalCode: dto.postalCode,
      province: dto.province,
    };

    if (existing) {
      await tx
        .update(merchantAddresses)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(merchantAddresses.id, existing.id));
      return;
    }

    await tx.insert(merchantAddresses).values({
      ...values,
      addressType: 'BUSINESS',
      isDefault: true,
      merchantId,
    });
  }

  private profileValues(dto: MerchantProfileInputDto | undefined): Partial<ProfileRow> {
    if (!dto) {
      return {};
    }

    return {
      ...(dto.description !== undefined ? { description: dto.description || null } : {}),
      ...(dto.supportEmail !== undefined ? { supportEmail: dto.supportEmail } : {}),
      ...(dto.supportPhone !== undefined ? { supportPhone: dto.supportPhone } : {}),
      ...(dto.websiteUrl !== undefined ? { websiteUrl: dto.websiteUrl } : {}),
    };
  }

  private applicationRelations(): {
    addresses: {
      limit: number;
      orderBy: ReturnType<typeof desc>[];
      where: ReturnType<typeof and>;
    };
    profile: true;
    verifications: { limit: number; orderBy: ReturnType<typeof desc>[] };
  } {
    return {
      addresses: {
        limit: 1,
        orderBy: [desc(merchantAddresses.updatedAt)],
        where: and(
          eq(merchantAddresses.addressType, 'BUSINESS'),
          eq(merchantAddresses.isDefault, true),
          isNull(merchantAddresses.deletedAt),
        ),
      },
      profile: true as const,
      verifications: {
        limit: 1,
        orderBy: [desc(merchantVerifications.submittedAt), desc(merchantVerifications.id)],
      },
    };
  }

  private async findOpenApplicationForUser(
    actorUserId: string,
  ): Promise<MerchantApplicationView | null> {
    const record = await this.databaseService.db.query.merchants.findFirst({
      orderBy: [desc(merchants.createdAt)],
      where: and(
        eq(merchants.createdByUserId, actorUserId),
        eq(merchants.status, 'PENDING'),
        inArray(merchants.verificationStatus, [...OPEN_VERIFICATION_STATUSES]),
        isNull(merchants.deletedAt),
      ),
      with: this.applicationRelations(),
    });

    return record ? this.toApplicationView(record) : null;
  }

  private async getApplication(
    applicationId: string,
    applicantUserId?: string,
  ): Promise<MerchantApplicationView> {
    const record = await this.databaseService.db.query.merchants.findFirst({
      where: and(
        eq(merchants.id, applicationId),
        applicantUserId ? eq(merchants.createdByUserId, applicantUserId) : undefined,
        isNull(merchants.deletedAt),
      ),
      with: this.applicationRelations(),
    });

    if (!record) {
      throw this.notFound();
    }

    return this.toApplicationView(record);
  }

  private toApplicationView(record: ApplicationRecord): MerchantApplicationView {
    const profile = record.profile;
    const address = record.addresses[0];
    const verification = record.verifications[0];

    return {
      applicationStatus: this.applicationStatus(record),
      businessAddress: address
        ? {
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            barangay: address.barangay,
            city: address.city,
            contactName: address.contactName,
            countryCode: address.countryCode,
            id: address.id,
            phone: address.phone,
            postalCode: address.postalCode,
            province: address.province,
          }
        : null,
      createdAt: record.createdAt.toISOString(),
      currency: record.currency,
      displayName: record.displayName,
      id: record.id,
      latestVerification: verification
        ? {
            id: verification.id,
            rejectionReason: verification.rejectionReason,
            reviewNote: verification.reviewNote,
            reviewedAt: verification.reviewedAt?.toISOString() ?? null,
            status: verification.status,
            submittedAt: verification.submittedAt.toISOString(),
          }
        : null,
      legalName: record.legalName,
      profile: profile
        ? {
            bannerStoragePath: profile.bannerStoragePath,
            description: profile.description,
            logoStoragePath: profile.logoStoragePath,
            supportEmail: profile.supportEmail,
            supportPhone: profile.supportPhone,
            websiteUrl: profile.websiteUrl,
          }
        : null,
      slug: record.slug,
      status: record.status,
      updatedAt: record.updatedAt.toISOString(),
      verificationStatus: record.verificationStatus,
    };
  }

  private applicationStatus(
    merchant: Pick<MerchantRow, 'status' | 'verificationStatus'>,
  ): ApplicationStatus {
    if (merchant.status === 'ACTIVE' && merchant.verificationStatus === 'VERIFIED') {
      return 'APPROVED';
    }

    if (merchant.verificationStatus === 'PENDING') {
      return 'SUBMITTED';
    }

    if (merchant.verificationStatus === 'CHANGES_REQUESTED') {
      return 'CHANGES_REQUESTED';
    }

    if (merchant.verificationStatus === 'REJECTED') {
      return 'REJECTED';
    }

    return 'DRAFT';
  }

  private statusCondition(status: ApplicationStatus | undefined): ReturnType<typeof and> {
    if (!status) {
      return undefined;
    }

    if (status === 'APPROVED') {
      return and(eq(merchants.status, 'ACTIVE'), eq(merchants.verificationStatus, 'VERIFIED'));
    }

    const verificationStatus =
      status === 'DRAFT' ? 'UNVERIFIED' : status === 'SUBMITTED' ? 'PENDING' : status;
    return and(
      eq(merchants.status, 'PENDING'),
      eq(merchants.verificationStatus, verificationStatus),
    );
  }

  private idempotency(
    action: string,
    actorUserId: string,
    resourceId: string,
    rawKey: string | undefined,
    request: unknown,
  ): IdempotencyContext {
    const key = rawKey?.trim();

    if (!key || key.length < 8 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
      throw this.badRequest(
        'idempotency-key',
        'Idempotency-Key must contain 8-128 safe characters',
      );
    }

    return {
      databaseKey: `merchant-onboarding:${this.hash(`${action}:${actorUserId}:${resourceId}:${key}`)}`,
      fingerprint: this.hash(this.stableStringify(request)),
    };
  }

  private serverIdempotency(
    action: string,
    actorUserId: string,
    resourceId: string,
  ): IdempotencyContext {
    return {
      databaseKey: `merchant-onboarding:${this.hash(`${action}:${actorUserId}:${resourceId}:${randomUUID()}`)}`,
      fingerprint: this.hash('{}'),
    };
  }

  private async findIdempotentReplay(
    idempotency: IdempotencyContext,
  ): Promise<{ aggregateId: string } | null> {
    const [event] = await this.databaseService.db
      .select({ aggregateId: domainEvents.aggregateId, payload: domainEvents.payload })
      .from(domainEvents)
      .where(eq(domainEvents.idempotencyKey, idempotency.databaseKey))
      .limit(1);

    if (!event) {
      return null;
    }

    this.assertFingerprint(event.payload, idempotency);
    return { aggregateId: event.aggregateId };
  }

  private async findEvent(
    tx: Transaction,
    idempotency: IdempotencyContext,
  ): Promise<{ aggregateId: string } | null> {
    const [event] = await tx
      .select({ aggregateId: domainEvents.aggregateId, payload: domainEvents.payload })
      .from(domainEvents)
      .where(eq(domainEvents.idempotencyKey, idempotency.databaseKey))
      .limit(1);

    if (!event) {
      return null;
    }

    this.assertFingerprint(event.payload, idempotency);
    return { aggregateId: event.aggregateId };
  }

  private assertFingerprint(
    payload: Record<string, unknown>,
    idempotency: IdempotencyContext,
  ): void {
    if (payload.requestFingerprint !== idempotency.fingerprint) {
      throw this.conflict(
        'idempotency-key',
        'Idempotency-Key was already used with a different request',
      );
    }
  }

  private async recordEvent(tx: Transaction, input: EventInput): Promise<void> {
    await tx.insert(auditLogs).values({
      action: input.action,
      actorUserId: input.actorUserId,
      afterData: input.afterData,
      beforeData: input.beforeData,
      correlationId: input.metadata.correlationId,
      entityId: input.merchantId,
      entityType: 'MERCHANT_APPLICATION',
      ipAddress: input.metadata.ipAddress,
      merchantId: input.merchantId,
      metadata: { outcome: 'SUCCESS' },
      requestId: input.metadata.requestId,
      userAgent: input.metadata.userAgent,
    });
    const [event] = await tx
      .insert(domainEvents)
      .values({
        aggregateId: input.merchantId,
        aggregateType: 'MERCHANT',
        eventType: input.eventType,
        idempotencyKey: input.idempotency.databaseKey,
        merchantId: input.merchantId,
        payload: {
          ...input.payload,
          actorUserId: input.actorUserId,
          requestFingerprint: input.idempotency.fingerprint,
        },
      })
      .returning({ id: domainEvents.id });

    if (!event) {
      throw new Error('Merchant domain event insert failed');
    }

    await tx.insert(outboxMessages).values({
      domainEventId: event.id,
      idempotencyKey: `outbox:${event.id}`,
      topic: input.eventType,
    });
  }

  private async invalidateMerchantProfile(merchantId: string): Promise<void> {
    await Promise.all([
      this.redisService.delete(this.profileCacheKey(merchantId)),
      this.redisService.increment(STOREFRONT_CATALOG_REVISION_KEY),
    ]);
  }

  private profileCacheKey(merchantId: string): string {
    return `merchant-profile:${merchantId}`;
  }

  private idempotencyCacheKey(idempotency: IdempotencyContext): string {
    return `idempotency-response:${idempotency.databaseKey}`;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`)
        .join(',')}}`;
    }

    return JSON.stringify(value) ?? 'null';
  }

  private encodeCursor(cursor: { createdAt: Date; id: string }): string {
    return Buffer.from(
      JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id }),
    ).toString('base64url');
  }

  private decodeCursor(value: string): { createdAt: Date; id: string } {
    try {
      const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
        createdAt?: unknown;
        id?: unknown;
      };
      const createdAt = new Date(String(parsed.createdAt));

      if (
        Number.isNaN(createdAt.getTime()) ||
        typeof parsed.id !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(parsed.id)
      ) {
        throw new Error('Invalid cursor');
      }

      return { createdAt, id: parsed.id };
    } catch {
      throw this.badRequest('cursor', 'Cursor is invalid');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === '23505'
    );
  }

  private badRequest(field: string, message: string): BadRequestException {
    return new BadRequestException({ message: 'Validation failed', errors: [{ field, message }] });
  }

  private conflict(field: string, message: string): ConflictException {
    return new ConflictException({
      message: 'Merchant application conflict',
      errors: [{ field, message }],
    });
  }

  private notFound(message = 'Merchant application not found'): NotFoundException {
    return new NotFoundException({
      message,
      errors: [{ field: 'applicationId', message: 'Resource was not found or is not accessible' }],
    });
  }
}
