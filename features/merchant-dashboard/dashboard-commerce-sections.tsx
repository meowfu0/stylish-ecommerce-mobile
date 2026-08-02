import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { can } from "@/features/merchant-dashboard/dashboard-access";
import {
  activityEvents,
  lowStockAlerts,
  recentOrders,
  topProducts,
} from "@/features/merchant-dashboard/dashboard-data";
import { formatPeso } from "@/features/merchant-dashboard/dashboard-format";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  SectionHeading,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import type {
  ActivityEvent,
  MerchantSession,
  RecentOrder,
} from "@/features/merchant-dashboard/dashboard-types";

export function InventoryOverview({ session }: { session: MerchantSession }) {
  const allowed = can(session, "inventory.adjust");
  return (
    <DashboardCard
      style={styles.growCard}
      testID="dashboard-inventory-overview"
    >
      <SectionHeading
        description={`Default location: ${session.defaultLocation}`}
        title="Inventory overview"
      />
      <View style={styles.inventoryContent}>
        <View style={styles.inventoryGrid}>
          <InventoryStat label="Total active variants" value="486" />
          <InventoryStat label="In stock" value="431" />
          <InventoryStat label="Low stock" tone="warning" value="12" />
          <InventoryStat label="Out of stock" tone="danger" value="3" />
        </View>
        <View
          accessibilityLabel="Stock status: 431 in stock, 12 low stock, 3 out of stock"
          accessibilityRole="image"
          style={styles.stockBar}
        >
          <View style={styles.stockIn} />
          <View style={styles.stockLow} />
          <View style={styles.stockOut} />
        </View>
        <View style={styles.stockLegend}>
          <LegendDot color={colors.feedback.success} label="In stock 431" />
          <LegendDot color={colors.feedback.warning} label="Low stock 12" />
          <LegendDot color={colors.feedback.danger} label="Out of stock 3" />
        </View>
        <StylishText style={styles.inventoryNote} unstyled variant="caption">
          Stock movements stay inside the Inventory section.
        </StylishText>
        <DashboardButton
          disabled={!allowed}
          icon="arrow-right"
          label="Manage Inventory"
          title="Your role cannot adjust inventory."
        />
      </View>
    </DashboardCard>
  );
}

function InventoryStat({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "danger" | "neutral" | "warning";
  value: string;
}) {
  return (
    <View
      style={[
        styles.inventoryStat,
        tone === "danger" && styles.inventoryStatDanger,
        tone === "warning" && styles.inventoryStatWarning,
      ]}
    >
      <StylishText style={styles.inventoryStatLabel} unstyled variant="caption">
        {label}
      </StylishText>
      <StylishText style={styles.inventoryStatValue} unstyled variant="price">
        {value}
      </StylishText>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendDotRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <StylishText style={styles.legendText} unstyled variant="caption">
        {label}
      </StylishText>
    </View>
  );
}

export function TopProducts() {
  return (
    <DashboardCard style={styles.growCard} testID="dashboard-top-products">
      <SectionHeading
        description="Ranked by revenue for the selected range."
        title="Top-performing products"
      />
      <View style={styles.productList}>
        {topProducts.map((product) => (
          <View key={product.sku} style={styles.productRow}>
            <Image
              contentFit="cover"
              source={product.image}
              style={styles.productImage}
            />
            <View style={styles.productCopy}>
              <StylishText
                numberOfLines={2}
                style={styles.productName}
                unstyled
                variant="label"
              >
                {product.name}
              </StylishText>
              <StylishText
                numberOfLines={1}
                style={styles.productSku}
                unstyled
                variant="caption"
              >
                SKU: {product.sku}
              </StylishText>
              <StatusChip
                label={product.stockStatus}
                tone={
                  product.stockStatus === "In stock"
                    ? "green"
                    : product.stockStatus === "Low stock"
                      ? "warning"
                      : "danger"
                }
              />
              <Pressable accessibilityRole="button" style={styles.viewProduct}>
                <StylishText
                  style={styles.viewProductLabel}
                  unstyled
                  variant="caption"
                >
                  View Product
                </StylishText>
              </Pressable>
            </View>
            <View style={styles.productNumbers}>
              <NumberDatum label="Units" value={String(product.units)} />
              <NumberDatum
                label="Revenue"
                value={formatPeso(product.revenueCentavos, { decimals: false })}
              />
              <NumberDatum
                label="Trend"
                tone={product.trendPercent >= 0 ? "positive" : "negative"}
                value={`${product.trendPercent >= 0 ? "+" : ""}${product.trendPercent}%`}
              />
            </View>
          </View>
        ))}
      </View>
    </DashboardCard>
  );
}

