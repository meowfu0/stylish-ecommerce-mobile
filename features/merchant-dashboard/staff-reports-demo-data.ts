import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import type {
  InventorySummary,
  MerchantRole,
  Metric,
  Permission,
  ProductRow,
  SalesSeries,
} from "@/features/merchant-dashboard/dashboard-types";

/**
 * Demo data for the Staff & Permissions and Reports workspaces.
 *
 * This is the only place either page gets its rows from, and it exists purely so
 * the screens can be visualised before those APIs land. The loaders below have
 * the signatures real ones would, so swapping them for `apiRequest` later is a
 * one-file change and no component has to be redesigned.
 *
 * Permissions are never invented here: a member's set is always
 * `rolePermissions[role]`, the same map the sidebar, the dashboard states and
 * every gated button already use.
 */

export const STAFF_STATUSES = ["Active", "Pending", "Inactive"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export type StaffMember = {
  email: string;
  id: string;
  /** ISO date the invitation was sent; the same as joining for an active member. */
  invitedAt: string;
  /** ISO date, or null for someone who has never signed in. */
  lastActiveAt: string | null;
  name: string;
  role: MerchantRole;
  status: StaffStatus;
};

/** A member's permissions always come from their role — never a stored copy. */
export function permissionsFor(member: StaffMember): Permission[] {
  return rolePermissions[member.role];
}

export const demoStaff: StaffMember[] = [
  {
    email: "vinceee@postmanfashion.ph",
    id: "staff-01",
    invitedAt: "2025-11-02",
    lastActiveAt: "2026-08-08",
    name: "vinceee",
    role: "Merchant Owner",
    status: "Active",
  },
  {
    email: "althea.cruz@postmanfashion.ph",
    id: "staff-02",
    invitedAt: "2026-01-14",
    lastActiveAt: "2026-08-08",
    name: "Althea Cruz",
    role: "Merchant Administrator",
    status: "Active",
  },
  {
    email: "rafael.mendoza@postmanfashion.ph",
    id: "staff-03",
    invitedAt: "2026-02-03",
    lastActiveAt: "2026-08-07",
    name: "Rafael Mendoza",
    role: "Manager",
    status: "Active",
  },
  {
    email: "bea.villanueva@postmanfashion.ph",
    id: "staff-04",
    invitedAt: "2026-03-19",
    lastActiveAt: "2026-08-06",
    name: "Bea Villanueva",
    role: "Catalog Staff",
    status: "Active",
  },
  {
    email: "miguel.torres@postmanfashion.ph",
    id: "staff-05",
    invitedAt: "2026-04-08",
    lastActiveAt: "2026-08-05",
    name: "Miguel Torres",
    role: "Inventory Staff",
    status: "Active",
  },
  {
    email: "kristine.lim@postmanfashion.ph",
    id: "staff-06",
    invitedAt: "2026-04-22",
    lastActiveAt: "2026-08-08",
    name: "Kristine Lim",
    role: "Fulfillment Staff",
    status: "Active",
  },
  {
    email: "paolo.aquino@postmanfashion.ph",
    id: "staff-07",
    invitedAt: "2026-05-11",
    lastActiveAt: "2026-07-18",
    name: "Paolo Aquino",
    role: "Support Staff",
    status: "Inactive",
  },
  {
    email: "danica.ocampo@postmanfashion.ph",
    id: "staff-08",
    invitedAt: "2026-08-06",
    lastActiveAt: null,
    name: "Danica Ocampo",
    role: "Catalog Staff",
    status: "Pending",
  },
  {
    email: "enrico.bautista@postmanfashion.ph",
    id: "staff-09",
    invitedAt: "2026-08-04",
    lastActiveAt: null,
    name: "Enrico Bautista",
    role: "Fulfillment Staff",
    status: "Pending",
  },
  {
    email: "sofia.ramos@postmanfashion.ph",
    id: "staff-10",
    invitedAt: "2026-06-02",
    lastActiveAt: "2026-06-29",
    name: "Sofia Ramos",
    role: "Inventory Staff",
    status: "Inactive",
  },
];

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export const REPORT_LOCATIONS = [
  "Makati Warehouse",
  "Cebu Hub",
  "Davao Pop-up",
] as const;

/** Money is centavos throughout, matching every other figure on the dashboard. */
export const demoReportMetrics: Metric[] = [
  {
    changePercent: 12.4,
    comparison: "₱432,640 vs previous period",
    key: "gross-sales",
    label: "Gross sales",
    sparkline: [42, 48, 45, 53, 58, 55, 64],
    value: "₱486,320",
    valueCentavos: 48_632_000,
  },
  {
    changePercent: 8.1,
    comparison: "1,142 vs previous period",
    key: "orders",
    label: "Orders",
    sparkline: [104, 118, 112, 126, 131, 128, 142],
    value: "1,234",
  },
  {
    changePercent: 9.6,
    comparison: "₱386,110 vs previous period",
    key: "net-earnings",
    label: "Net earnings",
    sparkline: [36, 40, 38, 44, 47, 45, 52],
    value: "₱423,180",
    valueCentavos: 42_318_000,
  },
  {
    changePercent: -2.3,
    comparison: "₱403 vs previous period",
    key: "average-order",
    label: "Average order value",
    sparkline: [41, 40, 42, 39, 40, 38, 39],
    value: "₱394",
    valueCentavos: 39_400,
  },
];

export const demoReportSeries: SalesSeries = {
  daily: [
    { label: "Mon", orders: 148, refunds: 182_000, revenue: 5_820_000 },
    { label: "Tue", orders: 162, refunds: 96_000, revenue: 6_410_000 },
    { label: "Wed", orders: 155, refunds: 240_000, revenue: 6_090_000 },
    { label: "Thu", orders: 178, refunds: 128_000, revenue: 7_040_000 },
    { label: "Fri", orders: 196, refunds: 310_000, revenue: 7_880_000 },
    { label: "Sat", orders: 211, refunds: 154_000, revenue: 8_460_000 },
    { label: "Sun", orders: 184, refunds: 205_000, revenue: 7_290_000 },
  ],
  weekly: [
    { label: "W1", orders: 1_042, refunds: 1_180_000, revenue: 41_200_000 },
    { label: "W2", orders: 1_128, refunds: 940_000, revenue: 44_600_000 },
    { label: "W3", orders: 1_074, refunds: 1_420_000, revenue: 42_100_000 },
    { label: "W4", orders: 1_234, refunds: 1_060_000, revenue: 48_632_000 },
  ],
  monthly: [
    { label: "Mar", orders: 4_188, refunds: 2_870_000, revenue: 164_900_000 },
    { label: "Apr", orders: 4_095, refunds: 3_410_000, revenue: 161_300_000 },
    { label: "May", orders: 4_264, refunds: 3_050_000, revenue: 178_600_000 },
    { label: "Jun", orders: 4_211, refunds: 3_620_000, revenue: 169_450_000 },
    { label: "Jul", orders: 4_355, refunds: 3_510_000, revenue: 182_780_000 },
    { label: "Aug", orders: 4_612, refunds: 3_180_000, revenue: 194_320_000 },
  ],
};

const productImages = {
  blouse: require("@/assets/images/storefront/dahlia-ruffle-top.jpg"),
  cardigan: require("@/assets/images/storefront/lena-flower-knit.jpg"),
  dress: require("@/assets/images/storefront/rosebud-midi-dress.jpg"),
  skirt: require("@/assets/images/storefront/amour-slip-skirt.jpg"),
  tote: require("@/assets/images/storefront/petal-shoulder-bag.jpg"),
} as const;

/** Reuses the dashboard's own `ProductRow` shape, so Top Products renders it. */
export const demoReportProducts: ProductRow[] = [
  {
    image: productImages.dress,
    name: "Amihan Linen Wrap Dress",
    revenueCentavos: 8_947_200,
    sku: "LUM-DRS-016",
    stockStatus: "In stock",
    trendPercent: 18.4,
    units: 128,
  },
  {
    image: productImages.blouse,
    name: "Sampaguita Silk Blouse",
    revenueCentavos: 5_568_000,
    sku: "LUM-TOP-071",
    stockStatus: "Low stock",
    trendPercent: 9.2,
    units: 96,
  },
  {
    image: productImages.tote,
    name: "Habi Weave Tote",
    revenueCentavos: 4_218_000,
    sku: "LUM-BAG-032",
    stockStatus: "In stock",
    trendPercent: 4.6,
    units: 74,
  },
  {
    image: productImages.cardigan,
    name: "Baybayin Knit Cardigan",
    revenueCentavos: 3_843_000,
    sku: "LUM-KNT-008",
    stockStatus: "Out of stock",
    trendPercent: -6.1,
    units: 61,
  },
  {
    image: productImages.skirt,
    name: "Tala Slip Skirt",
    revenueCentavos: 2_704_000,
    sku: "LUM-SKT-045",
    stockStatus: "In stock",
    trendPercent: 2.1,
    units: 52,
  },
];

export const demoReportInventory: InventorySummary = {
  inStock: 431,
  lowStock: 12,
  outOfStock: 3,
  totalActiveVariants: 486,
};

export type OrderReport = {
  averageFulfillmentHours: number;
  cancelled: number;
  fulfilled: number;
  statuses: { count: number; label: string }[];
  total: number;
};

export const demoOrderReport: OrderReport = {
  averageFulfillmentHours: 19.4,
  cancelled: 38,
  fulfilled: 1_112,
  statuses: [
    { count: 46, label: "New" },
    { count: 62, label: "Confirmed" },
    { count: 78, label: "Processing" },
    { count: 34, label: "Ready to Ship" },
    { count: 108, label: "Shipped" },
    { count: 868, label: "Delivered" },
    { count: 38, label: "Cancelled" },
  ],
  total: 1_234,
};

export type StaffWorkspaceSnapshot = { staff: StaffMember[] };
export type ReportsWorkspaceSnapshot = {
  inventory: InventorySummary;
  metrics: Metric[];
  orders: OrderReport;
  products: ProductRow[];
  series: SalesSeries;
};

export async function loadStaffWorkspace(): Promise<StaffWorkspaceSnapshot> {
  return { staff: demoStaff };
}

export async function loadReportsWorkspace(): Promise<ReportsWorkspaceSnapshot> {
  return {
    inventory: demoReportInventory,
    metrics: demoReportMetrics,
    orders: demoOrderReport,
    products: demoReportProducts,
    series: demoReportSeries,
  };
}
