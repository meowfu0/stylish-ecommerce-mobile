import { apiRequest } from "@/services/api/api-client";
import { newIdempotencyKey } from "@/services/merchant/catalog-api";

/**
 * The merchant inventory API.
 *
 * Every type and route mirrors the backend one-for-one — see
 * `backend/src/modules/inventory/types/inventory.types.ts`,
 * `dto/inventory-request.dto.ts` and `merchant-inventory.controller.ts`.
 * Nothing is added that the server does not return.
 *
 * Base path `/merchants/:merchantId/inventory`. The merchant ID always comes
 * from the selected workspace, and the server re-checks membership and
 * permission on every call.
 */

export type InventoryStockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
export type InventoryMovementType = "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";

export const INVENTORY_STOCK_STATUSES: readonly InventoryStockStatus[] = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
];
export const INVENTORY_MOVEMENT_TYPES: readonly InventoryMovementType[] = [
  "STOCK_IN",
  "STOCK_OUT",
  "ADJUSTMENT",
];

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
  /**
   * The optimistic-locking token an adjustment must echo back. It is only
   * reported when a single location is in scope — an aggregate across every
   * location has no single version to lock against.
   */
  version: number | null;
  stockStatus: InventoryStockStatus;
  updatedAt: string;
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
  movementType: InventoryMovementType;
  deltaOnHand: number;
  beforeOnHand: number;
  afterOnHand: number;
  beforeReserved: number;
  afterReserved: number;
  reason: string;
  createdByUserId: string | null;
  createdAt: string;
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
  locations: {
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
  }[];
};

export type InventoryAdjustmentView = {
  movement: InventoryMovementView;
  balance: InventoryLevelView;
};

export type InventoryPage<Item> = {
  items: Item[];
  nextCursor: string | null;
};

export type InventoryLevelQuery = {
  cursor?: string;
  limit?: number;
  locationId?: string;
  productId?: string;
  variantId?: string;
  sku?: string;
  barcode?: string;
  search?: string;
  stockStatus?: InventoryStockStatus;
  activeOnly?: boolean;
};

/** Note: the movements endpoint accepts no free-text search. */
export type InventoryMovementQuery = {
  cursor?: string;
  limit?: number;
  locationId?: string;
  productId?: string;
  variantId?: string;
  movementType?: InventoryMovementType;
  createdFrom?: string;
  createdTo?: string;
};

export type CreateLocationBody = {
  code: string;
  name: string;
  addressSnapshot?: string;
  isActive?: boolean;
  isDefault?: boolean;
};

export type UpdateLocationBody = Partial<CreateLocationBody>;

export type AdjustmentBody = {
  locationId: string;
  variantId: string;
  operation: InventoryMovementType;
  /** Positive for STOCK_IN/STOCK_OUT; a signed non-zero delta for ADJUSTMENT. */
  quantity: number;
  /** The `version` from the level being adjusted; the server rejects a stale one. */
  expectedVersion: number;
  reason: string;
  reorderThreshold?: number;
};

const inventoryPath = (merchantId: string, suffix = "") =>
  `/merchants/${merchantId}/inventory${suffix}`;

function queryString(
  query: Record<string, string | number | boolean | undefined>,
) {
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  return params.length > 0 ? `?${params.join("&")}` : "";
}

export async function listLocations(
  merchantId: string,
  query: { activeOnly?: boolean } = {},
) {
  const response = await apiRequest<{ items: InventoryLocationView[] }>(
    `${inventoryPath(merchantId, "/locations")}${queryString(query)}`,
    { auth: true, method: "GET" },
  );
  return response.data.items;
}

export async function createLocation(
  merchantId: string,
  body: CreateLocationBody,
) {
  const response = await apiRequest<InventoryLocationView>(
    inventoryPath(merchantId, "/locations"),
    { auth: true, body: JSON.stringify(body), method: "POST" },
  );
  return response.data;
}

