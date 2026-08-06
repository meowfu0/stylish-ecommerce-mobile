export type InventoryStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type InventoryLocationView = {
  id: string;
  merchantId: string;
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  addressSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryLevelView = {
  merchantId: string;
  locationId: string | null;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  barcode: string | null;
  isActive: boolean;
  onHand: number;
  reserved: number;
  available: number;
  reorderThreshold: number;
  version: number | null;
  stockStatus: InventoryStockStatus;
  updatedAt: string;
};

export type InventoryVariantView = {
  merchantId: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  barcode: string | null;
  isActive: boolean;
  totals: {
    onHand: number;
    reserved: number;
    available: number;
    reorderThreshold: number;
    stockStatus: InventoryStockStatus;
  };
  locations: Array<{
    locationId: string;
    locationCode: string;
    locationName: string;
    isDefault: boolean;
    isActive: boolean;
    onHand: number;
    reserved: number;
    available: number;
    reorderThreshold: number;
    version: number;
    stockStatus: InventoryStockStatus;
  }>;
};

export type InventoryMovementView = {
  id: string;
  merchantId: string;
  locationId: string;
  locationCode: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  movementType: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';
  deltaOnHand: number;
  beforeOnHand: number;
  afterOnHand: number;
  beforeReserved: number;
  afterReserved: number;
  reason: string;
  createdByUserId: string | null;
  createdAt: string;
};

export type InventoryAdjustmentView = {
  movement: InventoryMovementView;
  balance: InventoryLevelView;
};

export type InventoryPage<T> = {
  items: T[];
  nextCursor: string | null;
};