function NumberDatum({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "negative" | "positive";
  value: string;
}) {
  return (
    <View style={styles.numberDatum}>
      <StylishText style={styles.numberLabel} unstyled variant="caption">
        {label.toUpperCase()}
      </StylishText>
      <StylishText
        style={[
          styles.numberValue,
          tone === "positive" && styles.numberPositive,
          tone === "negative" && styles.numberNegative,
        ]}
        unstyled
        variant="caption"
      >
        {value}
      </StylishText>
    </View>
  );
}

export function RecentOrders({ compact }: { compact: boolean }) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const pageSize = 6;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return recentOrders;
    return recentOrders.filter(
      (order) =>
        order.customer.toLowerCase().includes(needle) ||
        order.orderNumber.toLowerCase().includes(needle),
    );
  }, [query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <DashboardCard testID="dashboard-recent-orders">
      <SectionHeading
        action={
          <Pressable accessibilityRole="button" style={styles.exportAction}>
            <DashboardIcon name="download-outline" size={16} />
            <StylishText style={styles.exportLabel} unstyled variant="label">
              Export
            </StylishText>
          </Pressable>
        }
        description={`${filtered.length} of ${recentOrders.length} orders match your filters`}
        title="Recent orders"
      />
      <View style={styles.orderControls}>
        <View style={styles.orderSearch}>
          <DashboardIcon name="magnify" />
          <StylishTextInput
            accessibilityLabel="Search recent orders"
            onChangeText={(value) => {
              setPage(1);
              setQuery(value);
            }}
            placeholder="Order number or customer"
            placeholderTextColor={colors.neutral[450]}
            style={styles.orderSearchInput}
            value={query}
          />
        </View>
        <FilterControl label="All statuses" />
        <FilterControl label="All payments" />
      </View>

      {compact ? (
        <View style={styles.orderCards}>
          {pageRows.map((order) => (
            <OrderCard key={order.orderNumber} order={order} />
          ))}
        </View>
      ) : (
        <View accessibilityRole="list" style={styles.orderTable}>
          <View style={[styles.orderTableRow, styles.orderTableHeader]}>
            <TableCell label="Order" width={1.1} />
            <TableCell label="Customer" width={1.3} />
            <TableCell label="Date" width={1.1} />
            <TableCell label="Items" width={0.55} />
            <TableCell label="Total" width={1} />
            <TableCell label="Payment" width={1} />
            <TableCell label="Fulfillment" width={1.1} />
            <TableCell label="Status" width={1} />
          </View>
          {pageRows.map((order) => (
            <View key={order.orderNumber} style={styles.orderTableRow}>
              <TableCell label={order.orderNumber} strong width={1.1} />
              <TableCell label={order.customer} width={1.3} />
              <TableCell label={order.date} width={1.1} />
              <TableCell label={String(order.items)} width={0.55} />
              <TableCell
                label={formatPeso(order.totalCentavos, { decimals: false })}
                strong
                width={1}
              />
              <TableCell label={order.payment} status width={1} />
              <TableCell label={order.fulfillment} status width={1.1} />
              <TableCell label={order.status} status width={1} />
            </View>
          ))}
        </View>
      )}

      <View style={styles.pagination}>
        <StylishText
          accessibilityLiveRegion="polite"
          style={styles.pageLabel}
          unstyled
          variant="caption"
        >
          Page {safePage} of {pageCount}
        </StylishText>
        <View style={styles.paginationButtons}>
          <DashboardButton
            disabled={safePage <= 1}
            label="Previous"
            onPress={() => setPage((current) => Math.max(1, current - 1))}
            tone="quiet"
          />
          <DashboardButton
            disabled={safePage >= pageCount}
            label="Next"
            onPress={() =>
              setPage((current) => Math.min(pageCount, current + 1))
            }
          />
        </View>
      </View>
    </DashboardCard>
  );
}

