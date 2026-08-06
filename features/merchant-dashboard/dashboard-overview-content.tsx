import { StyleSheet, View } from "react-native";

import { spacing } from "@/constants/design-tokens";
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
  MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";

export function DashboardOverviewContent({
  compactMetrics,
  compactOrders,
  mobile,
  onRetry,
  onSignInAgain,
  paired,
  session,
  state,
}: {
  compactMetrics: boolean;
  compactOrders: boolean;
  mobile: boolean;
  onRetry?: () => void;
  onSignInAgain?: () => void | Promise<void>;
  paired: boolean;
  session: MerchantSession;
  state: DashboardState;
}) {
  const renderOverview = ["ready", "partial", "degraded"].includes(state);

  return (
    <View style={styles.contentColumn}>
      <DashboardStateBanner state={state} />
      <DashboardBlockingState
        onRetry={onRetry}
        onSignInAgain={onSignInAgain}
        state={state}
      />

      {renderOverview ? (
        <>
          <WelcomeBanner mobile={mobile} session={session} />
          <MetricsSection mobile={compactMetrics} />
          <View style={[styles.pairedGrid, !paired && styles.stackedGrid]}>
            <SalesPerformance />
            <ActionRequired session={session} />
          </View>
          <OrderPipeline />
          <View style={[styles.pairedGrid, !paired && styles.stackedGrid]}>
            <InventoryOverview session={session} />
            <TopProducts />
          </View>
          <RecentOrders compact={compactOrders} />
          <View style={[styles.pairedGrid, !paired && styles.stackedGrid]}>
            <CatalogSummary session={session} />
            <LowStockAlerts session={session} />
          </View>
          <RecentActivity />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contentColumn: { gap: 20, minWidth: 0, width: "100%" },
  pairedGrid: { flexDirection: "row", gap: spacing.lg },
  stackedGrid: { flexDirection: "column" },
});
