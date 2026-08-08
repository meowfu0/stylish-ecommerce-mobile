import { useCallback, useEffect, useRef, useState } from "react";

import {
  type DashboardSectionLoaders,
  type DashboardSnapshot,
  emptyCatalogSummary,
  emptyInventorySummary,
  emptySalesSeries,
  loadDashboardSnapshot,
} from "@/features/merchant-dashboard/dashboard-data-source";
import { resolveDashboardDataState } from "@/features/merchant-dashboard/dashboard-state-model";
import type {
  CatalogSummaryCounts,
  DashboardDataState,
  DashboardSectionKey,
  InventorySummary,
  Metric,
  PipelineStage,
  SalesSeries,
} from "@/features/merchant-dashboard/dashboard-types";
import { DASHBOARD_SECTION_KEYS } from "@/features/merchant-dashboard/dashboard-types";

export type MerchantDashboardData = {
  dataState: DashboardDataState;
  failedSections: DashboardSectionKey[];
  catalogSummary: CatalogSummaryCounts;
  hasSalesHistory: boolean;
  inventorySummary: InventorySummary;
  metrics: Metric[];
  pipelineStages: PipelineStage[];
  refresh: () => void;
  retry: () => void;
  salesSeries: SalesSeries;
};

/**
 * Owns dashboard loading for the merchant overview. Requests stop entirely
 * once the session expires so an invalid session never drives a retry loop,
 * and a reload keeps the previous snapshot on screen instead of clearing it.
 */
export function useMerchantDashboardData({
  enabled,
  loaders,
}: {
  enabled: boolean;
  loaders?: DashboardSectionLoaders;
}): MerchantDashboardData {
  const [attempt, setAttempt] = useState(0);
  const [failedSections, setFailedSections] = useState<DashboardSectionKey[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const haltedRef = useRef(false);
  // Held in a ref so an inline loader map cannot restart the effect forever.
  const loadersRef = useRef(loaders);
  loadersRef.current = loaders;

  useEffect(() => {
    if (!enabled || haltedRef.current) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadDashboardSnapshot(loadersRef.current)
      .then((result) => {
        if (cancelled) return;
        setFailedSections(result.failedSections);
        // A total failure keeps the last good snapshot visible.
        if (result.failedSections.length < DASHBOARD_SECTION_KEYS.length) {
          setSnapshot(result.snapshot);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Only an expired session reaches here; the auth store already owns
        // that state, so stop requesting until the merchant signs in again.
        haltedRef.current = true;
        setFailedSections([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, enabled]);

  const reload = useCallback(() => {
    if (haltedRef.current) return;
    setAttempt((current) => current + 1);
  }, []);

  return {
    dataState: resolveDashboardDataState({
      failedSectionCount: failedSections.length,
      hasCatalog: snapshot?.hasCatalog ?? false,
      hasSnapshot: snapshot !== null,
      loading,
      sectionCount: DASHBOARD_SECTION_KEYS.length,
    }),
    failedSections,
    catalogSummary: snapshot?.catalogSummary ?? emptyCatalogSummary,
    hasSalesHistory: snapshot?.hasSalesHistory ?? false,
    inventorySummary: snapshot?.inventorySummary ?? emptyInventorySummary,
    metrics: snapshot?.metrics ?? [],
    pipelineStages: snapshot?.pipelineStages ?? [],
    salesSeries: snapshot?.salesSeries ?? emptySalesSeries,
    refresh: reload,
    retry: reload,
  };
}
