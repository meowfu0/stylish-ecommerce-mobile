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
  "activity" | "catalog" | "inventory" | "metrics" | "orders" | "sales";

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
  /**
   * The merchant's real UUID, which every catalog API path is scoped by. Absent
   * only in previews and documentation fixtures; a surface that calls the API
   * must handle that rather than assume one.
   */
  merchantId?: string;
  merchantName: string;
  permissions: Permission[];
  role: MerchantRole;
  /**
   * `under_review` is the state a merchant sits in between applying and being
   * approved. Every selling guard reads `!== "active"`, so it blocks the same
   * surfaces a suspension does while carrying its own, more hopeful, copy.
   */
  storeStatus: "active" | "suspended" | "inactive" | "under_review";
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

/**
 * The three stock states the dashboard tracks, shared by the inventory bar, the
 * top-products list and the catalog table so one vocabulary drives every badge.
 */
export const CATALOG_STOCK_STATES = [
  "In stock",
  "Low stock",
  "Out of stock",
] as const;
export type CatalogStockState = (typeof CATALOG_STOCK_STATES)[number];

export type ProductRow = {
  image: ImageSourcePropType;
  name: string;
  revenueCentavos: number;
  sku: string;
  stockStatus: CatalogStockState;
  trendPercent: number;
  units: number;
};

/**
 * Publication lifecycle for a product. `CatalogSummaryCounts` already reports
 * these four buckets, so the catalog table names them identically rather than
 * introducing a second vocabulary for the same thing.
 */
export const CATALOG_PRODUCT_STATUSES = [
  "Active",
  "Draft",
  "Inactive",
  "Archived",
] as const;
export type CatalogProductStatus = (typeof CATALOG_PRODUCT_STATUSES)[number];

/**
 * One row of the merchant's product library. Money stays in centavos like every
 * other figure on the dashboard, and `updatedAt` stays ISO so the table can sort
 * on it exactly instead of parsing its own display text.
 */
export type CatalogProduct = {
  brandKey: string;
  categoryKey: string;
  collectionKeys: readonly string[];
  id: string;
  /** Absent for a product with no image yet — a readiness gap the page counts. */
  image?: ImageSourcePropType;
  name: string;
  priceCentavos: number;
  sku: string;
  status: CatalogProductStatus;
  stockOnHand: number;
  stockStatus: CatalogStockState;
  updatedAt: string;
  variants: number;
};

/**
 * The Catalog group's four destinations. Shared by the sidebar's navigation
 * model and the catalog data source so a page, its loader and its nav entry can
 * never drift apart.
 */
export const CATALOG_PAGE_KEYS = [
  "products",
  "categories",
  "collections",
  "brands",
] as const;
export type CatalogPageKey = (typeof CATALOG_PAGE_KEYS)[number];

/**
 * Orders and Fulfillment are top-level destinations that render their own
 * workspace inside the shell, the same way the Catalog children do.
 */
export const ORDERS_SECTION_KEYS = ["orders", "fulfillment"] as const;
export type OrdersSectionKey = (typeof ORDERS_SECTION_KEYS)[number];

/** Staff & Permissions and Reports, which render their own workspace. */
export const STAFF_SECTION_KEYS = ["staff-permissions", "reports"] as const;
export type StaffSectionKey = (typeof STAFF_SECTION_KEYS)[number];

/** Promotions and Reviews, which render their own workspace in the shell. */
export const PROMOTIONS_SECTION_KEYS = ["promotions", "reviews"] as const;
export type PromotionsSectionKey = (typeof PROMOTIONS_SECTION_KEYS)[number];

/**
 * Merchant Profile and Settings. They live here rather than beside their screen
 * so `merchant-navigation` stays a pure module — importing a key from a `.tsx`
 * would drag the icon set into every test that only wants to resolve a route.
 */
export const PROFILE_SECTION_KEYS = ["merchant-profile", "settings"] as const;
export type ProfileSectionKey = (typeof PROFILE_SECTION_KEYS)[number];

/**
 * The catalog API models a brand, category or collection as active or not —
 * there is no draft or archived state for them — so the record vocabulary
 * matches what the endpoints can actually report.
 */
export const CATALOG_RECORD_STATUSES = ["Active", "Inactive"] as const;
export type CatalogRecordStatus = (typeof CATALOG_RECORD_STATUSES)[number];

/**
 * A category, collection or brand. All three carry the same fields, so the three
 * pages share one row component and differ only in their labels and the tone
 * they give a status. `productCount` is reported by the record rather than
 * counted at render time, because a page must still show a true count when the
 * products region of the catalog fails to load.
 */
export type CatalogTaxonomyRecord = {
  handle: string;
  key: string;
  name: string;
  /**
   * Optional because the API only reports it for collections, which return
   * `productIds`. The brand and category endpoints return no count, and the
   * page shows an em dash rather than inventing one.
   */
  productCount?: number;
  status: CatalogRecordStatus;
  /** ISO date, or empty when the endpoint does not report one. */
  updatedAt: string;
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
