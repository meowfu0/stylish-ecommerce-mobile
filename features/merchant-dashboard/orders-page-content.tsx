import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { DashboardDialog } from "@/features/merchant-dashboard/dashboard-dialog";
import {
  formatCount,
  formatOrderDate,
  formatPeso,
} from "@/features/merchant-dashboard/dashboard-format";
import {
  DashboardCard,
  DashboardSkeleton,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import {
  DashboardBlockingState,
  DashboardStateBanner,
} from "@/features/merchant-dashboard/dashboard-states";
import type {
  DashboardDataState,
  DashboardState,
  MerchantSession,
  OrdersSectionKey,
  Permission,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  orderItemCount,
  type WorkspaceOrder,
} from "@/features/merchant-dashboard/orders-demo-data";
import {
  FulfillmentContent,
  OrdersContent,
} from "@/features/merchant-dashboard/orders-sections";
import {
  emptyOrderFilters,
  filterOrders,
  fulfillmentQueue,
  type OrderFilters,
  useOrdersWorkspace,
} from "@/features/merchant-dashboard/use-orders-workspace";

/**
 * The Orders and Fulfillment workspaces, rendered inside the existing dashboard
 * shell.
 *
 * Loading, filters and the demo transitions live here so there is one owner and
 * the two pages share a single set of rows: marking an order shipped on the
 * Fulfillment queue is immediately visible on Orders.
 */

export const ordersSectionLabels: Record<OrdersSectionKey, string> = {
  fulfillment: "Fulfillment",
  orders: "Orders",
};

export function OrdersPageContent({
  compact,
  deniedSection,
  onContactSupport,
  onCountsChange,
  onReturnToOverview,
  onReviewMerchantProfile,
  onSignInAgain,
  paired,
  requiredPermission,
  resolveState,
  section,
  session,
}: {
  compact: boolean;
  deniedSection?: string;
  onContactSupport?: () => void;
  /** Reports the fixture-derived counts up so the sidebar badges match. */
  onCountsChange?: (counts: { fulfillment: number; orders: number }) => void;
  onReturnToOverview?: () => void;
  onReviewMerchantProfile?: () => void;
  onSignInAgain?: () => void | Promise<void>;
  paired: boolean;
  requiredPermission?: Permission;
  resolveState: (dataState: DashboardDataState) => DashboardState;
  section: OrdersSectionKey;
  session: MerchantSession;
}) {
  const [filters, setFilters] = useState<OrderFilters>(emptyOrderFilters);
  const [viewing, setViewing] = useState<WorkspaceOrder | null>(null);

  const workspace = useOrdersWorkspace({ enabled: true });
  const state = resolveState(workspace.dataState);

  // Both pages draw from the same rows, so a transition on one is visible on
  // the other and the sidebar badges stay in step.
  const counts = useMemo(() => {
    const open = ["New", "Confirmed", "Processing", "Ready to Ship"];
    return {
      fulfillment: workspace.orders.filter(
        (order) =>
          order.status !== "Cancelled" &&
          (order.fulfillment === "Unfulfilled" ||
            order.fulfillment === "Packing"),
      ).length,
      orders: workspace.orders.filter((order) => open.includes(order.status))
        .length,
    };
  }, [workspace.orders]);

  useEffect(() => {
    onCountsChange?.(counts);
  }, [counts, onCountsChange]);

  // Filters are shared but the queue drops cancelled orders, which have nothing
  // left to pack.
  const scoped =
    section === "fulfillment"
      ? fulfillmentQueue(workspace.orders)
      : workspace.orders;
  const visible = useMemo(
    () => filterOrders(scoped, filters),
    [filters, scoped],
  );

  if (state === "loading") {
    return <OrdersLoadingState compact={compact} section={section} />;
  }

  const renderPage = ["ready", "partial", "refreshing"].includes(state);

  return (
    <View style={styles.column}>
      <DashboardStateBanner
        failedSections={[]}
        onRetry={workspace.retry}
        state={state}
      />
      <DashboardBlockingState
        deniedSection={deniedSection}
        onContactSupport={onContactSupport}
        onRetry={workspace.retry}
        onReturnToOverview={onReturnToOverview}
        onReviewMerchantProfile={onReviewMerchantProfile}
        onSignInAgain={onSignInAgain}
        paired={paired}
        requiredPermission={requiredPermission}
        session={session}
        state={state}
      />

      {renderPage ? (
        section === "orders" ? (
          <OrdersContent
            compact={compact}
            filters={filters}
            onFiltersChange={setFilters}
            onTransition={(order, transition) =>
              workspace.transition(order.orderNumber, transition)
            }
            onViewOrder={setViewing}
            orders={visible}
            session={session}
          />
        ) : (
          <FulfillmentContent
            compact={compact}
            filters={filters}
            locations={workspace.locations}
            onFiltersChange={setFilters}
            onTransition={(order, transition) =>
              workspace.transition(order.orderNumber, transition)
            }
            onViewOrder={setViewing}
            orders={visible}
            session={session}
            shippingMethods={workspace.shippingMethods}
          />
        )
      ) : null}

      <OrderDetailDialog
        locationName={
          workspace.locations.find(
            (location) => location.id === viewing?.locationId,
          )?.name
        }
        onClose={() => setViewing(null)}
        order={viewing}
        shippingMethodName={
          workspace.shippingMethods.find(
            (method) => method.id === viewing?.shippingMethodId,
          )?.name
        }
      />
    </View>
  );
}

/** Order preview, built on the shared dashboard dialog rather than a new one. */
function OrderDetailDialog({
  locationName,
  onClose,
  order,
  shippingMethodName,
}: {
  locationName?: string;
  onClose: () => void;
  order: WorkspaceOrder | null;
  shippingMethodName?: string;
}) {
  return (
    <DashboardDialog
      description={order ? `${order.customer} · ${order.customerEmail}` : ""}
      onClose={onClose}
      testID="order-detail-dialog"
      title={order ? `Order ${order.orderNumber}` : ""}
      visible={order !== null}
      width={560}
    >
      {order ? (
        <>
          <View style={styles.detailChips}>
            <StatusChip label={order.status} tone="blue" />
            <StatusChip label={order.payment} tone="neutral" />
            <StatusChip label={order.fulfillment} tone="neutral" />
          </View>

          <View style={styles.detailGrid}>
            <Detail label="Placed" value={formatOrderDate(order.date)} />
            <Detail label="Location" value={locationName ?? "—"} />
            <Detail label="Shipping" value={shippingMethodName ?? "—"} />
            <Detail
              label="Tracking"
              value={order.trackingNumber ?? "Not yet assigned"}
            />
          </View>

          <View style={styles.items}>
            <StylishText style={styles.itemsTitle} unstyled variant="caption">
              {formatCount(orderItemCount(order))} items
            </StylishText>
            {order.items.map((item) => (
              <View key={item.sku} style={styles.itemRow}>
                <View style={styles.itemCopy}>
                  <StylishText
                    numberOfLines={2}
                    style={styles.itemName}
                    unstyled
                    variant="caption"
                  >
                    {item.name}
                  </StylishText>
                  <StylishText
                    numberOfLines={1}
                    style={styles.itemMeta}
                    unstyled
                    variant="caption"
                  >
                    {item.sku} · {formatCount(item.quantity)} ×{" "}
                    {formatPeso(item.unitPriceCentavos, { decimals: false })}
                  </StylishText>
                </View>
                <StylishText
                  style={styles.itemTotal}
                  unstyled
                  variant="caption"
                >
                  {formatPeso(item.unitPriceCentavos * item.quantity, {
                    decimals: false,
                  })}
                </StylishText>
              </View>
            ))}
            <View style={styles.totalRow}>
              <StylishText style={styles.itemsTitle} unstyled variant="caption">
                Order total
              </StylishText>
              <StylishText style={styles.grandTotal} unstyled variant="price">
                {formatPeso(order.totalCentavos)}
              </StylishText>
            </View>
          </View>
        </>
      ) : (
        <View />
      )}
    </DashboardDialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <StylishText style={styles.detailLabel} unstyled variant="caption">
        {label.toUpperCase()}
      </StylishText>
      <StylishText
        numberOfLines={2}
        style={styles.detailValue}
        unstyled
        variant="caption"
      >
        {value}
      </StylishText>
    </View>
  );
}

/**
 * Loading placeholder. Built from the dimensions the real pages use — the
 * heading's padding and divider, the tile grid, the 44px filter controls, the
 * table's own row height and the pagination footer — so the layout does not move
 * when the rows arrive.
 */
export function OrdersLoadingState({
  compact,
  section,
}: {
  compact: boolean;
  section: OrdersSectionKey;
}) {
  const tiles = section === "orders" ? 7 : 5;
  const filters = section === "orders" ? 6 : 7;

  return (
    <View
      accessibilityLabel={`Loading ${ordersSectionLabels[section]}.`}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      style={styles.column}
      testID={`orders-state-loading-${section}`}
    >
      <DashboardCard>
        <SkeletonHeading />
        <View style={styles.skeletonTileGrid}>
          {Array.from({ length: tiles }, (_value, index) => (
            <View key={index} style={styles.skeletonTile}>
              <DashboardSkeleton style={styles.skeletonTileLabel} />
              <DashboardSkeleton style={styles.skeletonTileValue} />
            </View>
          ))}
        </View>
      </DashboardCard>

      <DashboardCard>
        <SkeletonHeading action />
        <View style={styles.skeletonNotice} />
        <View style={styles.skeletonControls}>
          {Array.from({ length: filters }, (_value, index) => (
            <View key={index} style={styles.skeletonField}>
              <DashboardSkeleton style={styles.skeletonFieldLabel} />
              <DashboardSkeleton style={styles.skeletonControl} />
            </View>
          ))}
        </View>
        <View style={compact ? styles.skeletonCards : styles.skeletonRows}>
          {compact ? null : (
            <View style={[styles.skeletonRow, styles.skeletonHeaderRow]} />
          )}
          {Array.from({ length: 8 }, (_value, index) =>
            compact ? (
              <DashboardSkeleton key={index} style={styles.skeletonCardBlock} />
            ) : (
              <View key={index} style={styles.skeletonRow}>
                <DashboardSkeleton style={styles.skeletonRowLine} />
              </View>
            ),
          )}
        </View>
        <View style={styles.skeletonPagination}>
          <DashboardSkeleton style={styles.skeletonPageLabel} />
          <DashboardSkeleton style={styles.skeletonPageButtons} />
        </View>
      </DashboardCard>
    </View>
  );
}

function SkeletonHeading({ action = false }: { action?: boolean }) {
  return (
    <View style={styles.skeletonHeading}>
      <View style={styles.skeletonHeadingCopy}>
        <DashboardSkeleton style={styles.skeletonTitle} />
        <DashboardSkeleton style={styles.skeletonDescription} />
      </View>
      {action ? <DashboardSkeleton style={styles.skeletonAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: 20, minWidth: 0, width: "100%" },
  detail: { flexBasis: "46%", flexGrow: 1, gap: 2, minWidth: 132 },
  detailChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  detailLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 9,
    letterSpacing: 0.3,
    lineHeight: 13,
  },
  detailValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  grandTotal: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    fontVariant: ["tabular-nums"],
    lineHeight: 24,
  },
  itemCopy: { flexBasis: 0, flexGrow: 1, gap: 1, minWidth: 0 },
  itemMeta: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 15,
  },
  itemName: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
  },
  itemRow: {
    alignItems: "center",
    borderTopColor: colors.neutral[200],
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  itemTotal: {
    color: colors.ink.primary,
    flexShrink: 0,
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    lineHeight: 18,
  },
  items: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    padding: spacing.sm,
  },
  itemsTitle: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
  },
  skeletonAction: { borderRadius: borderRadius.input, height: 44, width: 120 },
  skeletonCardBlock: { borderRadius: borderRadius.md, height: 132 },
  skeletonCards: { gap: spacing.sm, paddingHorizontal: spacing.md },
  skeletonControl: { borderRadius: borderRadius.input, height: 44 },
  skeletonControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  skeletonDescription: { height: 18, maxWidth: 260, width: "70%" },
  skeletonField: {
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing.xxs,
    minWidth: 168,
  },
  skeletonFieldLabel: { height: 16, width: 72 },
  skeletonHeaderRow: { backgroundColor: colors.neutral[50] },
  skeletonHeading: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  skeletonHeadingCopy: { flex: 1, gap: spacing.xxs, minWidth: 220 },
  // Mirrors the demo notice the real pages render above their filters.
  skeletonNotice: {
    backgroundColor: colors.neutral[150],
    borderRadius: borderRadius.input,
    height: 42,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  skeletonPageButtons: {
    borderRadius: borderRadius.input,
    height: 44,
    width: 210,
  },
  skeletonPageLabel: { height: 12, width: 96 },
  skeletonPagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  skeletonRow: {
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    height: 48,
    justifyContent: "center",
  },
  skeletonRowLine: { height: 12, width: "100%" },
  skeletonRows: { paddingHorizontal: spacing.lg },
  skeletonTile: {
    borderColor: "transparent",
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexBasis: 132,
    flexGrow: 1,
    gap: spacing.xxs,
    minWidth: 132,
    padding: spacing.sm,
  },
  skeletonTileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  skeletonTileLabel: { height: 16, width: "70%" },
  skeletonTileValue: { height: 24, width: "45%" },
  skeletonTitle: { height: 24, maxWidth: 180, width: "45%" },
  totalRow: {
    alignItems: "center",
    borderTopColor: colors.neutral[200],
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
});
