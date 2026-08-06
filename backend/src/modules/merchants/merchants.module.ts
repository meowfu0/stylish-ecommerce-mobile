import { Module } from '@nestjs/common';

import { AdminMerchantApplicationsController } from './admin-merchant-applications.controller';
import { MerchantApplicationsController } from './merchant-applications.controller';
import { MerchantsController } from './merchants.controller';
import { MerchantOnboardingService } from './services/merchant-onboarding.service';

@Module({
  controllers: [
    MerchantApplicationsController,
    AdminMerchantApplicationsController,
    MerchantsController,
  ],
  providers: [MerchantOnboardingService],
})
export class MerchantsModule {}
