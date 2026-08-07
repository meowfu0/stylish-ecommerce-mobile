import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
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
import { DashboardLoadingState } from "@/features/merchant-dashboard/dashboard-states";
import type {
  DashboardState,
  DateRange,
  MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";
import { DASHBOARD_STATES } from "@/features/merchant-dashboard/dashboard-types";
import { MerchantHeader } from "@/features/merchant-dashboard/merchant-header";
import {
  findMerchantNavigationTarget,
  navigationRequiresActiveStore,
} from "@/features/merchant-dashboard/merchant-navigation";
import {
  MERCHANT_SIDEBAR_RAIL_WIDTH,
  MERCHANT_SIDEBAR_WIDTH,
  MerchantSidebar,
} from "@/features/merchant-dashboard/merchant-sidebar";
import { useReducedMotion } from "@/features/merchant-dashboard/use-reduced-motion";
import { NotificationDrawer } from "@/features/merchant-dashboard/notification-drawer";
import { useMerchantDashboardData } from "@/features/merchant-dashboard/use-merchant-dashboard-data";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { useAuthWorkspaceStore } from "@/stores/auth-workspace-store";

function contactSupport() {
  Alert.alert(
    "Contact Velori partner support",
    "The Velori partner team will be connected here when backend support services are available.",
  );
}

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
  const reducedMotion = useReducedMotion();
  const sidebarWidth = useRef(
    new Animated.Value(rail ? MERCHANT_SIDEBAR_RAIL_WIDTH : MERCHANT_SIDEBAR_WIDTH),
  ).current;

  useEffect(() => {
    if (mobileNavigation) setRail(false);
  }, [mobileNavigation]);

  useEffect(() => {
    const target = rail ? MERCHANT_SIDEBAR_RAIL_WIDTH : MERCHANT_SIDEBAR_WIDTH;
    if (reducedMotion) {
      sidebarWidth.setValue(target);
      return;
    }
    // Width has to be laid out every frame, so this stays off the native
    // driver; the main column is flex-sized and reflows with it, which is what
    // makes the dashboard beside the sidebar settle instead of jumping.
    const animation = Animated.timing(sidebarWidth, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      toValue: target,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [rail, reducedMotion, sidebarWidth]);

  useEffect(() => {
    // Restoring is still a valid session, and clearing an expired one empties
    // the workspace first; navigating on either would bounce the merchant to
    // workspace selection instead of the sign-in screen that explains why.
    if (authStatus === "restoring") return;
    if (authStatus === "unauthenticated") {
      router.replace(
        authReason === "session-expired"
          ? "/sign-in?reason=session-expired"
          : "/sign-in",
      );
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

  const requiresActiveStore = navigationRequiresActiveStore(navigationTarget);
  const blockedBeforeData =
    !session ||
    authStatus !== "authenticated" ||
    authReason === "session-expired" ||
    (requiresActiveStore && session.storeStatus !== "active") ||
    (navigationTarget.permission !== undefined &&
      !session.permissions.includes(navigationTarget.permission));

  // Nothing is requested while the session, store status, or role already
  // decides the state, so a blocked dashboard never retries failing calls.
  const dashboard = useMerchantDashboardData({ enabled: !blockedBeforeData });

  // No workspace yet: skeletons while the session is being restored, and a
  // quiet page while the redirect above is in flight.
  if (!session) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
        {authStatus === "restoring" ? (
          <ScrollView
            className="st-scroll"
            contentContainerStyle={[
              styles.contentContainer,
              { padding: mobileContent ? spacing.md : spacing.lg },
            ]}
            style={styles.mainScroll}
          >
            <View style={styles.contentColumn}>
              <DashboardLoadingState />
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    );
  }

  const state = resolveDashboardState({
    authReason: authReason === "session-expired" ? authReason : null,
    authStatus,
    dataState: dashboard.dataState,
    previewState,
    requiredPermission: navigationTarget.permission,
    requiresActiveStore,
    session,
  });
  const contentPadding = mobileContent ? spacing.md : spacing.lg;
  const mainAvailableWidth =
    width -
    (mobileNavigation
      ? 0
      : rail
        ? MERCHANT_SIDEBAR_RAIL_WIDTH
        : MERCHANT_SIDEBAR_WIDTH) -
    (dockNotifications ? 320 : 0);
  // Metric cards pick their own column count from their measured row width.
  const paired = mainAvailableWidth >= 820;
  const unreadCount = 3;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
      <View style={[styles.shell, { minHeight: height }]}>
        {!mobileNavigation ? (
          <Animated.View style={[styles.desktopSidebar, { width: sidebarWidth }]}>
            <MerchantSidebar
              activeItemLabel={navigationTarget.label}
              onToggleRail={() => setRail((current) => !current)}
              rail={rail}
              session={session}
            />
          </Animated.View>
        ) : null}

        <View style={styles.mainColumn}>
          <MerchantHeader
            dateRange={dateRange}
            notificationCount={unreadCount}
            onDateRangeChange={(range) => {
              setDateRange(range);
              // A new range needs new figures, and the current ones stay on
              // screen behind the refreshing notice while they arrive.
              dashboard.refresh();
            }}
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
            style={styles.mainScroll}
          >
            <View style={styles.contentColumn}>
              <DashboardOverviewContent
                compactOrders={mobileNavigation}
                failedSections={dashboard.failedSections}
                hasSalesHistory={dashboard.hasSalesHistory}
                metrics={dashboard.metrics}
                mobile={mobileContent}
                deniedSection={navigationTarget.label}
                onContactSupport={contactSupport}
                onCreateProduct={() =>
                  router.push("/merchant/dashboard?section=products")
                }
                onImportCatalog={() =>
                  router.push("/merchant/dashboard?section=catalog")
                }
                onRetry={dashboard.retry}
                onReturnToOverview={() =>
                  router.replace("/merchant/dashboard?section=overview")
                }
                onReviewMerchantProfile={() =>
                  router.push("/merchant/dashboard?section=merchant-profile")
                }
                onViewAllOrders={() =>
                  router.push("/merchant/dashboard?section=orders")
                }
                paired={paired}
                pipelineStages={dashboard.pipelineStages}
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
  // Width is supplied by the collapse animation, and the sidebar clips its own
  // content while that width changes.
  desktopSidebar: { flexShrink: 0, overflow: "hidden" },
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
