import { AuthRequestError } from "@/services/auth/auth-error";
import {
  type InventoryLevelQuery,
  type InventoryLevelView,
  type InventoryLocationView,
  type InventoryMovementQuery,
  type InventoryMovementView,
  listLevels,
  listLocations,
  listLowStock,
  listMovements,
} from "@/services/merchant/inventory-api";

/**
 * Loads the four Inventory pages from the merchant inventory API.
 *
 * Each region resolves independently so one failing endpoint degrades to the
 * partial-data state instead of taking the page down — the same contract the
 * overview and catalog data sources give. Nothing here holds fixtures.
 */

export const INVENTORY_PAGE_KEYS = [
  "stock-levels",
  "locations",
  "movements",
  "low-stock",
] as const;
export type InventoryPageKey = (typeof INVENTORY_PAGE_KEYS)[number];

export const inventorySectionLabels: Record<InventoryPageKey, string> = {
  locations: "Locations",
  "low-stock": "Low stock",
  movements: "Movements",
  "stock-levels": "Stock levels",
};

/**
 * The badge is capped at this many rows because the low-stock endpoint is
 * cursor-paginated and reports no total. A merchant with more than this reads
 * as "99+" rather than as a number the API never gave us.
 */
export const LOW_STOCK_BADGE_LIMIT = 100;

export type InventorySectionLoaders = {
  levels: () => Promise<{
    items: InventoryLevelView[];
    nextCursor: string | null;
  }>;
  locations: () => Promise<InventoryLocationView[]>;
  lowStock: () => Promise<{
    items: InventoryLevelView[];
    nextCursor: string | null;
  }>;
  movements: () => Promise<{
    items: InventoryMovementView[];
    nextCursor: string | null;
  }>;
};

export type InventorySnapshot = {
  levels: InventoryLevelView[];
  levelsCursor: string | null;
  locations: InventoryLocationView[];
  locationNames: ReadonlyMap<string, string>;
  lowStock: InventoryLevelView[];
  lowStockCursor: string | null;
  /** Capped at `LOW_STOCK_BADGE_LIMIT`; `true` when the cap was reached. */
  lowStockCount: number;
  lowStockCapped: boolean;
  movements: InventoryMovementView[];
  movementsCursor: string | null;
};

export const emptyInventorySnapshot: InventorySnapshot = {
  levels: [],
  levelsCursor: null,
  locationNames: new Map(),
  locations: [],
  lowStock: [],
  lowStockCapped: false,
  lowStockCount: 0,
  lowStockCursor: null,
  movements: [],
  movementsCursor: null,
};

export type InventoryLoadResult = {
  failedSections: InventoryPageKey[];
  snapshot: InventorySnapshot;
};

export function defaultInventorySectionLoaders({
  levelQuery = {},
  lowStockQuery = {},
  merchantId,
  movementQuery = {},
}: {
  levelQuery?: InventoryLevelQuery;
  lowStockQuery?: InventoryLevelQuery;
  merchantId: string;
  movementQuery?: InventoryMovementQuery;
}): InventorySectionLoaders {
  return {
    levels: () => listLevels(merchantId, levelQuery),
    locations: () => listLocations(merchantId),
    lowStock: () =>
      listLowStock(merchantId, {
        limit: LOW_STOCK_BADGE_LIMIT,
        ...lowStockQuery,
      }),
    movements: () => listMovements(merchantId, movementQuery),
  };
}

function isSessionExpiry(error: unknown) {
  return error instanceof AuthRequestError && error.kind === "session-expired";
}

export function isPermissionDenied(error: unknown) {
  return (
    error instanceof AuthRequestError && error.kind === "permission-denied"
  );
}

export async function loadInventorySnapshot(
  loaders: InventorySectionLoaders,
): Promise<InventoryLoadResult> {
  const settled = await Promise.allSettled([
    loaders.levels(),
    loaders.locations(),
    loaders.movements(),
    loaders.lowStock(),
  ]);
  const order: InventoryPageKey[] = [
    "stock-levels",
    "locations",
    "movements",
    "low-stock",
  ];

  // A denial or an expired session is a stable answer about the whole section,
  // not one region failing, so it propagates instead of degrading to partial.
  const fatal = settled.find(
    (result) =>
      result.status === "rejected" &&
      (isSessionExpiry(result.reason) || isPermissionDenied(result.reason)),
  );
  if (fatal && fatal.status === "rejected") throw fatal.reason;

  const failedSections = order.filter(
    (_key, index) => settled[index].status === "rejected",
  );
  const value = <Value>(index: number, fallback: Value): Value => {
    const result = settled[index];
    return result.status === "fulfilled" ? (result.value as Value) : fallback;
  };

  const emptyPage = { items: [], nextCursor: null };
  const levels = value<{
    items: InventoryLevelView[];
    nextCursor: string | null;
  }>(0, emptyPage);
  const locations = value<InventoryLocationView[]>(1, []);
  const movements = value<{
    items: InventoryMovementView[];
    nextCursor: string | null;
  }>(2, emptyPage);
  const lowStock = value<{
    items: InventoryLevelView[];
    nextCursor: string | null;
  }>(3, emptyPage);

  return {
    failedSections,
    snapshot: {
      levels: levels.items,
      levelsCursor: levels.nextCursor,
      locationNames: new Map(
        locations.map((location) => [location.id, location.name]),
      ),
      locations,
      lowStock: lowStock.items,
      lowStockCapped: lowStock.items.length >= LOW_STOCK_BADGE_LIMIT,
      lowStockCount: lowStock.items.length,
      lowStockCursor: lowStock.nextCursor,
      movements: movements.items,
      movementsCursor: movements.nextCursor,
    },
  };
}
