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
  DashboardSectionUnavailable,
  DashboardStateBanner,
} from "@/features/merchant-dashboard/dashboard-states";
import type {
  DashboardSectionKey,
  DashboardState,
  MerchantSession,
  Metric,
  Permission,
  PipelineStage,
} from "@/features/merchant-dashboard/dashboard-types";

export function DashboardOverviewContent({
  compactOrders,
  failedSections = [],
  hasSalesHistory = true,
  metrics,
  mobile,
  deniedSection,
  onContactSupport,
  onCreateProduct,
  onImportCatalog,
  onRetry,
  onReturnToOverview,
  onReviewMerchantProfile,
  onSignInAgain,
  onViewAllOrders,
  paired,
  pipelineStages,
  session,
  state,
  requiredPermission,
}: {
  compactOrders: boolean;
  failedSections?: readonly DashboardSectionKey[];
  hasSalesHistory?: boolean;
  /** Omitted only in previews; the screen supplies loaded analytics. */
  metrics?: readonly Metric[];
  mobile: boolean;
  deniedSection?: string;
  onContactSupport?: () => void;
  onCreateProduct?: () => void;
  onImportCatalog?: () => void;
  onRetry?: () => void;
  onReturnToOverview?: () => void;
  onReviewMerchantProfile?: () => void;
  onSignInAgain?: () => void | Promise<void>;
  onViewAllOrders?: () => void;
  paired: boolean;
  /** Omitted only in previews; the screen supplies loaded pipeline counts. */
  pipelineStages?: readonly PipelineStage[];
  session: MerchantSession;
  state: DashboardState;
  requiredPermission?: Permission;
}) {
  const renderOverview = ["ready", "partial", "refreshing"].includes(state);
  const unavailable = (section: DashboardSectionKey) =>
    failedSections.includes(section);

  return (
    <View style={styles.contentColumn}>
      <DashboardStateBanner
        failedSections={failedSections}
        onRetry={onRetry}
        state={state}
      />
      <DashboardBlockingState
        deniedSection={deniedSection}
        onContactSupport={onContactSupport}
        onCreateProduct={onCreateProduct}
        onImportCatalog={onImportCatalog}
        onRetry={onRetry}
        onReturnToOverview={onReturnToOverview}
        onReviewMerchantProfile={onReviewMerchantProfile}
        onSignInAgain={onSignInAgain}
        requiredPermission={requiredPermission}
        session={session}
        state={state}
      />

      {renderOverview ? (
        <>
          <WelcomeBanner mobile={mobile} session={session} />
          {unavailable("metrics") ? (
            <DashboardSectionUnavailable onRetry={onRetry} section="metrics" />
          ) : (
            <MetricsSection metrics={metrics} />
          )}
          <View style={[styles.pairedGrid, !paired && styles.stackedGrid]}>
            {unavailable("sales") ? (
              <DashboardSectionUnavailable
                onRetry={onRetry}
                section="sales"
                tall
              />
            ) : (
              <SalesPerformance empty={!hasSalesHistory} />
            )}
            <ActionRequired session={session} />
          </View>
          {unavailable("orders") ? (
            <DashboardSectionUnavailable onRetry={onRetry} section="orders" />
          ) : (
            <OrderPipeline
              onViewAllOrders={onViewAllOrders}
              stages={pipelineStages}
            />
          )}
          <View style={[styles.pairedGrid, !paired && styles.stackedGrid]}>
            {unavailable("inventory") ? (
              <DashboardSectionUnavailable
                onRetry={onRetry}
                section="inventory"
                tall
              />
            ) : (
              <InventoryOverview session={session} />
            )}
            {unavailable("catalog") ? (
              <DashboardSectionUnavailable
                onRetry={onRetry}
                section="catalog"
                tall
              />
            ) : (
              <TopProducts />
            )}
          </View>
          {unavailable("orders") ? null : (
            <RecentOrders compact={compactOrders} />
          )}
          {unavailable("catalog") && unavailable("inventory") ? null : (
            <View style={[styles.pairedGrid, !paired && styles.stackedGrid]}>
              {unavailable("catalog") ? null : (
                <CatalogSummary session={session} />
              )}
              {unavailable("inventory") ? null : (
                <LowStockAlerts session={session} />
              )}
            </View>
          )}
          {unavailable("activity") ? (
            <DashboardSectionUnavailable onRetry={onRetry} section="activity" />
          ) : (
            <RecentActivity />
          )}
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
