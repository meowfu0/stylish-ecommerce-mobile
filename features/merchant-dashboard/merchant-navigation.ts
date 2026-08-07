import type { Href } from "expo-router";

import type { DashboardIconName } from "@/features/merchant-dashboard/dashboard-primitives";
import type { Permission } from "@/features/merchant-dashboard/dashboard-types";

export type MerchantNavigationChild = {
  badge?: number;
  key: string;
  label: string;
  route: Href;
};

export type MerchantNavigationItem = {
  badge?: number;
  children?: MerchantNavigationChild[];
  icon: DashboardIconName;
  key: string;
  label: string;
  permission?: Permission;
  route: Href;
};

function dashboardRoute(section: string): Href {
  return `/merchant/dashboard?section=${section}` as Href;
}

export const merchantNavigationItems: MerchantNavigationItem[] = [
  {
    icon: "view-dashboard-outline",
    key: "overview",
    label: "Overview",
    route: dashboardRoute("overview"),
  },
  {
    children: [
      {
        badge: 7,
        key: "products",
        label: "Products",
        route: dashboardRoute("products"),
      },
      {
        key: "categories",
        label: "Categories",
        route: dashboardRoute("categories"),
      },
      {
        key: "collections",
        label: "Collections",
        route: dashboardRoute("collections"),
      },
      {
        key: "brands",
        label: "Brands",
        route: dashboardRoute("brands"),
      },
    ],
    icon: "archive-outline",
    key: "catalog",
    label: "Catalog",
    permission: "products.read",
    route: dashboardRoute("catalog"),
  },
  {
    children: [
      {
        key: "stock-levels",
        label: "Stock Levels",
        route: dashboardRoute("stock-levels"),
      },
      {
        key: "locations",
        label: "Locations",
        route: dashboardRoute("locations"),
      },
      {
        key: "movements",
        label: "Movements",
        route: dashboardRoute("movements"),
      },
      {
        badge: 12,
        key: "low-stock",
        label: "Low Stock",
        route: dashboardRoute("low-stock"),
      },
    ],
    icon: "cube-outline",
    key: "inventory",
    label: "Inventory",
    permission: "inventory.read",
    route: dashboardRoute("inventory"),
  },
  {
    badge: 18,
    icon: "clipboard-text-outline",
    key: "orders",
    label: "Orders",
    permission: "orders.read",
    route: dashboardRoute("orders"),
  },
  {
    badge: 9,
    icon: "truck-delivery-outline",
    key: "fulfillment",
    label: "Fulfillment",
    permission: "orders.fulfill",
    route: dashboardRoute("fulfillment"),
  },
  {
    icon: "ticket-percent-outline",
    key: "promotions",
    label: "Promotions",
    permission: "promotions.manage",
    route: dashboardRoute("promotions"),
  },
  {
    badge: 4,
    icon: "message-star-outline",
    key: "reviews",
    label: "Reviews",
    permission: "reviews.moderate",
    route: dashboardRoute("reviews"),
  },
  {
    icon: "account-group-outline",
    key: "staff-permissions",
    label: "Staff & Permissions",
    permission: "staff.manage",
    route: dashboardRoute("staff-permissions"),
  },
  {
    icon: "chart-line",
    key: "reports",
    label: "Reports",
    permission: "reports.read",
    route: dashboardRoute("reports"),
  },
  {
    icon: "shield-account-outline",
    key: "merchant-profile",
    label: "Merchant Profile",
    permission: "merchant.profile.update",
    route: dashboardRoute("merchant-profile"),
  },
  {
    icon: "cog-outline",
    key: "settings",
    label: "Settings",
    permission: "settings.manage",
    route: dashboardRoute("settings"),
  },
];

export type MerchantNavigationTarget = {
  label: string;
  permission?: Permission;
  route: Href;
};

export function findMerchantNavigationTarget(
  section: string | undefined,
): MerchantNavigationTarget {
  const normalized = section?.trim().toLowerCase() || "overview";

  for (const item of merchantNavigationItems) {
    if (item.key === normalized) return item;
    const child = item.children?.find((candidate) => {
      return candidate.key === normalized;
    });
    if (child) {
      return { ...child, permission: item.permission };
    }
  }

  return merchantNavigationItems[0];
}

export function visibleMerchantNavigationItems(
  permissions: readonly Permission[],
): MerchantNavigationItem[] {
  return merchantNavigationItems.filter((item) => {
    return !item.permission || permissions.includes(item.permission);
  });
}