export async function updateLocation(
  merchantId: string,
  locationId: string,
  body: UpdateLocationBody,
) {
  const response = await apiRequest<InventoryLocationView>(
    inventoryPath(merchantId, `/locations/${locationId}`),
    { auth: true, body: JSON.stringify(body), method: "PATCH" },
  );
  return response.data;
}

export async function setDefaultLocation(
  merchantId: string,
  locationId: string,
) {
  const response = await apiRequest<InventoryLocationView>(
    inventoryPath(merchantId, `/locations/${locationId}/set-default`),
    { auth: true, method: "POST" },
  );
  return response.data;
}

export async function listLevels(
  merchantId: string,
  query: InventoryLevelQuery = {},
) {
  const response = await apiRequest<InventoryPage<InventoryLevelView>>(
    `${inventoryPath(merchantId, "/levels")}${queryString(query)}`,
    { auth: true, method: "GET" },
  );
  return response.data;
}

export async function listLowStock(
  merchantId: string,
  query: InventoryLevelQuery = {},
) {
  const response = await apiRequest<InventoryPage<InventoryLevelView>>(
    `${inventoryPath(merchantId, "/low-stock")}${queryString(query)}`,
    { auth: true, method: "GET" },
  );
  return response.data;
}

export async function listMovements(
  merchantId: string,
  query: InventoryMovementQuery = {},
) {
  const response = await apiRequest<InventoryPage<InventoryMovementView>>(
    `${inventoryPath(merchantId, "/movements")}${queryString(query)}`,
    { auth: true, method: "GET" },
  );
  return response.data;
}

export async function getVariantInventory(
  merchantId: string,
  variantId: string,
) {
  const response = await apiRequest<InventoryVariantView>(
    inventoryPath(merchantId, `/variants/${variantId}`),
    { auth: true, method: "GET" },
  );
  return response.data;
}

/**
 * Applies a stock adjustment. The server runs it in a transaction, writes the
 * `inventory_movements` history row alongside the balance, and rejects a stale
 * `expectedVersion` with a 409 rather than silently overwriting a concurrent
 * change.
 */
export async function adjustStock(
  merchantId: string,
  body: AdjustmentBody,
  idempotencyKey: string = newIdempotencyKey("adjust"),
) {
  const response = await apiRequest<InventoryAdjustmentView>(
    inventoryPath(merchantId, "/adjustments"),
    {
      auth: true,
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": idempotencyKey },
      method: "POST",
    },
  );
  return response.data;
}

export const stockStatusLabels: Record<InventoryStockStatus, string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
};

export const movementTypeLabels: Record<InventoryMovementType, string> = {
  ADJUSTMENT: "Adjustment",
  STOCK_IN: "Stock in",
  STOCK_OUT: "Stock out",
};

/**
 * The server's own rules, mirrored so a request that cannot succeed is never
 * sent: STOCK_IN and STOCK_OUT take a positive quantity, ADJUSTMENT takes a
 * signed non-zero delta, and a reason of 3–500 characters is always required.
 */
export function validateAdjustment({
  operation,
  quantity,
  reason,
}: {
  operation: InventoryMovementType;
  quantity: number;
  reason: string;
}) {
  const errors: { quantity?: string; reason?: string } = {};

  if (!Number.isInteger(quantity)) {
    errors.quantity = "Enter a whole number";
  } else if (operation === "ADJUSTMENT") {
    if (quantity === 0) errors.quantity = "Enter a non-zero change";
  } else if (quantity <= 0) {
    errors.quantity = "Enter a quantity greater than zero";
  }

  const trimmed = reason.trim();
  if (trimmed.length < 3)
    errors.reason = "Give a reason of at least 3 characters";
  else if (trimmed.length > 500) errors.reason = "Use at most 500 characters";

  return errors;
}

/** The on-hand figure an adjustment would produce, for the modal's preview. */
export function projectedOnHand(
  onHand: number,
  operation: InventoryMovementType,
  quantity: number,
) {
  if (!Number.isFinite(quantity)) return onHand;
  if (operation === "STOCK_IN") return onHand + Math.abs(quantity);
  if (operation === "STOCK_OUT") return onHand - Math.abs(quantity);
  return onHand + quantity;
}
