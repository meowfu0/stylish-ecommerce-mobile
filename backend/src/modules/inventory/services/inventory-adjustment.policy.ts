import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

export type InventoryOperation = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

@Injectable()
export class InventoryAdjustmentPolicy {
  calculate(input: {
    operation: InventoryOperation;
    quantity: number;
    expectedVersion: number;
    currentVersion: number;
    beforeOnHand: number;
    beforeReserved: number;
  }): { deltaOnHand: number; afterOnHand: number; afterReserved: number } {
    if (input.expectedVersion !== input.currentVersion) {
      throw new ConflictException({
        message: 'Inventory balance version changed',
        errors: [
          {
            field: 'expectedVersion',
            message: `Expected version ${input.expectedVersion}, current version is ${input.currentVersion}`,
          },
        ],
      });
    }

    if (
      (input.operation === 'STOCK_IN' || input.operation === 'STOCK_OUT') &&
      input.quantity <= 0
    ) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: [
          {
            field: 'quantity',
            message: 'quantity must be positive for STOCK_IN and STOCK_OUT',
          },
        ],
      });
    }

    if (input.operation === 'ADJUSTMENT' && input.quantity === 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: [{ field: 'quantity', message: 'quantity must be a non-zero signed adjustment' }],
      });
    }

    const deltaOnHand = input.operation === 'STOCK_OUT' ? -input.quantity : input.quantity;
    const afterOnHand = input.beforeOnHand + deltaOnHand;

    if (afterOnHand < 0) {
      throw new ConflictException({
        message: 'Insufficient stock on hand',
        errors: [
          { field: 'quantity', message: 'Stock adjustment would make on-hand stock negative' },
        ],
      });
    }

    if (input.beforeReserved > afterOnHand) {
      throw new ConflictException({
        message: 'Adjustment conflicts with reserved stock',
        errors: [
          {
            field: 'quantity',
            message: 'On-hand stock cannot be reduced below reserved stock',
          },
        ],
      });
    }

    return { afterOnHand, afterReserved: input.beforeReserved, deltaOnHand };
  }
}
