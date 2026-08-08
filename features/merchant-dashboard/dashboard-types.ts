import type { ImageSourcePropType } from "react-native";

export type DashboardState =
  | "loading"
  | "ready"
  | "empty"
  | "partial"
  | "refreshing"
  | "error"
  | "permission-denied"
  | "session-expired"
  | "inactive";

export const DASHBOARD_STATES: DashboardState[] = [
  "loading",
  "ready",
  "empty",
  "partial",
  "refreshing",
  "error",
  "permission-denied",
  "session-expired",
  "inactive",
];

export type DashboardDataState = Exclude<
  DashboardState,
  "inactive" | "permission-denied" | "session-expired"
>;

/** One independently loaded dashboard region. */
export type DashboardSectionKey =
  | "activity"
  | "catalog"
  | "inventory"
  | "metrics"
  | "orders"
  | "sales";

export const DASHBOARD_SECTION_KEYS: DashboardSectionKey[] = [
  "metrics",
  "sales",
  "orders",
  "inventory",
  "catalog",
  "activity",
];

export type MerchantRole =
  | "Merchant Owner"
  | "Merchant Administrator"
  | "Manager"
  | "Catalog Staff"
  | "Inventory Staff"
  | "Fulfillment Staff"
  | "Support Staff";

export type Permission =
  | "products.read"
  | "products.write"
  | "products.publish"
  | "inventory.read"
  | "inventory.adjust"
  | "inventory.locations.manage"
  | "orders.read"
  | "orders.fulfill"
  | "promotions.manage"
  | "reviews.moderate"
  | "staff.manage"
  | "reports.read"
  | "merchant.profile.update"
  | "settings.manage";

export type MerchantSession = {
  defaultLocation: string;
  displayName: string;
  email: string;
  merchantHandle: string;
  merchantName: string;
  permissions: Permission[];
  role: MerchantRole;
  storeStatus: "active" | "suspended" | "inactive";
  verified: boolean;
};

export type DateRange = "7d" | "30d" | "90d" | "mtd";
export const CHART_CADENCES = ["daily", "weekly", "monthly"] as const;
export type ChartCadence = (typeof CHART_CADENCES)[number];

/**
 * One interval on the sales chart. Money is centavos, matching
 * `Metric.valueCentavos` and what `formatPeso` expects, so the whole dashboard
 * keeps a single currency unit.
 */
export type SalesPoint = {
  label: string;
  /** Orders closed in the interval. */
  orders: number;
  /** Refunded value in centavos. */
  refunds: number;
  /** Gross revenue in centavos. */
  revenue: number;
  /** Interval start, once the analytics API supplies one. */
  timestamp?: string;
};

/**
 * The chart's dataset, keyed by cadence. Switching granularity selects a
 * different series rather than relabelling the same points, which is also the
 * shape the analytics endpoint should return per requested interval.
 */
export type SalesSeries = Record<ChartCadence, SalesPoint[]>;

export type Metric = {
  changePercent: number;
  comparison: string;
  key: string;
  label: string;
  sparkline: number[];
  value: string;
  valueCentavos?: number;
};

/**
 * Publication readiness behind the Catalog summary card. The last two are the
 * counts that need attention; the rest describe where the library stands.
 */
export type CatalogSummaryCounts = {
  activeProducts: number;
  archivedProducts: number;
  draftProducts: number;
  inactiveProducts: number;
  missingActiveVariants: number;
  missingImages: number;
};

/**
 * Variant counts behind the Inventory overview card. The three stock states are
 * the parts of the distribution bar; `totalActiveVariants` is reported
 * separately because a merchant's catalogue can hold variants that are not yet
 * tracked in any of them.
 */
export type InventorySummary = {
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalActiveVariants: number;
};

export type PipelineStage = {
  count: number;
  key: string;
  label: string;
  tone: "blue" | "green" | "neutral" | "pink" | "warning";
};

export type ActionItem = {
  action: string;
  count: number;
  key: string;
  label: string;
  permission: Permission;
  severity: "critical" | "review" | "warning";
};

export type ProductRow = {
  image: ImageSourcePropType;
  name: string;
  revenueCentavos: number;
  sku: string;
  stockStatus: "In stock" | "Low stock" | "Out of stock";
  trendPercent: number;
  units: number;
};

export type InventoryAlert = {
  available: number;
  image: ImageSourcePropType;
  location: string;
  name: string;
  onHand: number;
  reorderThreshold: number;
  reserved: number;
  sku: string;
  variant: string;
};

/**
 * The order lifecycle the dashboard already models — the same states the order
 * pipeline reports. Listed here so the Recent orders filter offers the real
 * vocabulary rather than only the states the current page happens to contain.
 */
export const ORDER_STATUSES = [
  "New",
  "Confirmed",
  "Processing",
  "Ready to Ship",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "Paid",
  "Pending",
  "Refunded",
  "Failed",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  "Unfulfilled",
  "Packing",
  "Shipped",
  "Delivered",
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export type RecentOrder = {
  customer: string;
  /** ISO date; the table formats and sorts on it. */
  date: string;
  fulfillment: FulfillmentStatus;
  items: number;
  orderNumber: string;
  payment: PaymentStatus;
  status: OrderStatus;
  totalCentavos: number;
};

export type ActivityEvent = {
  actor: string;
  key: string;
  summary: string;
  time: string;
  tone: "blue" | "green" | "neutral" | "pink" | "warning";
  type: "image" | "inventory" | "order" | "product" | "profile" | "staff";
};

export type DashboardNotification = {
  key: string;
  message: string;
  time: string;
  unread: boolean;
};
