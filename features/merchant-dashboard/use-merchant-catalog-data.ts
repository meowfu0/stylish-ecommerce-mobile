import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type CatalogSectionLoaders,
  type CatalogSnapshot,
  defaultCatalogSectionLoaders,
  emptyCatalogSnapshot,
  isPermissionDenied,
  loadCatalogSnapshot,
} from "@/features/merchant-dashboard/catalog-data-source";
import { resolveDashboardDataState } from "@/features/merchant-dashboard/dashboard-state-model";
import type {
  CatalogPageKey,
  DashboardDataState,
} from "@/features/merchant-dashboard/dashboard-types";
import { CATALOG_PAGE_KEYS } from "@/features/merchant-dashboard/dashboard-types";
import type { ProductListQuery } from "@/services/merchant/catalog-api";

export type MerchantCatalogData = CatalogSnapshot & {
  dataState: DashboardDataState;
  failedSections: CatalogPageKey[];
  /** True when the API refused the whole catalog for this role. */
  permissionDenied: boolean;
  refresh: () => void;
  retry: () => void;
};

/**
 * Owns catalog loading for the four Catalog pages.
 *
 * Filtering is server-side: the query is part of the effect's identity, so
 * changing a filter refetches rather than narrowing a stale page. A refetch
 * keeps the previous snapshot on screen and reports `refreshing`, which is what
 * lets the table stay put after a create or an edit instead of flashing its
 * skeleton.
 */
export function useMerchantCatalogData({
  enabled,
  loaders,
  merchantId,
  productQuery,
}: {
  enabled: boolean;
  /** Injected by tests; production builds them from the merchant and query. */
  loaders?: CatalogSectionLoaders;
  merchantId?: string;
  productQuery?: ProductListQuery;
}): MerchantCatalogData {
  const [attempt, setAttempt] = useState(0);
  const [failedSections, setFailedSections] = useState<CatalogPageKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null);
  const haltedRef = useRef(false);
  const loadersRef = useRef(loaders);
  loadersRef.current = loaders;

  // Serialised so an inline query object cannot restart the effect every render,
  // while a genuinely different filter still does.
  const queryKey = JSON.stringify(productQuery ?? {});

  useEffect(() => {
    if (!enabled || haltedRef.current || (!loadersRef.current && !merchantId)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const resolved =
      loadersRef.current ??
      defaultCatalogSectionLoaders({
        merchantId: merchantId as string,
        productQuery: JSON.parse(queryKey) as ProductListQuery,
      });

    loadCatalogSnapshot(resolved)
      .then((result) => {
        if (cancelled) return;
        setPermissionDenied(false);
        setFailedSections(result.failedSections);
        if (result.failedSections.length < CATALOG_PAGE_KEYS.length) {
          setSnapshot(result.snapshot);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isPermissionDenied(error)) {
          // The role cannot read the catalog. That is a stable answer, so stop
          // asking rather than retrying a call that will keep being refused.
          haltedRef.current = true;
          setPermissionDenied(true);
          setFailedSections([]);
          return;
        }
        // Only an expired session reaches here; the auth store already owns that
        // state, so stop requesting until the merchant signs in again.
        haltedRef.current = true;
        setFailedSections([]);
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

  const resolved = snapshot ?? emptyCatalogSnapshot;

  return useMemo(
    () => ({
      ...resolved,
      dataState: resolveDashboardDataState({
        failedSectionCount: failedSections.length,
        // Only a catalog with nothing in it at all is the onboarding state. A
        // merchant with categories but no products yet is working normally, and
        // the Products page shows its own guidance for that.
        hasCatalog:
          resolved.products.length +
            resolved.categories.length +
            resolved.collections.length +
            resolved.brands.length >
          0,
        hasSnapshot: snapshot !== null,
        loading,
        sectionCount: CATALOG_PAGE_KEYS.length,
      }),
      failedSections,
      permissionDenied,
      refresh: reload,
      retry: reload,
    }),
    [failedSections, loading, permissionDenied, reload, resolved, snapshot],
  );
}
