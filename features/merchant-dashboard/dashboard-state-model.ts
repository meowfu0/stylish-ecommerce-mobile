import type {
  DashboardDataState,
  DashboardState,
  MerchantSession,
  Permission,
} from "@/features/merchant-dashboard/dashboard-types";

export type DashboardStateInput = {
  authReason?: "session-expired" | null;
  authStatus: "authenticated" | "restoring" | "unauthenticated";
  dataState: DashboardDataState;
  previewState?: DashboardState;
  requiredPermission?: Permission;
  /** False for account and profile sections, which survive an inactive store. */
  requiresActiveStore?: boolean;
  session: MerchantSession;
};

export function resolveDashboardState({
  authReason,
  authStatus,
  dataState,
  previewState,
  requiredPermission,
  requiresActiveStore = true,
  session,
}: DashboardStateInput): DashboardState {
  if (previewState) return previewState;

  if (authStatus === "restoring") return "loading";
  if (authStatus !== "authenticated" || authReason === "session-expired") {
    return "session-expired";
  }
  if (requiresActiveStore && session.storeStatus !== "active") {
    return "inactive";
  }
  if (requiredPermission && !session.permissions.includes(requiredPermission)) {
    return "permission-denied";
  }

  return dataState;
}

export type DashboardDataStateInput = {
  failedSectionCount: number;
  hasCatalog: boolean;
  /** True once a usable snapshot exists, which turns a reload into a refresh. */
  hasSnapshot: boolean;
  loading: boolean;
  sectionCount: number;
};

/**
 * The single place that turns load results into a data state. A reload with a
 * snapshot already on screen refreshes rather than re-skeletons, and a total
 * failure only becomes a service error when there is nothing left to show.
 */
export function resolveDashboardDataState({
  failedSectionCount,
  hasCatalog,
  hasSnapshot,
  loading,
  sectionCount,
}: DashboardDataStateInput): DashboardDataState {
  if (loading) return hasSnapshot ? "refreshing" : "loading";
  if (failedSectionCount >= sectionCount) return hasSnapshot ? "partial" : "error";
  if (failedSectionCount > 0) return "partial";
  if (!hasCatalog) return "empty";
  return "ready";
}

/**
 * Selling stops when the store is not active, but the merchant keeps the
 * account and profile surfaces needed to resolve the suspension.
 */
export function isSellingEnabled(session: MerchantSession) {
  return session.storeStatus === "active";
}

export function normalizeMerchantStoreStatus(
  value: string | undefined,
): MerchantSession["storeStatus"] {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "inactive" || normalized === "suspended") {
    return normalized;
  }
  return "active";
}
