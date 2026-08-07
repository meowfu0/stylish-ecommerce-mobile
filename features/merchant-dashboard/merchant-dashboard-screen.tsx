import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants/design-tokens";
import {
  normalizeMerchantRole,
  resolveMerchantPermissions,
} from "@/features/merchant-dashboard/dashboard-access";
import { DashboardOverviewContent } from "@/features/merchant-dashboard/dashboard-overview-content";
import {
  normalizeMerchantStoreStatus,
  resolveDashboardState,
} from "@/features/merchant-dashboard/dashboard-state-model";
import type {
  DashboardState,
  DateRange,
  MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";
import { DASHBOARD_STATES } from "@/features/merchant-dashboard/dashboard-types";
import { MerchantHeader } from "@/features/merchant-dashboard/merchant-header";
import { findMerchantNavigationTarget } from "@/features/merchant-dashboard/merchant-navigation";
import { MerchantSidebar } from "@/features/merchant-dashboard/merchant-sidebar";
import { NotificationDrawer } from "@/features/merchant-dashboard/notification-drawer";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { useAuthWorkspaceStore } from "@/stores/auth-workspace-store";

function parsePreviewState(
  value: string | string[] | undefined,
): DashboardState | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return undefined;
  if (candidate === "degraded") return "refreshing";
  if (candidate === "suspended") return "inactive";
  return DASHBOARD_STATES.includes(candidate as DashboardState)
    ? (candidate as DashboardState)
    : undefined;
}

