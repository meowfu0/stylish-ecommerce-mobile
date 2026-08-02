import { BadRequestException, ConflictException } from '@nestjs/common';

import { InventoryAdjustmentPolicy } from './inventory-adjustment.policy';

describe('InventoryAdjustmentPolicy', () => {
  const policy = new InventoryAdjustmentPolicy();

  it('adds and removes stock without changing reservations', () => {
    expect(
      policy.calculate({
        beforeOnHand: 10,
        beforeReserved: 2,
        currentVersion: 3,
        expectedVersion: 3,
        operation: 'STOCK_IN',
        quantity: 5,
      }),
    ).toEqual({ afterOnHand: 15, afterReserved: 2, deltaOnHand: 5 });
    expect(
      policy.calculate({
        beforeOnHand: 10,
        beforeReserved: 2,
        currentVersion: 3,
        expectedVersion: 3,
        operation: 'STOCK_OUT',
        quantity: 4,
      }),
    ).toEqual({ afterOnHand: 6, afterReserved: 2, deltaOnHand: -4 });
  });

  it('supports positive and negative signed manual adjustments', () => {
    expect(
      policy.calculate({
        beforeOnHand: 10,
        beforeReserved: 0,
        currentVersion: 0,
        expectedVersion: 0,
        operation: 'ADJUSTMENT',
        quantity: -3,
      }),
    ).toEqual({ afterOnHand: 7, afterReserved: 0, deltaOnHand: -3 });
  });

  it('rejects stale optimistic versions', () => {
    expect(() =>
      policy.calculate({
        beforeOnHand: 10,
        beforeReserved: 0,
        currentVersion: 2,
        expectedVersion: 1,
        operation: 'STOCK_IN',
        quantity: 1,
      }),
    ).toThrow(ConflictException);
  });

  it('prevents negative stock and reducing on-hand below reserved stock', () => {
    expect(() =>
      policy.calculate({
        beforeOnHand: 2,
        beforeReserved: 0,
        currentVersion: 0,
        expectedVersion: 0,
        operation: 'STOCK_OUT',
        quantity: 3,
      }),
    ).toThrow(ConflictException);
    expect(() =>
      policy.calculate({
        beforeOnHand: 10,
        beforeReserved: 8,
        currentVersion: 0,
        expectedVersion: 0,
        operation: 'ADJUSTMENT',
        quantity: -3,
      }),
    ).toThrow(ConflictException);
  });

  it('rejects invalid operation quantities', () => {
    expect(() =>
      policy.calculate({
        beforeOnHand: 10,
        beforeReserved: 0,
        currentVersion: 0,
        expectedVersion: 0,
        operation: 'STOCK_IN',
        quantity: 0,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      policy.calculate({
        beforeOnHand: 10,
        beforeReserved: 0,
        currentVersion: 0,
        expectedVersion: 0,
        operation: 'ADJUSTMENT',
        quantity: 0,
      }),
    ).toThrow(BadRequestException);
  });
});
