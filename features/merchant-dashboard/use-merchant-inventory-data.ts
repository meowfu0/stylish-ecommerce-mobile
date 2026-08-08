import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  defaultInventorySectionLoaders,
  emptyInventorySnapshot,
  INVENTORY_PAGE_KEYS,
  type InventoryPageKey,
  type InventorySectionLoaders,
  type InventorySnapshot,
  isPermissionDenied,
  loadInventorySnapshot,
} from "@/features/merchant-dashboard/inventory-data-source";
import { resolveDashboardDataState } from "@/features/merchant-dashboard/dashboard-state-model";
import type { DashboardDataState } from "@/features/merchant-dashboard/dashboard-types";
import type {
  InventoryLevelQuery,
  InventoryMovementQuery,
} from "@/services/merchant/inventory-api";

export type MerchantInventoryData = InventorySnapshot & {
  dataState: DashboardDataState;
  failedSections: InventoryPageKey[];
  permissionDenied: boolean;
  refresh: () => void;
  retry: () => void;
};

/**
 * Owns inventory loading for the four Inventory pages.
 *
 * Filtering is server-side, so each query is part of the effect's identity: a
 * new filter refetches rather than narrowing a stale page. A refetch keeps the
 * previous snapshot on screen and reports `refreshing`, which is what lets a
 * table stay put after a stock adjustment instead of flashing its skeleton.
 */
export function useMerchantInventoryData({
  enabled,
  levelQuery,
  loaders,
  lowStockQuery,
  merchantId,
  movementQuery,
}: {
  enabled: boolean;
  levelQuery?: InventoryLevelQuery;
  /** Injected by tests; production builds them from the merchant and queries. */
  loaders?: InventorySectionLoaders;
  lowStockQuery?: InventoryLevelQuery;
  merchantId?: string;
  movementQuery?: InventoryMovementQuery;
}): MerchantInventoryData {
  const [attempt, setAttempt] = useState(0);
  const [failedSections, setFailedSections] = useState<InventoryPageKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(null);
  const haltedRef = useRef(false);
  const loadersRef = useRef(loaders);
  loadersRef.current = loaders;

  // Serialised so inline query objects cannot restart the effect every render,
  // while a genuinely different filter still does.
  const queryKey = JSON.stringify({
    levelQuery: levelQuery ?? {},
    lowStockQuery: lowStockQuery ?? {},
    movementQuery: movementQuery ?? {},
  });

  useEffect(() => {
    if (!enabled || haltedRef.current || (!loadersRef.current && !merchantId)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const queries = JSON.parse(queryKey) as {
      levelQuery: InventoryLevelQuery;
      lowStockQuery: InventoryLevelQuery;
      movementQuery: InventoryMovementQuery;
    };
    const resolved =
      loadersRef.current ??
      defaultInventorySectionLoaders({
        merchantId: merchantId as string,
        ...queries,
      });

    loadInventorySnapshot(resolved)
      .then((result) => {
        if (cancelled) return;
        setPermissionDenied(false);
        setFailedSections(result.failedSections);
        // A total failure keeps the last good snapshot visible.
        if (result.failedSections.length < INVENTORY_PAGE_KEYS.length) {
          setSnapshot(result.snapshot);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        haltedRef.current = true;
        setFailedSections([]);
        // A denial is stable, so stop asking rather than retrying a call that
        // will keep being refused. An expired session is owned by the auth
        // store, which is already tearing the session down.
        setPermissionDenied(isPermissionDenied(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, enabled, merchantId, queryKey]);

  const reload = useCallback(() => {
    if (haltedRef.current) return;
    setAttempt((current) => current + 1);
  }, []);

  const resolved = snapshot ?? emptyInventorySnapshot;

  return useMemo(
    () => ({
      ...resolved,
      dataState: resolveDashboardDataState({
        failedSectionCount: failedSections.length,
        // A merchant with no variants tracked anywhere is the onboarding state;
        // having locations but no stock yet is normal, and the Stock Levels
        // page shows its own guidance for that.
        hasCatalog:
          resolved.levels.length +
            resolved.locations.length +
            resolved.movements.length >
          0,
        hasSnapshot: snapshot !== null,
        loading,
        sectionCount: INVENTORY_PAGE_KEYS.length,
      }),
      failedSections,
      permissionDenied,
      refresh: reload,
      retry: reload,
    }),
    [failedSections, loading, permissionDenied, reload, resolved, snapshot],
  );
}
