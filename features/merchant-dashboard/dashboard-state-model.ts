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
  session: MerchantSession;
};

export function resolveDashboardState({
  authReason,
  authStatus,
  dataState,
  previewState,
  requiredPermission,
  session,
}: DashboardStateInput): DashboardState {
  if (previewState) return previewState;

  if (authStatus === "restoring") return "loading";
  if (authStatus !== "authenticated" || authReason === "session-expired") {
    return "session-expired";
  }
  if (session.storeStatus !== "active") return "inactive";
  if (requiredPermission && !session.permissions.includes(requiredPermission)) {
    return "permission-denied";
  }

  return dataState;
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