function FilterControl({ label }: { label: string }) {
  return (
    <Pressable accessibilityRole="button" style={styles.filterControl}>
      <StylishText style={styles.filterLabel} unstyled variant="caption">
        {label}
      </StylishText>
      <DashboardIcon name="chevron-down" size={16} />
    </Pressable>
  );
}

function TableCell({
  label,
  status = false,
  strong = false,
  width,
}: {
  label: string;
  status?: boolean;
  strong?: boolean;
  width: number;
}) {
  return (
    <View style={{ flex: width, minWidth: 0 }}>
      {status ? (
        <StatusChip
          label={label}
          tone={
            ["Paid", "Delivered"].includes(label)
              ? "green"
              : ["Pending", "Packing"].includes(label)
                ? "warning"
                : ["New", "Unfulfilled"].includes(label)
                  ? "pink"
                  : label === "Cancelled" || label === "Refunded"
                    ? "neutral"
                    : "blue"
          }
        />
      ) : (
        <StylishText
          numberOfLines={2}
          style={[styles.tableText, strong && styles.tableTextStrong]}
          unstyled
          variant="caption"
        >
          {label}
        </StylishText>
      )}
    </View>
  );
}

function OrderCard({ order }: { order: RecentOrder }) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderCardHeading}>
        <StylishText style={styles.orderNumber} unstyled variant="label">
          {order.orderNumber}
        </StylishText>
        <StatusChip
          label={order.status}
          tone={order.status === "New" ? "pink" : "blue"}
        />
      </View>
      <StylishText style={styles.orderCustomer} unstyled variant="bodySmall">
        {order.customer} · {order.items} {order.items === 1 ? "item" : "items"}
      </StylishText>
      <View style={styles.orderCardFooter}>
        <StylishText style={styles.orderDate} unstyled variant="caption">
          {order.date}
        </StylishText>
        <StylishText style={styles.orderTotal} unstyled variant="price">
          {formatPeso(order.totalCentavos, { decimals: false })}
        </StylishText>
      </View>
      <View style={styles.orderStatuses}>
        <StatusChip
          label={order.payment}
          tone={order.payment === "Paid" ? "green" : "warning"}
        />
        <StatusChip
          label={order.fulfillment}
          tone={order.fulfillment === "Delivered" ? "green" : "warning"}
        />
      </View>
    </View>
  );
}

export function CatalogSummary({ session }: { session: MerchantSession }) {
  return (
    <DashboardCard style={styles.growCard} testID="dashboard-catalog-summary">
      <SectionHeading
        description="Publication readiness across your product library."
        title="Catalog summary"
      />
      <View style={styles.catalogContent}>
        <View style={styles.catalogGrid}>
          <CatalogStat label="Active products" value="214" />
          <CatalogStat label="Draft products" value="18" />
          <CatalogStat label="Inactive products" value="9" />
          <CatalogStat label="Archived products" value="26" />
          <CatalogStat attention label="Missing images" value="5" />
          <CatalogStat attention label="Missing active variants" value="3" />
        </View>
        <View style={styles.catalogActions}>
          <DashboardButton
            disabled={!can(session, "products.write")}
            icon="plus"
            label="Create Product"
            tone="primary"
          />
          <DashboardButton icon="arrow-right" label="Manage Catalog" />
        </View>
      </View>
    </DashboardCard>
  );
}

