import { Module } from '@nestjs/common';

import { MerchantInventoryController } from './merchant-inventory.controller';
import { InventoryAdjustmentPolicy } from './services/inventory-adjustment.policy';
import { MerchantInventoryService } from './services/merchant-inventory.service';

@Module({
  controllers: [MerchantInventoryController],
  providers: [InventoryAdjustmentPolicy, MerchantInventoryService],
})
export class InventoryModule {}
