import type { Href } from "expo-router";

import type { DashboardIconName } from "@/features/merchant-dashboard/dashboard-primitives";
import type {
  CatalogPageKey,
  MerchantSession,
  OrdersSectionKey,
  Permission,
  ProfileSectionKey,
  PromotionsSectionKey,
  StaffSectionKey,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  CATALOG_PAGE_KEYS,
  ORDERS_SECTION_KEYS,
  PROFILE_SECTION_KEYS,
  PROMOTIONS_SECTION_KEYS,
  STAFF_SECTION_KEYS,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  INVENTORY_PAGE_KEYS,
  type InventoryPageKey,
} from "@/features/merchant-dashboard/inventory-data-source";

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
  /**
   * False for account and profile destinations, which stay reachable while a
   * merchant is inactive. Everything else needs an active selling account.
   */
  requiresActiveStore?: boolean;
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
        // The count is supplied by the dashboard from real inventory data, so
        // nothing here claims a figure the database has not reported.
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
    // Counts come from the workspace data, not from this model.
    icon: "clipboard-text-outline",
    key: "orders",
    label: "Orders",
    permission: "orders.read",
    route: dashboardRoute("orders"),
  },
  {
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
    // The count is supplied by the Reviews workspace from its own data.
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
    requiresActiveStore: false,
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
    requiresActiveStore: false,
    route: dashboardRoute("merchant-profile"),
  },
  {
    icon: "cog-outline",
    key: "settings",
    label: "Settings",
    permission: "settings.manage",
    requiresActiveStore: false,
    route: dashboardRoute("settings"),
  },
];

export type MerchantNavigationTarget = {
  /** The `?section=` key this target resolved from. */
  key: string;
  label: string;
  permission?: Permission;
  requiresActiveStore?: boolean;
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
      return {
        ...child,
        permission: item.permission,
        requiresActiveStore: item.requiresActiveStore,
      };
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

/**
 * The Catalog child a section resolves to, or undefined for anything else. The
 * dashboard shell uses this to pick catalog content over the overview without
 * introducing a second source of truth for what Catalog contains.
 */
export function resolveCatalogSection(
  section: string | undefined,
): CatalogPageKey | undefined {
  const normalized = section?.trim().toLowerCase();
  return CATALOG_PAGE_KEYS.find((key) => key === normalized);
}

/**
 * The Inventory child a section resolves to, or undefined for anything else.
 * The dashboard shell uses this to pick inventory content over the overview
 * without introducing a second source of truth for what Inventory contains.
 */
export function resolveInventorySection(
  section: string | undefined,
): InventoryPageKey | undefined {
  const normalized = section?.trim().toLowerCase();
  return INVENTORY_PAGE_KEYS.find((key) => key === normalized);
}

/**
 * Orders and Fulfillment are top-level destinations that render their own
 * workspace inside the shell, the same way the Catalog and Inventory children do.
 */
export function resolveOrdersSection(
  section: string | undefined,
): OrdersSectionKey | undefined {
  const normalized = section?.trim().toLowerCase();
  return ORDERS_SECTION_KEYS.find((key) => key === normalized);
}

/** Staff & Permissions and Reports, resolved like the other workspaces. */
export function resolveStaffSection(
  section: string | undefined,
): StaffSectionKey | undefined {
  const normalized = section?.trim().toLowerCase();
  return STAFF_SECTION_KEYS.find((key) => key === normalized);
}

/** Merchant Profile and Settings, resolved the same way the others are. */
export function resolveProfileSection(
  section: string | undefined,
): ProfileSectionKey | undefined {
  const normalized = section?.trim().toLowerCase();
  return PROFILE_SECTION_KEYS.find((key) => key === normalized);
}

/** Promotions and Reviews, resolved the same way the other workspaces are. */
export function resolvePromotionsSection(
  section: string | undefined,
): PromotionsSectionKey | undefined {
  const normalized = section?.trim().toLowerCase();
  return PROMOTIONS_SECTION_KEYS.find((key) => key === normalized);
}

/**
 * The group a destination sits under, so the sidebar can keep that group open
 * while one of its children is the active page.
 */
export function findMerchantNavigationGroupLabel(
  activeItemLabel: string,
): string | undefined {
  return merchantNavigationItems.find((item) =>
    item.children?.some((child) => child.label === activeItemLabel),
  )?.label;
}

/** True when the destination needs a merchant that is cleared to sell. */
export function navigationRequiresActiveStore(
  target: Pick<MerchantNavigationTarget, "requiresActiveStore">,
) {
  return target.requiresActiveStore !== false;
}

export type MerchantNavigationAccess = {
  disabled: boolean;
  item: MerchantNavigationItem;
};

/**
 * Centralizes what the sidebar may offer: destinations the role cannot read
 * are hidden, and selling destinations are disabled while the merchant is
 * inactive so account and profile work stays reachable.
 */
export function resolveMerchantNavigationAccess(session: {
  permissions: readonly Permission[];
  storeStatus: MerchantSession["storeStatus"];
}): MerchantNavigationAccess[] {
  const sellingEnabled = session.storeStatus === "active";

  return visibleMerchantNavigationItems(session.permissions).map((item) => ({
    disabled:
      (Boolean(item.permission) &&
        !session.permissions.includes(item.permission as Permission)) ||
      (!sellingEnabled && navigationRequiresActiveStore(item)),
    item,
  }));
}