function CatalogStat({
  attention = false,
  label,
  value,
}: {
  attention?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.catalogStat}>
      <StylishText style={styles.catalogStatLabel} unstyled variant="caption">
        {label}
      </StylishText>
      <StylishText style={styles.catalogStatValue} unstyled variant="price">
        {value}
      </StylishText>
      {attention ? <StatusChip label="Needs work" tone="warning" /> : null}
    </View>
  );
}

export function LowStockAlerts({ session }: { session: MerchantSession }) {
  return (
    <DashboardCard style={styles.growCard} testID="dashboard-low-stock">
      <SectionHeading
        description="Variants at or below the reorder threshold."
        title="Low-stock alerts"
      />
      <View style={styles.lowStockList}>
        {lowStockAlerts.map((alert) => (
          <View key={alert.sku} style={styles.lowStockRow}>
            <Image
              contentFit="cover"
              source={alert.image}
              style={styles.lowStockImage}
            />
            <View style={styles.lowStockCopy}>
              <StylishText style={styles.lowStockName} unstyled variant="label">
                {alert.name}
              </StylishText>
              <StylishText
                style={styles.lowStockMeta}
                unstyled
                variant="caption"
              >
                {alert.variant} · SKU: {alert.sku}
              </StylishText>
              <StylishText
                style={styles.lowStockMeta}
                unstyled
                variant="caption"
              >
                {alert.location}
              </StylishText>
              <View style={styles.stockNumbers}>
                <StockDatum label="On hand" value={alert.onHand} />
                <StockDatum label="Reserved" value={alert.reserved} />
                <StockDatum label="Available" value={alert.available} />
                <StockDatum label="Threshold" value={alert.reorderThreshold} />
              </View>
              <View style={styles.stockActions}>
                <StatusChip
                  label={alert.available === 0 ? "Out of stock" : "Low stock"}
                  tone={alert.available === 0 ? "danger" : "warning"}
                />
                <DashboardButton
                  disabled={!can(session, "inventory.adjust")}
                  label="Adjust Stock"
                  title="Your role cannot adjust inventory."
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </DashboardCard>
  );
}

function StockDatum({ label, value }: { label: string; value: number }) {
  return (
    <View>
      <StylishText style={styles.stockDatumLabel} unstyled variant="caption">
        {label.toUpperCase()}
      </StylishText>
      <StylishText style={styles.stockDatumValue} unstyled variant="label">
        {value}
      </StylishText>
    </View>
  );
}

export function RecentActivity() {
  return (
    <DashboardCard testID="dashboard-recent-activity">
      <SectionHeading
        description="A sanitized trail of what changed in this workspace."
        title="Recent activity"
      />
      <View style={styles.activityList}>
        {activityEvents.map((event, index) => (
          <ActivityRow
            event={event}
            key={event.key}
            last={index === activityEvents.length - 1}
          />
        ))}
      </View>
    </DashboardCard>
  );
}

function ActivityRow({ event, last }: { event: ActivityEvent; last: boolean }) {
  const icon = {
    image: "image-plus-outline",
    inventory: "cube-outline",
    order: "truck-check-outline",
    product: "tag-outline",
    profile: "shield-account-outline",
    staff: "account-key-outline",
  }[event.type] as Parameters<typeof DashboardIcon>[0]["name"];
  const color = {
    blue: colors.feedback.info,
    green: colors.feedback.success,
    neutral: colors.neutral[550],
    pink: colors.feedback.danger,
    warning: colors.feedback.warning,
  }[event.tone];

  return (
    <View style={styles.activityRow}>
      <View style={styles.timelineMarker}>
        <View style={[styles.activityIcon, { backgroundColor: `${color}18` }]}>
          <DashboardIcon color={color} name={icon} size={16} />
        </View>
        {!last ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.activityCopy}>
        <StylishText style={styles.activitySummary} unstyled variant="label">
          {event.summary}
        </StylishText>
        <StylishText style={styles.activityMeta} unstyled variant="caption">
          {event.actor} · {event.time}
        </StylishText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activityCopy: { flex: 1, gap: spacing.xxs, paddingBottom: spacing.md },
  activityIcon: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  activityList: { padding: spacing.lg },
  activityMeta: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  activityRow: { flexDirection: "row", gap: spacing.sm },
  activitySummary: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  catalogActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  catalogContent: { gap: spacing.md, padding: spacing.lg },
  catalogGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  catalogStat: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    flexBasis: "46%",
    flexGrow: 1,
    gap: spacing.xxs,
    minWidth: 130,
    padding: spacing.sm,
  },
  catalogStatLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  catalogStatValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  exportAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
  },
  exportLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  filterControl: {
    alignItems: "center",
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
    minHeight: 44,
    minWidth: 150,
    paddingHorizontal: spacing.sm,
  },
  filterLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  growCard: { flex: 1, minWidth: 0 },
  inventoryContent: { gap: spacing.md, padding: spacing.lg },
  inventoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  inventoryNote: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  inventoryStat: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    flexBasis: "46%",
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 130,
    padding: spacing.sm,
  },
  inventoryStatDanger: { backgroundColor: colors.feedback.dangerSoft },
  inventoryStatLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  inventoryStatValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  inventoryStatWarning: { backgroundColor: colors.feedback.warningSoft },
  legendDot: { borderRadius: borderRadius.pill, height: 8, width: 8 },
  legendDotRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  legendText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 16,
  },
  lowStockCopy: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  lowStockImage: { borderRadius: borderRadius.sm, height: 58, width: 58 },
  lowStockList: { paddingHorizontal: spacing.lg },
  lowStockMeta: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 16,
  },
  lowStockName: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  lowStockRow: {
    alignItems: "flex-start",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  numberDatum: { alignItems: "flex-end", gap: spacing.xxs },
  numberLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 8,
    lineHeight: 12,
  },
  numberNegative: { color: colors.feedback.danger },
  numberPositive: { color: colors.feedback.success },
  numberValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    lineHeight: 16,
  },
  orderCard: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  orderCardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderCardHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderCards: { gap: spacing.sm, paddingHorizontal: spacing.md },
  orderControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  orderCustomer: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  orderDate: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  orderNumber: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    lineHeight: 20,
  },
  orderSearch: {
    alignItems: "center",
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    minWidth: 220,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
  },
  orderSearchInput: {
    color: colors.ink.primary,
    flex: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
    minWidth: 0,
    padding: 0,
  },
  orderStatuses: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  orderTable: { paddingHorizontal: spacing.lg },
  orderTableHeader: { backgroundColor: colors.neutral[50] },
  orderTableRow: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 60,
    paddingHorizontal: spacing.sm,
  },
  orderTotal: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    lineHeight: 22,
  },
  pageLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  paginationButtons: { flexDirection: "row", gap: spacing.xs },
  productCopy: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  productImage: { borderRadius: borderRadius.sm, height: 56, width: 56 },
  productList: { paddingHorizontal: spacing.lg },
  productName: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
  },
  productNumbers: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.md,
  },
  productRow: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 112,
    paddingVertical: spacing.sm,
  },
  productSku: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 9,
    lineHeight: 14,
  },
  stockActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  stockBar: {
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    height: 10,
    overflow: "hidden",
  },
  stockDatumLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 8,
    lineHeight: 12,
  },
  stockDatumValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 11,
    lineHeight: 16,
  },
  stockIn: { backgroundColor: colors.feedback.success, flex: 431 },
  stockLegend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stockLow: { backgroundColor: colors.feedback.warning, flex: 12 },
  stockNumbers: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  stockOut: { backgroundColor: colors.feedback.danger, flex: 3 },
  tableText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 15,
  },
  tableTextStrong: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
  },
  timelineLine: {
    backgroundColor: colors.neutral[200],
    bottom: 0,
    position: "absolute",
    top: 34,
    width: 1,
  },
  timelineMarker: { alignItems: "center", width: 34 },
  viewProduct: {
    alignSelf: "flex-start",
    minHeight: 28,
    paddingTop: spacing.xxs,
  },
  viewProductLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 10,
    lineHeight: 16,
  },
});
