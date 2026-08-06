import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { DatabaseService } from '../../../database/database.service';
import type { RedisOperationCoordinator } from '../../../infrastructure/redis/redis-operation-coordinator.service';
import type { RedisService } from '../../../infrastructure/redis/redis.service';
import { MerchantOnboardingService } from './merchant-onboarding.service';

type Internals = {
  applicationStatus(value: {
    status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CLOSED';
    verificationStatus: 'UNVERIFIED' | 'PENDING' | 'CHANGES_REQUESTED' | 'VERIFIED' | 'REJECTED';
  }): string;
  idempotency(
    action: string,
    actorUserId: string,
    resourceId: string,
    rawKey: string | undefined,
    request: unknown,
  ): { databaseKey: string; fingerprint: string };
};

describe('MerchantOnboardingService policies', () => {
  const service = new MerchantOnboardingService(
    new ConfigService({
      redis: { defaultTtlSeconds: 60, idempotencyTtlSeconds: 300 },
    }),
    {} as DatabaseService,
    {} as RedisOperationCoordinator,
    {} as RedisService,
  );
  const internals = service as unknown as Internals;

  it('derives the public application lifecycle from merchant state', () => {
    expect(
      internals.applicationStatus({ status: 'PENDING', verificationStatus: 'UNVERIFIED' }),
    ).toBe('DRAFT');
    expect(internals.applicationStatus({ status: 'PENDING', verificationStatus: 'PENDING' })).toBe(
      'SUBMITTED',
    );
    expect(
      internals.applicationStatus({
        status: 'PENDING',
        verificationStatus: 'CHANGES_REQUESTED',
      }),
    ).toBe('CHANGES_REQUESTED');
    expect(internals.applicationStatus({ status: 'ACTIVE', verificationStatus: 'VERIFIED' })).toBe(
      'APPROVED',
    );
    expect(internals.applicationStatus({ status: 'PENDING', verificationStatus: 'REJECTED' })).toBe(
      'REJECTED',
    );
  });

  it('keeps the database idempotency identity stable and fingerprints changed input', () => {
    const first = internals.idempotency(
      'application.approve',
      'actor-1',
      'merchant-1',
      'approved-request-key',
      { commissionRateBasisPoints: 500 },
    );
    const replay = internals.idempotency(
      'application.approve',
      'actor-1',
      'merchant-1',
      'approved-request-key',
      { commissionRateBasisPoints: 500 },
    );
    const conflict = internals.idempotency(
      'application.approve',
      'actor-1',
      'merchant-1',
      'approved-request-key',
      { commissionRateBasisPoints: 900 },
    );

    expect(replay).toEqual(first);
    expect(conflict.databaseKey).toBe(first.databaseKey);
    expect(conflict.fingerprint).not.toBe(first.fingerprint);
  });

  it('requires a safe idempotency key', () => {
    expect(() =>
      internals.idempotency('application.submit', 'actor-1', 'merchant-1', undefined, {}),
    ).toThrow(BadRequestException);
  });
});
