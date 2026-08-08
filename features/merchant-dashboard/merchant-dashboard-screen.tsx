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
  CatalogLoadingState,
  CatalogPageContent,
} from "@/features/merchant-dashboard/catalog-page-content";
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
import {
  MerchantHeader,
  MerchantHeaderSkeleton,
} from "@/features/merchant-dashboard/merchant-header";
import {
  InventoryLoadingState,
  InventoryPageContent,
} from "@/features/merchant-dashboard/inventory-page-content";
import {
  OrdersLoadingState,
  OrdersPageContent,
} from "@/features/merchant-dashboard/orders-page-content";
import {
  PromotionsLoadingState,
  PromotionsPageContent,
} from "@/features/merchant-dashboard/promotions-page-content";
import {
  StaffLoadingState,
  StaffPageContent,
} from "@/features/merchant-dashboard/staff-page-content";
import {
  ProfileLoadingState,
  ProfilePageContent,
} from "@/features/merchant-dashboard/profile-page-content";
import {
  findMerchantNavigationTarget,
  navigationRequiresActiveStore,
  resolveCatalogSection,
  resolveInventorySection,
  resolveOrdersSection,
  resolveProfileSection,
  resolvePromotionsSection,
  resolveStaffSection,
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
  const workspaceStatus = useAuthWorkspaceStore((state) => state.status);
  const previewState =
    process.env.NODE_ENV === "production"
      ? undefined
      : parsePreviewState(params.previewState);
  const navigationTarget = findMerchantNavigationTarget(
    Array.isArray(params.section) ? params.section[0] : params.section,
  );
  // Non-undefined for Products, Categories, Collections and Brands, which render
  // catalog content inside this same shell rather than the overview.
  const catalogSection = resolveCatalogSection(navigationTarget.key);
  // Non-undefined for Stock Levels, Locations, Movements and Low Stock, which
  // render inventory content inside this same shell.
  const inventorySection = resolveInventorySection(navigationTarget.key);
  // Orders and Fulfillment render their own workspace in this same shell.
  const ordersSection = resolveOrdersSection(navigationTarget.key);
  const promotionsSection = resolvePromotionsSection(navigationTarget.key);
  const staffSection = resolveStaffSection(navigationTarget.key);
  // Merchant Profile and Settings render their own workspace in this same shell.
  const profileSection = resolveProfileSection(navigationTarget.key);
  const [reviewCount, setReviewCount] = useState<number | undefined>(undefined);
  const [orderCounts, setOrderCounts] = useState<{
    fulfillment: number;
    orders: number;
  } | null>(null);
  // Reported by the inventory pages once they load, so the sidebar's Low Stock
  // badge shows a real count instead of a number baked into the navigation.
  const [lowStockCount, setLowStockCount] = useState<number | undefined>(
    undefined,
  );
  const sidebarBadges = useMemo(
    () => ({
      fulfillment: orderCounts?.fulfillment,
      "low-stock": lowStockCount,
      orders: orderCounts?.orders,
      reviews: reviewCount,
    }),
    [lowStockCount, orderCounts, reviewCount],
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
    new Animated.Value(
      rail ? MERCHANT_SIDEBAR_RAIL_WIDTH : MERCHANT_SIDEBAR_WIDTH,
    ),
  ).current;
  // Softens the hand-off from the skeleton to the real sections.
  const contentFade = useRef(new Animated.Value(0)).current;

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
    // The stored workspace may still be loading on a refresh. Redirecting
    // before it lands is what used to throw the merchant back to the picker.
    if (workspaceStatus === "restoring") return;
    if (!workspace || workspace.kind !== "merchant") {
      router.replace("/auth/choose-workspace");
    }
  }, [authReason, authStatus, router, workspace, workspaceStatus]);

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
      merchantId: workspace.merchantId,
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

  useEffect(() => {
    // Runs once the session resolves, so the sections arrive as a fade rather
    // than a swap. Opacity only, and instant under reduce motion.
    if (!session) return;
    if (reducedMotion) {
      contentFade.setValue(1);
      return;
    }
    const animation = Animated.timing(contentFade, {
      duration: 220,
      easing: Easing.out(Easing.quad),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [contentFade, reducedMotion, session]);

  const requiresActiveStore = navigationRequiresActiveStore(navigationTarget);
  const blockedBeforeData =
    !session ||
    authStatus !== "authenticated" ||
    authReason === "session-expired" ||
    (requiresActiveStore && session.storeStatus !== "active") ||
    (navigationTarget.permission !== undefined &&
      !session.permissions.includes(navigationTarget.permission));

  // Nothing is requested while the session, store status, or role already
  // decides the state, so a blocked dashboard never retries failing calls. Only
  // the surface actually on screen loads: a merchant on Products never pays for
  // sales, orders and activity, and vice versa.
  const dashboard = useMerchantDashboardData({
    enabled:
      !blockedBeforeData &&
      catalogSection === undefined &&
      inventorySection === undefined &&
      ordersSection === undefined &&
      promotionsSection === undefined &&
      profileSection === undefined &&
      staffSection === undefined,
  });

  const mainAvailableWidth =
    width -
    (mobileNavigation
      ? 0
      : rail
        ? MERCHANT_SIDEBAR_RAIL_WIDTH
        : MERCHANT_SIDEBAR_WIDTH) -
    (dockNotifications ? 320 : 0);
  // Metric cards pick their own column count from their measured row width.
  // Computed before the restoring branch so the skeleton and the loaded
  // dashboard resolve the same two-column breakpoint and nothing shifts.
  const paired = mainAvailableWidth >= 820;

  // No workspace yet: skeletons while either the session or the remembered
  // workspace is still being restored, and a quiet page while the redirect
  // above is in flight. Both must count, or a refresh shows a blank dashboard
  // for as long as the stored workspace takes to read.
  const restoring =
    authStatus === "restoring" || workspaceStatus === "restoring";

  if (!session) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
        {restoring ? (
          // The header placeholder sits in the same column position the real
          // header takes, so nothing is pushed down when the session lands.
          <View style={styles.mainColumn}>
            <MerchantHeaderSkeleton />
            <ScrollView
              className="st-scroll"
              contentContainerStyle={[
                styles.contentContainer,
                { padding: mobileContent ? spacing.md : spacing.lg },
              ]}
              style={styles.mainScroll}
            >
              <View style={styles.contentColumn}>
                {catalogSection !== undefined ? (
                  <CatalogLoadingState
                    compact={mobileContent}
                    section={catalogSection}
                  />
                ) : inventorySection !== undefined ? (
                  <InventoryLoadingState
                    compact={mobileContent}
                    section={inventorySection}
                  />
                ) : ordersSection !== undefined ? (
                  <OrdersLoadingState
                    compact={mobileContent}
                    section={ordersSection}
                  />
                ) : promotionsSection !== undefined ? (
                  <PromotionsLoadingState
                    compact={mobileContent}
                    section={promotionsSection}
                  />
                ) : staffSection !== undefined ? (
                  <StaffLoadingState
                    compact={mobileContent}
                    section={staffSection}
                  />
                ) : profileSection !== undefined ? (
                  <ProfileLoadingState
                    compact={mobileContent}
                    section={profileSection}
                  />
                ) : (
                  <DashboardLoadingState paired={paired} />
                )}
              </View>
            </ScrollView>
          </View>
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
  const createProduct = () =>
    router.push("/merchant/dashboard?section=products");

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
      <View style={[styles.shell, { minHeight: height }]}>
        {!mobileNavigation ? (
          <Animated.View
            style={[styles.desktopSidebar, { width: sidebarWidth }]}
          >
            <MerchantSidebar
              activeItemLabel={navigationTarget.label}
              badges={sidebarBadges}
              onToggleRail={() => setRail((current) => !current)}
              rail={rail}
              session={session}
            />
          </Animated.View>
        ) : null}

        <View style={styles.mainColumn}>
          <MerchantHeader
            dateRange={dateRange}
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
            {/* Opacity only — the skeleton already reserves this column's
                geometry, so fading in cannot move or restyle anything. */}
            <Animated.View
              style={[styles.contentColumn, { opacity: contentFade }]}
            >
              {profileSection !== undefined ? (
                <ProfilePageContent
                  compact={mobileContent}
                  deniedSection={navigationTarget.label}
                  onContactSupport={contactSupport}
                  onOpenProfile={() =>
                    router.push("/merchant/dashboard?section=merchant-profile")
                  }
                  onReturnToOverview={() =>
                    router.replace("/merchant/dashboard?section=overview")
                  }
                  onReviewMerchantProfile={() =>
                    router.push("/merchant/dashboard?section=merchant-profile")
                  }
                  paired={paired}
                  requiredPermission={navigationTarget.permission}
                  resolveState={(dataState) =>
                    resolveDashboardState({
                      authReason:
                        authReason === "session-expired" ? authReason : null,
                      authStatus,
                      dataState,
                      previewState,
                      requiredPermission: navigationTarget.permission,
                      requiresActiveStore,
                      session,
                    })
                  }
                  section={profileSection}
                  session={session}
                />
              ) : staffSection !== undefined ? (
                <StaffPageContent
                  compact={mobileContent}
                  deniedSection={navigationTarget.label}
                  onContactSupport={contactSupport}
                  onReturnToOverview={() =>
                    router.replace("/merchant/dashboard?section=overview")
                  }
                  onReviewMerchantProfile={() =>
                    router.push("/merchant/dashboard?section=merchant-profile")
                  }
                  paired={paired}
                  requiredPermission={navigationTarget.permission}
                  resolveState={(dataState) =>
                    resolveDashboardState({
                      authReason:
                        authReason === "session-expired" ? authReason : null,
                      authStatus,
                      dataState,
                      previewState,
                      requiredPermission: navigationTarget.permission,
                      requiresActiveStore,
                      session,
                    })
                  }
                  section={staffSection}
                  session={session}
                />
              ) : promotionsSection !== undefined ? (
                <PromotionsPageContent
                  compact={mobileContent}
                  deniedSection={navigationTarget.label}
                  onContactSupport={contactSupport}
                  onReturnToOverview={() =>
                    router.replace("/merchant/dashboard?section=overview")
                  }
                  onReviewCountChange={setReviewCount}
                  onReviewMerchantProfile={() =>
                    router.push("/merchant/dashboard?section=merchant-profile")
                  }
                  paired={paired}
                  requiredPermission={navigationTarget.permission}
                  resolveState={(dataState) =>
                    resolveDashboardState({
                      authReason:
                        authReason === "session-expired" ? authReason : null,
                      authStatus,
                      dataState,
                      previewState,
                      requiredPermission: navigationTarget.permission,
                      requiresActiveStore,
                      session,
                    })
                  }
                  section={promotionsSection}
                  session={session}
                />
              ) : ordersSection !== undefined ? (
                <OrdersPageContent
                  compact={mobileContent}
                  deniedSection={navigationTarget.label}
                  onContactSupport={contactSupport}
                  onCountsChange={setOrderCounts}
                  onReturnToOverview={() =>
                    router.replace("/merchant/dashboard?section=overview")
                  }
                  onReviewMerchantProfile={() =>
                    router.push("/merchant/dashboard?section=merchant-profile")
                  }
                  paired={paired}
                  requiredPermission={navigationTarget.permission}
                  resolveState={(dataState) =>
                    resolveDashboardState({
                      authReason:
                        authReason === "session-expired" ? authReason : null,
                      authStatus,
                      dataState,
                      previewState,
                      requiredPermission: navigationTarget.permission,
                      requiresActiveStore,
                      session,
                    })
                  }
                  section={ordersSection}
                  session={session}
                />
              ) : inventorySection !== undefined ? (
                <InventoryPageContent
                  compact={mobileContent}
                  deniedSection={navigationTarget.label}
                  onContactSupport={contactSupport}
                  onLowStockCount={setLowStockCount}
                  onReturnToOverview={() =>
                    router.replace("/merchant/dashboard?section=overview")
                  }
                  onReviewMerchantProfile={() =>
                    router.push("/merchant/dashboard?section=merchant-profile")
                  }
                  paired={paired}
                  requiredPermission={navigationTarget.permission}
                  resolveState={(dataState) =>
                    resolveDashboardState({
                      authReason:
                        authReason === "session-expired" ? authReason : null,
                      authStatus,
                      dataState,
                      previewState,
                      requiredPermission: navigationTarget.permission,
                      requiresActiveStore,
                      session,
                    })
                  }
                  section={inventorySection}
                  session={session}
                />
              ) : catalogSection === undefined ? (
                <DashboardOverviewContent
                  catalogSummary={dashboard.catalogSummary}
                  compactOrders={mobileNavigation}
                  dateRange={dateRange}
                  failedSections={dashboard.failedSections}
                  inventorySummary={dashboard.inventorySummary}
                  salesSeries={dashboard.salesSeries}
                  hasSalesHistory={dashboard.hasSalesHistory}
                  metrics={dashboard.metrics}
                  mobile={mobileContent}
                  deniedSection={navigationTarget.label}
                  onContactSupport={contactSupport}
                  onCreateProduct={createProduct}
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
              ) : (
                <CatalogPageContent
                  compact={mobileContent}
                  deniedSection={navigationTarget.label}
                  onContactSupport={contactSupport}
                  onImportCatalog={() =>
                    router.push("/merchant/dashboard?section=catalog")
                  }
                  onReturnToOverview={() =>
                    router.replace("/merchant/dashboard?section=overview")
                  }
                  onReviewMerchantProfile={() =>
                    router.push("/merchant/dashboard?section=merchant-profile")
                  }
                  paired={paired}
                  requiredPermission={navigationTarget.permission}
                  // The catalog owns its own loading, so the shell only folds
                  // the result into its auth, store-status and role rules.
                  resolveState={(dataState) =>
                    resolveDashboardState({
                      authReason:
                        authReason === "session-expired" ? authReason : null,
                      authStatus,
                      dataState,
                      previewState,
                      requiredPermission: navigationTarget.permission,
                      requiresActiveStore,
                      session,
                    })
                  }
                  section={catalogSection}
                  session={session}
                />
              )}
            </Animated.View>
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
                badges={sidebarBadges}
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
