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
  rolePermissions,
} from "@/features/merchant-dashboard/dashboard-access";
import {
  CatalogSummary,
  InventoryOverview,
  LowStockAlerts,
  RecentActivity,
  RecentOrders,
  TopProducts,
} from "@/features/merchant-dashboard/dashboard-commerce-sections";
import {
  ActionRequired,
  MetricsSection,
  OrderPipeline,
  SalesPerformance,
  WelcomeBanner,
} from "@/features/merchant-dashboard/dashboard-overview-sections";
import {
  DashboardBlockingState,
  DashboardStateBanner,
} from "@/features/merchant-dashboard/dashboard-states";
import type {
  DashboardState,
  DateRange,
  MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";
import { DASHBOARD_STATES } from "@/features/merchant-dashboard/dashboard-types";
import { MerchantHeader } from "@/features/merchant-dashboard/merchant-header";
import { MerchantSidebar } from "@/features/merchant-dashboard/merchant-sidebar";
import { NotificationDrawer } from "@/features/merchant-dashboard/notification-drawer";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { useAuthWorkspaceStore } from "@/stores/auth-workspace-store";

function parsePreviewState(
  value: string | string[] | undefined,
): DashboardState {
  const candidate = Array.isArray(value) ? value[0] : value;
  return DASHBOARD_STATES.includes(candidate as DashboardState)
    ? (candidate as DashboardState)
    : "ready";
}

export function MerchantDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ previewState?: string }>();
  const { height, width } = useWindowDimensions();
  const authUser = useAuthSessionStore((state) => state.user);
  const workspace = useAuthWorkspaceStore((state) => state.selectedWorkspace);
  const previewState = parsePreviewState(params.previewState);
  const mobileNavigation = width < 1024;
  const mobileContent = width < 768;
  const dockNotifications = Platform.OS === "web" && width >= 1536;
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [rail, setRail] = useState(width < 1400);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (mobileNavigation) setRail(false);
    else if (width < 1400) setRail(true);
  }, [mobileNavigation, width]);

  useEffect(() => {
    if (!workspace || workspace.kind !== "merchant") {
      router.replace("/auth/choose-workspace");
    }
  }, [router, workspace]);

  const session = useMemo<MerchantSession | null>(() => {
    if (!workspace || workspace.kind !== "merchant") return null;
    const role = normalizeMerchantRole(workspace.roleLabel);
    const merchantName = workspace.title.replace(/^Manage\s+/i, "");
    const displayName =
      authUser?.profile?.displayName?.trim() ||
      authUser?.profile?.firstName?.trim() ||
      "Owner";
    return {
      defaultLocation: `${merchantName} Makati Warehouse`,
      displayName,
      email: authUser?.email ?? "",
      merchantHandle: workspace.key,
      merchantName,
      permissions: rolePermissions[role],
      role,
      storeStatus: "active",
      verified: true,
    };
  }, [authUser, workspace]);

  if (!session) return <View style={styles.page} />;

  const state =
    session.storeStatus === "suspended" ? "suspended" : previewState;
  const renderOverview = ["ready", "partial", "degraded"].includes(state);
  const contentPadding = mobileContent ? spacing.md : spacing.lg;
  const mainAvailableWidth =
    width -
    (mobileNavigation ? 0 : rail ? 84 : 272) -
    (dockNotifications ? 320 : 0);
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
              <DashboardStateBanner state={state} />
              <DashboardBlockingState
                onRetry={() => setRetryKey((current) => current + 1)}
                state={state}
              />

              {renderOverview ? (
                <>
                  <WelcomeBanner mobile={mobileContent} session={session} />
                  <MetricsSection mobile={mobileContent} />
                  <View
                    style={[
                      styles.pairedGrid,
                      !paired && styles.pairedGridStacked,
                    ]}
                  >
                    <SalesPerformance empty={state === "partial"} />
                    <ActionRequired session={session} />
                  </View>
                  <OrderPipeline />
                  <View
                    style={[
                      styles.pairedGrid,
                      !paired && styles.pairedGridStacked,
                    ]}
                  >
                    <InventoryOverview session={session} />
                    <TopProducts />
                  </View>
                  <RecentOrders compact={mobileNavigation} />
                  <View
                    style={[
                      styles.pairedGrid,
                      !paired && styles.pairedGridStacked,
                    ]}
                  >
                    <CatalogSummary session={session} />
                    <LowStockAlerts session={session} />
                  </View>
                  <RecentActivity />
                </>
              ) : null}
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
  pairedGrid: { flexDirection: "row", gap: 20 },
  pairedGridStacked: { flexDirection: "column" },
  shell: { flex: 1, flexDirection: "row", minWidth: 0, overflow: "hidden" },
});