export function MerchantDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    previewState?: string;
    section?: string;
  }>();
  const { height, width } = useWindowDimensions();
  const authUser = useAuthSessionStore((state) => state.user);
  const authReason = useAuthSessionStore((state) => state.reason);
  const authStatus = useAuthSessionStore((state) => state.status);
  const workspace = useAuthWorkspaceStore((state) => state.selectedWorkspace);
  const previewState =
    process.env.NODE_ENV === "production"
      ? undefined
      : parsePreviewState(params.previewState);
  const navigationTarget = findMerchantNavigationTarget(
    Array.isArray(params.section) ? params.section[0] : params.section,
  );
  const mobileNavigation = width < 1024;
  const mobileContent = width <= 768;
  const dockNotifications = Platform.OS === "web" && width >= 1536;
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [rail, setRail] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (mobileNavigation) setRail(false);
  }, [mobileNavigation]);

  useEffect(() => {
    if (authStatus === "unauthenticated" && authReason === "session-expired") {
      router.replace("/sign-in?reason=session-expired");
      return;
    }
    if (!workspace || workspace.kind !== "merchant") {
      router.replace("/auth/choose-workspace");
    }
  }, [authReason, authStatus, router, workspace]);

  const session = useMemo<MerchantSession | null>(() => {
    if (!workspace || workspace.kind !== "merchant") return null;
    const resolvedRole = normalizeMerchantRole(
      workspace.merchantRoleKeys?.[0] ?? workspace.roleLabel,
    );
    const role = resolvedRole ?? "Support Staff";
    const merchantName = workspace.title.replace(/^Manage\s+/i, "");
    const displayName =
      authUser?.profile?.displayName?.trim() ||
      authUser?.profile?.firstName?.trim() ||
      "Owner";
    return {
      defaultLocation:
        workspace.defaultLocation || `${merchantName} Main Location`,
      displayName,
      email: authUser?.email ?? "",
      merchantHandle: workspace.key,
      merchantName,
      permissions: resolveMerchantPermissions(
        workspace.permissions,
        resolvedRole,
      ),
      role,
      storeStatus: normalizeMerchantStoreStatus(workspace.merchantStatus),
      verified: workspace.verified ?? true,
    };
  }, [authUser, workspace]);

  if (!session) return <View style={styles.page} />;

  const state = resolveDashboardState({
    authReason: authReason === "session-expired" ? authReason : null,
    authStatus,
    dataState: "ready",
    previewState,
    requiredPermission: navigationTarget.permission,
    session,
  });
  const contentPadding = mobileContent ? spacing.md : spacing.lg;
  const mainAvailableWidth =
    width -
    (mobileNavigation ? 0 : rail ? 84 : 272) -
    (dockNotifications ? 320 : 0);
  const compactMetrics = mainAvailableWidth - contentPadding * 2 < 1100;
  const paired = mainAvailableWidth >= 820;
  const unreadCount = 3;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
      <View style={[styles.shell, { minHeight: height }]}>
        {!mobileNavigation ? (
          <View
            style={[styles.desktopSidebar, rail && styles.desktopSidebarRail]}
          >
            <MerchantSidebar
              activeItemLabel={navigationTarget.label}
              onToggleRail={() => setRail((current) => !current)}
              rail={rail}
              session={session}
            />
          </View>
        ) : null}

        <View style={styles.mainColumn}>
          <MerchantHeader
            dateRange={dateRange}
            notificationCount={unreadCount}
            onDateRangeChange={setDateRange}
            onOpenNavigation={() => setDrawerOpen(true)}
            onOpenNotifications={() => setNotificationOpen(true)}
            session={session}
          />

          <ScrollView
            bounces={false}
            className="st-scroll"
            contentContainerStyle={[
              styles.contentContainer,
              { padding: contentPadding },
            ]}
            key={retryKey}
            style={styles.mainScroll}
          >
            <View style={styles.contentColumn}>
              <DashboardOverviewContent
                compactOrders={mobileNavigation}
                compactMetrics={compactMetrics}
                mobile={mobileContent}
                deniedSection={navigationTarget.label}
                onCreateProduct={() =>
                  router.push("/merchant/dashboard?section=products")
                }
                onImportCatalog={() =>
                  router.push("/merchant/dashboard?section=catalog")
                }
                onRetry={() => setRetryKey((current) => current + 1)}
                onReturnToOverview={() =>
                  router.replace("/merchant/dashboard?section=overview")
                }
                onReviewMerchantProfile={() =>
                  router.push("/merchant/dashboard?section=merchant-profile")
                }
                paired={paired}
                requiredPermission={navigationTarget.permission}
                session={session}
                state={state}
              />
            </View>
          </ScrollView>
        </View>

        {dockNotifications ? (
          <NotificationDrawer docked session={session} />
        ) : null}

        {mobileNavigation && drawerOpen ? (
          <View style={styles.overlayLayer}>
            <Pressable
              accessibilityLabel="Close navigation"
              accessibilityRole="button"
              onPress={() => setDrawerOpen(false)}
              style={styles.overlayBackdrop}
            />
            <View style={styles.mobileSidebar}>
              <MerchantSidebar
                activeItemLabel={navigationTarget.label}
                onClose={() => setDrawerOpen(false)}
                onToggleRail={() => undefined}
                rail={false}
                session={session}
              />
            </View>
          </View>
        ) : null}

        {!dockNotifications && notificationOpen ? (
          <View style={styles.overlayLayer}>
            <Pressable
              accessibilityLabel="Close notifications"
              accessibilityRole="button"
              onPress={() => setNotificationOpen(false)}
              style={styles.overlayBackdrop}
            />
            <NotificationDrawer
              docked={false}
              onClose={() => setNotificationOpen(false)}
              session={session}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contentColumn: {
    alignSelf: "center",
    gap: 20,
    maxWidth: 1240,
    width: "100%",
  },
  contentContainer: { flexGrow: 1, paddingBottom: spacing.xxl },
  desktopSidebar: { flexShrink: 0, width: 272 },
  desktopSidebarRail: { width: 84 },
  mainColumn: { flex: 1, minWidth: 0 },
  mainScroll: { backgroundColor: colors.neutral[50], flex: 1 },
  mobileSidebar: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 272,
  },
  overlayBackdrop: { backgroundColor: "rgba(17,24,28,0.32)", flex: 1 },
  overlayLayer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 100,
  },
  page: { backgroundColor: colors.neutral[50], flex: 1 },
  shell: { flex: 1, flexDirection: "row", minWidth: 0, overflow: "hidden" },
});
