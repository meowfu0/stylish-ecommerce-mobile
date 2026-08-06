import type { DashboardIconName } from "@/features/merchant-dashboard/dashboard-primitives";
import type { Permission } from "@/features/merchant-dashboard/dashboard-types";

export type MerchantNavigationChild = {
  badge?: number;
  label: string;
};

export type MerchantNavigationItem = {
  badge?: number;
  children?: MerchantNavigationChild[];
  icon: DashboardIconName;
  label: string;
  permission?: Permission;
};

export const merchantNavigationItems: MerchantNavigationItem[] = [
  { icon: "view-dashboard-outline", label: "Overview" },
  {
    children: [
      { badge: 7, label: "Products" },
      { label: "Categories" },
      { label: "Collections" },
      { label: "Brands" },
    ],
    icon: "archive-outline",
    label: "Catalog",
    permission: "products.read",
  },
  {
    children: [
      { label: "Stock Levels" },
      { label: "Locations" },
      { label: "Movements" },
      { badge: 12, label: "Low Stock" },
    ],
    icon: "cube-outline",
    label: "Inventory",
    permission: "inventory.read",
  },
  {
    badge: 18,
    icon: "clipboard-text-outline",
    label: "Orders",
    permission: "orders.read",
  },
  {
    badge: 9,
    icon: "truck-delivery-outline",
    label: "Fulfillment",
    permission: "orders.fulfill",
  },
  {
    icon: "ticket-percent-outline",
    label: "Promotions",
    permission: "promotions.manage",
  },
  {
    badge: 4,
    icon: "message-star-outline",
    label: "Reviews",
    permission: "reviews.moderate",
  },
  {
    icon: "account-group-outline",
    label: "Staff & Permissions",
    permission: "staff.manage",
  },
  {
    icon: "chart-line",
    label: "Reports",
    permission: "reports.read",
  },
  {
    icon: "shield-account-outline",
    label: "Merchant Profile",
    permission: "merchant.profile.update",
  },
  {
    icon: "cog-outline",
    label: "Settings",
    permission: "settings.manage",
  },
];
