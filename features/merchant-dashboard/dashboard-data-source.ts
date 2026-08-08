import {
  activityEvents,
  catalogSummary,
  dashboardMetrics,
  inventorySummary,
  lowStockAlerts,
  pipelineStages,
  recentOrders,
  salesSeries,
  topProducts,
} from "@/features/merchant-dashboard/dashboard-data";
import type {
  CatalogSummaryCounts,
  ChartCadence,
  DashboardSectionKey,
  InventorySummary,
  Metric,
  PipelineStage,
  SalesPoint,
  SalesSeries,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  CHART_CADENCES,
  DASHBOARD_SECTION_KEYS,
} from "@/features/merchant-dashboard/dashboard-types";
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
  catalog: async () => ({ products: topProducts, summary: catalogSummary }),
  inventory: async () => ({
    alerts: lowStockAlerts,
    summary: inventorySummary,
  }),
  metrics: async () => dashboardMetrics,
  orders: async () => ({ pipelineStages, recentOrders }),
  sales: async () => salesSeries,
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
  /** Publication readiness behind the Catalog summary card. */
  catalogSummary: CatalogSummaryCounts;
  /** Variant counts behind the Inventory overview card and its stock bar. */
  inventorySummary: InventorySummary;
  /** Sales points per cadence; the chart derives its axes and totals from these. */
  salesSeries: SalesSeries;
};

export const emptyCatalogSummary: CatalogSummaryCounts = {
  activeProducts: 0,
  archivedProducts: 0,
  draftProducts: 0,
  inactiveProducts: 0,
  missingActiveVariants: 0,
  missingImages: 0,
};

export const emptyInventorySummary: InventorySummary = {
  inStock: 0,
  lowStock: 0,
  outOfStock: 0,
  totalActiveVariants: 0,
};

export const emptySalesSeries: SalesSeries = {
  daily: [],
  monthly: [],
  weekly: [],
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

  const sales = asSalesSeries(sectionValue("sales"));

  return {
    failedSections,
    snapshot: {
      catalogSummary: asCatalogSummary(sectionValue("catalog")),
      hasCatalog: !isEmptyCollection(catalogProducts(sectionValue("catalog"))),
      hasSalesHistory: CHART_CADENCES.some(
        (cadence) => sales[cadence].length > 0,
      ),
      inventorySummary: asInventorySummary(sectionValue("inventory")),
      metrics: asMetrics(sectionValue("metrics")),
      pipelineStages: asPipelineStages(sectionValue("orders")),
      salesSeries: sales,
    },
  };
}

function isEmptyCollection(value: unknown) {
  return !Array.isArray(value) || value.length === 0;
}

function asMetrics(value: unknown): Metric[] {
  return Array.isArray(value) ? (value as Metric[]) : [];
}

/** Coerces one numeric analytics field, treating anything unusable as zero. */
function asFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Normalizes the sales region into a full per-cadence series. A partial or
 * malformed payload degrades to the points it can read rather than throwing:
 * a missing cadence becomes an empty series, which the chart already renders
 * as its empty state instead of inventing points.
 */
function asSalesSeries(value: unknown): SalesSeries {
  const source = (value ?? {}) as Partial<Record<ChartCadence, unknown>>;

  return CHART_CADENCES.reduce((series, cadence) => {
    const points = source[cadence];
    series[cadence] = Array.isArray(points)
      ? points
          .filter(
            (point): point is Record<string, unknown> =>
              typeof point === "object" && point !== null,
          )
          .map<SalesPoint>((point) => ({
            label: typeof point.label === "string" ? point.label : "",
            orders: asFiniteNumber(point.orders),
            refunds: asFiniteNumber(point.refunds),
            revenue: asFiniteNumber(point.revenue),
            ...(typeof point.timestamp === "string"
              ? { timestamp: point.timestamp }
              : {}),
          }))
      : [];
    return series;
  }, {} as SalesSeries);
}

/**
 * The catalog region reports its products alongside a readiness summary. A bare
 * array is still accepted so a loader that only returns products keeps working.
 */
function catalogProducts(value: unknown) {
  if (Array.isArray(value)) return value;
  return (value as { products?: unknown } | undefined)?.products;
}

function asCatalogSummary(value: unknown): CatalogSummaryCounts {
  const summary = (value as { summary?: unknown } | undefined)?.summary as
    Partial<Record<keyof CatalogSummaryCounts, unknown>> | undefined;
  if (!summary || typeof summary !== "object") return emptyCatalogSummary;

  return {
    activeProducts: asFiniteNumber(summary.activeProducts),
    archivedProducts: asFiniteNumber(summary.archivedProducts),
    draftProducts: asFiniteNumber(summary.draftProducts),
    inactiveProducts: asFiniteNumber(summary.inactiveProducts),
    missingActiveVariants: asFiniteNumber(summary.missingActiveVariants),
    missingImages: asFiniteNumber(summary.missingImages),
  };
}

/**
 * Reads the inventory region's summary. A missing or malformed payload becomes
 * all zeroes, which the card renders as an empty distribution bar rather than
 * inventing stock levels.
 */
function asInventorySummary(value: unknown): InventorySummary {
  const summary = (value as { summary?: unknown } | undefined)?.summary as
    Partial<Record<keyof InventorySummary, unknown>> | undefined;
  if (!summary || typeof summary !== "object") return emptyInventorySummary;

  return {
    inStock: asFiniteNumber(summary.inStock),
    lowStock: asFiniteNumber(summary.lowStock),
    outOfStock: asFiniteNumber(summary.outOfStock),
    totalActiveVariants: asFiniteNumber(summary.totalActiveVariants),
  };
}

function asPipelineStages(value: unknown): PipelineStage[] {
  const stages = (value as { pipelineStages?: unknown } | undefined)
    ?.pipelineStages;
  return Array.isArray(stages) ? (stages as PipelineStage[]) : [];
}
