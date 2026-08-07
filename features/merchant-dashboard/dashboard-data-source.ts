import {
  activityEvents,
  chartSeries,
  dashboardMetrics,
  lowStockAlerts,
  pipelineStages,
  recentOrders,
  topProducts,
} from "@/features/merchant-dashboard/dashboard-data";
import type {
  DashboardSectionKey,
  Metric,
  PipelineStage,
} from "@/features/merchant-dashboard/dashboard-types";
import { DASHBOARD_SECTION_KEYS } from "@/features/merchant-dashboard/dashboard-types";
import { AuthRequestError } from "@/services/auth/auth-error";

export const dashboardSectionLabels: Record<DashboardSectionKey, string> = {
  activity: "Recent activity",
  catalog: "Catalog summary",
  inventory: "Inventory and low stock",
  metrics: "Performance metrics",
  orders: "Orders",
  sales: "Sales performance",
};

/**
 * One request per dashboard region. Each region resolves independently so a
 * single failing region degrades to the partial-data state instead of taking
 * the whole dashboard down. Swap a loader body for its merchant endpoint as
 * that endpoint lands; nothing else in the state pipeline has to change.
 */
export type DashboardSectionLoaders = Record<
  DashboardSectionKey,
  () => Promise<unknown>
>;

export const defaultDashboardSectionLoaders: DashboardSectionLoaders = {
  activity: async () => activityEvents,
  catalog: async () => topProducts,
  inventory: async () => lowStockAlerts,
  metrics: async () => dashboardMetrics,
  orders: async () => ({ pipelineStages, recentOrders }),
  sales: async () => chartSeries,
};

export type DashboardSnapshot = {
  /** A merchant with no catalog has never sold; it gets guided onboarding. */
  hasCatalog: boolean;
  /** Drives the Sales Performance empty state without inventing chart points. */
  hasSalesHistory: boolean;
  /** Summary cards, rendered from whatever the metrics region returned. */
  metrics: Metric[];
  /** Order pipeline stages; the range total is summed from these counts. */
  pipelineStages: PipelineStage[];
};

export type DashboardLoadResult = {
  failedSections: DashboardSectionKey[];
  snapshot: DashboardSnapshot;
};

function isSessionExpiry(error: unknown) {
  return error instanceof AuthRequestError && error.kind === "session-expired";
}

/**
 * Resolves every dashboard region in parallel and reports which ones failed.
 * Throws only for an expired session, so the caller can stop requesting
 * instead of retrying a session that can no longer succeed.
 */
export async function loadDashboardSnapshot(
  loaders: DashboardSectionLoaders = defaultDashboardSectionLoaders,
): Promise<DashboardLoadResult> {
  const settled = await Promise.allSettled(
    DASHBOARD_SECTION_KEYS.map((key) => loaders[key]()),
  );

  const expired = settled.find(
    (result) => result.status === "rejected" && isSessionExpiry(result.reason),
  );
  if (expired && expired.status === "rejected") {
    throw expired.reason;
  }

  const failedSections = DASHBOARD_SECTION_KEYS.filter(
    (_key, index) => settled[index].status === "rejected",
  );
  const sectionValue = (key: DashboardSectionKey) => {
    const result = settled[DASHBOARD_SECTION_KEYS.indexOf(key)];
    return result.status === "fulfilled" ? result.value : undefined;
  };

  return {
    failedSections,
    snapshot: {
      hasCatalog: !isEmptyCollection(sectionValue("catalog")),
      hasSalesHistory: !isEmptyCollection(sectionValue("sales")),
      metrics: asMetrics(sectionValue("metrics")),
      pipelineStages: asPipelineStages(sectionValue("orders")),
    },
  };
}

function isEmptyCollection(value: unknown) {
  return !Array.isArray(value) || value.length === 0;
}

function asMetrics(value: unknown): Metric[] {
  return Array.isArray(value) ? (value as Metric[]) : [];
}

function asPipelineStages(value: unknown): PipelineStage[] {
  const stages = (value as { pipelineStages?: unknown } | undefined)
    ?.pipelineStages;
  return Array.isArray(stages) ? (stages as PipelineStage[]) : [];
}
