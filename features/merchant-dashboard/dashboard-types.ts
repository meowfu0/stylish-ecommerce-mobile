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
export type ChartCadence = "daily" | "weekly" | "monthly";

export type Metric = {
  changePercent: number;
  comparison: string;
  key: string;
  label: string;
  sparkline: number[];
  value: string;
  valueCentavos?: number;
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

export type RecentOrder = {
  customer: string;
  date: string;
  fulfillment: "Delivered" | "Packing" | "Shipped" | "Unfulfilled";
  items: number;
  orderNumber: string;
  payment: "Paid" | "Pending" | "Refunded";
  status: "Cancelled" | "Delivered" | "New" | "Processing" | "Shipped";
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
