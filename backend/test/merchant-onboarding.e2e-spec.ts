import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { DatabaseService } from '../src/database/database.service';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { AuthStore } from '../src/modules/auth/services/auth.store';
import { MerchantOnboardingService } from '../src/modules/merchants/services/merchant-onboarding.service';

const customerId = '6dd661fa-487a-4f99-9f79-8433039cf469';
const applicationId = '70c05986-977b-4434-b1cc-5db81e6df03d';
const principal = {
  authVersion: 0,
  email: 'customer@example.com',
  sessionId: '46acb46b-d07f-42c2-b20b-d55821ef811b',
  userId: customerId,
};
const application = {
  applicationStatus: 'DRAFT',
  businessAddress: null,
  createdAt: '2026-07-31T00:00:00.000Z',
  currency: 'PHP',
  displayName: 'Juan Fashion',
  id: applicationId,
  latestVerification: null,
  legalName: 'Juan Fashion Trading',
  profile: { supportEmail: 'support@example.com' },
  slug: 'juan-fashion',
  status: 'PENDING',
  updatedAt: '2026-07-31T00:00:00.000Z',
  verificationStatus: 'UNVERIFIED',
};

describe('Merchant onboarding endpoints (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let authService: { validateAccessToken: jest.Mock };
  let authStore: {
    hasMerchantPermissions: jest.Mock;
    hasPlatformPermissions: jest.Mock;
  };
  let merchantService: {
    approveApplication: jest.Mock;
    createApplication: jest.Mock;
    getApplicationDetails: jest.Mock;
    getApprovedMerchant: jest.Mock;
    getMyApplication: jest.Mock;
    listApplications: jest.Mock;
    rejectApplication: jest.Mock;
    requestChanges: jest.Mock;
    submitApplication: jest.Mock;
    updateApplication: jest.Mock;
    updateApprovedMerchant: jest.Mock;
  };

  beforeAll(async () => {
    authService = { validateAccessToken: jest.fn() };
    authStore = {
      hasMerchantPermissions: jest.fn(),
      hasPlatformPermissions: jest.fn(),
    };
    merchantService = {
      approveApplication: jest.fn(),
      createApplication: jest.fn(),
      getApplicationDetails: jest.fn(),
      getApprovedMerchant: jest.fn(),
      getMyApplication: jest.fn(),
      listApplications: jest.fn(),
      rejectApplication: jest.fn(),
      requestChanges: jest.fn(),
      submitApplication: jest.fn(),
      updateApplication: jest.fn(),
      updateApprovedMerchant: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({ checkConnection: jest.fn().mockResolvedValue(true) })
      .overrideProvider(AuthService)
      .useValue(authService)
      .overrideProvider(AuthStore)
      .useValue(authStore)
      .overrideProvider(MerchantOnboardingService)
      .useValue(merchantService)
      .compile();

    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    authService.validateAccessToken.mockReset().mockResolvedValue(principal);
    authStore.hasPlatformPermissions.mockReset().mockResolvedValue(true);
    authStore.hasMerchantPermissions.mockReset().mockResolvedValue(true);

    for (const mock of Object.values(merchantService)) {
      mock.mockReset();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, updates, and submits an owned merchant application', async () => {
    merchantService.createApplication.mockResolvedValue(application);
    merchantService.updateApplication.mockResolvedValue({ ...application, displayName: 'Updated' });
    merchantService.submitApplication.mockResolvedValue({
      ...application,
      applicationStatus: 'SUBMITTED',
      verificationStatus: 'PENDING',
    });

    await request(server)
      .post('/api/merchants/applications')
      .set('Authorization', 'Bearer customer.access.jwt')
      .set('Idempotency-Key', 'create-merchant-application-001')
      .send({
        displayName: 'Juan Fashion',
        legalName: 'Juan Fashion Trading',
        profile: { supportEmail: 'support@example.com' },
        slug: 'juan-fashion',
      })
      .expect(201)
      .expect(({ body }) => {
        const parsed = body as unknown as { data: { applicationStatus: string } };
        expect(parsed.data.applicationStatus).toBe('DRAFT');
      });
    await request(server)
      .patch(`/api/merchants/applications/${applicationId}`)
      .set('Authorization', 'Bearer customer.access.jwt')
      .send({ displayName: 'Updated' })
      .expect(200);
    await request(server)
      .post(`/api/merchants/applications/${applicationId}/submit`)
      .set('Authorization', 'Bearer customer.access.jwt')
      .set('Idempotency-Key', 'submit-merchant-application-001')
      .expect(202);

    expect(authStore.hasPlatformPermissions).toHaveBeenCalledWith(customerId, [
      'account.merchant_application.create',
    ]);
    expect(merchantService.submitApplication).toHaveBeenCalledWith(
      customerId,
      applicationId,
      'submit-merchant-application-001',
      expect.any(Object),
    );
  });

  it('supports admin queues, request changes, rejection, and idempotent approval contracts', async () => {
    merchantService.listApplications.mockResolvedValue({ items: [application], nextCursor: null });
    merchantService.requestChanges.mockResolvedValue({
      ...application,
      applicationStatus: 'CHANGES_REQUESTED',
      verificationStatus: 'CHANGES_REQUESTED',
    });
    merchantService.rejectApplication.mockResolvedValue({
      ...application,
      applicationStatus: 'REJECTED',
      verificationStatus: 'REJECTED',
    });
    merchantService.approveApplication.mockResolvedValue({
      ...application,
      applicationStatus: 'APPROVED',
      commissionRateBasisPoints: 500,
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
    });

    await request(server)
      .get('/api/admin/merchant-applications?status=SUBMITTED&limit=25')
      .set('Authorization', 'Bearer admin.access.jwt')
      .expect(200);
    await request(server)
      .post(`/api/admin/merchant-applications/${applicationId}/request-changes`)
      .set('Authorization', 'Bearer admin.access.jwt')
      .set('Idempotency-Key', 'changes-merchant-application-001')
      .send({ reason: 'Please correct the business address.' })
      .expect(200);
    await request(server)
      .post(`/api/admin/merchant-applications/${applicationId}/reject`)
      .set('Authorization', 'Bearer admin.access.jwt')
      .set('Idempotency-Key', 'reject-merchant-application-001')
      .send({ reason: 'Business information could not be verified.' })
      .expect(200);
    await request(server)
      .post(`/api/admin/merchant-applications/${applicationId}/approve`)
      .set('Authorization', 'Bearer admin.access.jwt')
      .set('Idempotency-Key', 'approve-merchant-application-001')
      .send({ commissionRateBasisPoints: 500 })
      .expect(200);

    expect(merchantService.approveApplication).toHaveBeenCalledWith(
      customerId,
      applicationId,
      { commissionRateBasisPoints: 500 },
      'approve-merchant-application-001',
      expect.any(Object),
    );
  });

  it('denies platform and cross-merchant permission failures before calling the service', async () => {
    authStore.hasPlatformPermissions.mockResolvedValueOnce(false);

    await request(server)
      .get('/api/admin/merchant-applications')
      .set('Authorization', 'Bearer customer.access.jwt')
      .expect(403);

    authStore.hasMerchantPermissions.mockResolvedValueOnce(false);
    await request(server)
      .get(`/api/merchants/${applicationId}`)
      .set('Authorization', 'Bearer customer.access.jwt')
      .expect(403);

    expect(merchantService.listApplications).not.toHaveBeenCalled();
    expect(merchantService.getApprovedMerchant).not.toHaveBeenCalled();
    expect(authStore.hasMerchantPermissions).toHaveBeenCalledWith(customerId, applicationId, [
      'merchant.profile.read',
    ]);
  });

  it('rejects unknown fields and malformed identifiers', async () => {
    await request(server)
      .post('/api/merchants/applications')
      .set('Authorization', 'Bearer customer.access.jwt')
      .set('Idempotency-Key', 'create-merchant-application-002')
      .send({
        displayName: 'Juan Fashion',
        legalName: 'Juan Fashion Trading',
        slug: 'INVALID SLUG',
        verificationStatus: 'VERIFIED',
      })
      .expect(400);
    await request(server)
      .get('/api/admin/merchant-applications/not-a-uuid')
      .set('Authorization', 'Bearer admin.access.jwt')
      .expect(400);
  });
});
