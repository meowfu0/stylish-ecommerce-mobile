import { Image } from "expo-image";
import { useMemo, useState, type ComponentProps } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { can } from "@/features/merchant-dashboard/dashboard-access";
import {
  activityEvents,
  catalogSummary,
  inventorySummary,
  lowStockAlerts,
  recentOrders,
  topProducts,
} from "@/features/merchant-dashboard/dashboard-data";
import {
  formatCount,
  formatOrderDate,
  formatPeso,
} from "@/features/merchant-dashboard/dashboard-format";
import type { DashboardMenuItem } from "@/features/merchant-dashboard/dashboard-menu";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  SectionHeading,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import {
  FilterSelect,
  paginate,
  RowActionsButton,
  SearchField,
  SortHeaderCell,
  TableCell as TableColumn,
  TablePagination,
  TableText,
} from "@/features/merchant-dashboard/dashboard-table";
import type {
  ActivityEvent,
  CatalogSummaryCounts,
  InventoryAlert,
  InventorySummary,
  MerchantSession,
  OrderStatus,
  PaymentStatus,
  ProductRow,
  RecentOrder,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from "@/features/merchant-dashboard/dashboard-types";

/**
 * The three tracked stock states, in the order they stack in the bar and read
 * in the legend. Colours come from the feedback tokens so the bar segment and
 * its legend dot can never disagree.
 */
const stockStates = [
  { color: colors.feedback.success, key: "inStock", label: "In Stock" },
  { color: colors.feedback.warning, key: "lowStock", label: "Low Stock" },
  { color: colors.feedback.danger, key: "outOfStock", label: "Out of Stock" },
] as const satisfies readonly {
  color: string;
  key: keyof InventorySummary;
  label: string;
}[];

export function InventoryOverview({
  session,
  summary = inventorySummary,
}: {
  session: MerchantSession;
  /** Omitted only in previews; the screen supplies loaded inventory counts. */
  summary?: InventorySummary;
}) {
  const allowed = can(session, "inventory.adjust");
  const counts = stockStates.map((state) => ({
    ...state,
    count: Math.max(0, summary[state.key]),
  }));
  // The bar is proportional to what is actually tracked, so it stays truthful
  // when the catalogue holds variants in none of the three states.
  const tracked = counts.reduce((total, state) => total + state.count, 0);

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
          <InventoryStat
            label="Total active variants"
            value={summary.totalActiveVariants}
          />
          <InventoryStat label="In stock" value={summary.inStock} />
          <InventoryStat
            label="Low stock"
            tone="warning"
            value={summary.lowStock}
          />
          <InventoryStat
            label="Out of stock"
            tone="danger"
            value={summary.outOfStock}
          />
        </View>

        <View
          accessibilityLabel={`Stock status: ${counts
            .map(
              (state) =>
                `${formatCount(state.count)} ${state.label.toLowerCase()}`,
            )
            .join(", ")}`}
          accessibilityRole="image"
          style={styles.stockBar}
          testID="inventory-stock-bar"
        >
          {tracked === 0
            ? null
            : counts
                .filter((state) => state.count > 0)
                .map((state) => (
                  <View
                    key={state.key}
                    style={[
                      styles.stockSegment,
                      {
                        backgroundColor: state.color,
                        // Proportional to the count, with a small floor so a
                        // single out-of-stock variant is still visible.
                        flexGrow: state.count,
                        minWidth: 4,
                      },
                    ]}
                    testID={`inventory-stock-segment-${state.key}`}
                  />
                ))}
        </View>

        <View style={styles.stockLegend}>
          {counts.map((state) => (
            <LegendDot
              color={state.color}
              count={state.count}
              key={state.key}
              label={state.label}
              testID={`inventory-legend-dot-${state.key}`}
            />
          ))}
        </View>

        <View style={styles.inventoryNoteRow}>
          <DashboardIcon
            color={colors.neutral[400]}
            name="map-marker-outline"
            size={14}
          />
          <StylishText style={styles.inventoryNote} unstyled variant="caption">
            Stock movements stay inside the Inventory section.
          </StylishText>
        </View>

        <DashboardButton
          disabled={!allowed}
          fullWidth
          label="Manage Inventory"
          testID="inventory-manage-button"
          title="Your role cannot adjust inventory."
          trailingIcon="arrow-right"
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
  value: number;
}) {
  return (
    <View
      style={[
        styles.inventoryStat,
        tone === "danger" && styles.inventoryStatDanger,
        tone === "warning" && styles.inventoryStatWarning,
      ]}
      testID={`inventory-stat-${tone}`}
    >
      <StylishText
        style={[
          styles.inventoryStatLabel,
          tone === "danger" && styles.inventoryStatLabelDanger,
          tone === "warning" && styles.inventoryStatLabelWarning,
        ]}
        unstyled
        variant="caption"
      >
        {label}
      </StylishText>
      <StylishText style={styles.inventoryStatValue} unstyled variant="price">
        {formatCount(value)}
      </StylishText>
    </View>
  );
}

function LegendDot({
  color,
  count,
  label,
  testID,
}: {
  color: string;
  count: number;
  label: string;
  testID?: string;
}) {
  return (
    <View style={styles.legendDotRow}>
      <View
        style={[styles.legendDot, { backgroundColor: color }]}
        testID={testID}
      />
      <StylishText style={styles.legendText} unstyled variant="caption">
        {label}
      </StylishText>
      <StylishText style={styles.legendCount} unstyled variant="caption">
        {formatCount(count)}
      </StylishText>
    </View>
  );
}

const stockTones = {
  "In stock": "green",
  "Low stock": "warning",
  "Out of stock": "danger",
} as const;

export function TopProducts({
  products = topProducts,
}: {
  /** Omitted only in previews; the screen supplies the ranked catalogue. */
  products?: readonly ProductRow[];
}) {
  return (
    <DashboardCard style={styles.growCard} testID="dashboard-top-products">
      <SectionHeading
        description="Ranked by revenue for the selected range."
        title="Top-performing products"
      />
      <View style={styles.productList}>
        {products.map((product, index) => (
          <View
            key={product.sku}
            // One surface with hairline separators rather than a card per row;
            // the last row leaves the card's own padding as its bottom edge.
            style={[
              styles.productRow,
              index < products.length - 1 && styles.productRowDivided,
            ]}
            testID={`top-product-${product.sku}`}
          >
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
                SKU {product.sku}
              </StylishText>
              <View style={styles.productBadgeRow}>
                <StatusChip
                  label={product.stockStatus}
                  tone={stockTones[product.stockStatus]}
                />
              </View>
            </View>

            <View style={styles.productNumbers}>
              <NumberDatum
                label="Units"
                value={formatCount(product.units)}
                width={46}
              />
              <NumberDatum
                label="Revenue"
                numeric
                value={formatPeso(product.revenueCentavos, { decimals: false })}
                width={78}
              />
              <NumberDatum
                label="Trend"
                tone={product.trendPercent >= 0 ? "positive" : "negative"}
                value={`${product.trendPercent >= 0 ? "+" : ""}${product.trendPercent}%`}
                width={66}
              />
            </View>

            <Pressable
              accessibilityLabel={`View ${product.name}`}
              accessibilityRole="button"
              style={styles.viewProduct}
              testID={`top-product-view-${product.sku}`}
            >
              <StylishText
                numberOfLines={1}
                style={styles.viewProductLabel}
                unstyled
                variant="caption"
              >
                View Product
              </StylishText>
            </Pressable>
          </View>
        ))}
      </View>
    </DashboardCard>
  );
}

function NumberDatum({
  label,
  numeric = false,
  tone,
  value,
  width,
}: {
  label: string;
  numeric?: boolean;
  tone?: "negative" | "positive";
  value: string;
  /**
   * Reserves the column so Units, Revenue and Trend line up down the list
   * instead of each row sizing its own metrics to their content.
   */
  width?: number;
}) {
  return (
    <View style={[styles.numberDatum, width !== undefined && { width }]}>
      <StylishText style={styles.numberLabel} unstyled variant="caption">
        {label.toUpperCase()}
      </StylishText>
      <View style={styles.numberValueRow}>
        {tone ? (
          <DashboardIcon
            color={
              tone === "positive"
                ? colors.feedback.success
                : colors.feedback.danger
            }
            name={
              tone === "positive" ? "arrow-top-right" : "arrow-bottom-right"
            }
            size={12}
          />
        ) : null}
        <StylishText
          numberOfLines={numeric ? 1 : undefined}
          style={[
            styles.numberValue,
            numeric && styles.numericValue,
            tone === "positive" && styles.numberPositive,
            tone === "negative" && styles.numberNegative,
          ]}
          unstyled
          variant="caption"
        >
          {value}
        </StylishText>
      </View>
    </View>
  );
}

const ALL_STATUSES = "All statuses";
const ALL_PAYMENTS = "All payments";

type StatusFilter = OrderStatus | typeof ALL_STATUSES;
type PaymentFilter = PaymentStatus | typeof ALL_PAYMENTS;

/** Sorts on the ISO date, so ordering is exact rather than text-shaped. */
export function sortOrdersByDate(
  orders: readonly RecentOrder[],
  direction: "asc" | "desc",
) {
  return [...orders].sort((left, right) => {
    if (left.date === right.date) {
      // Same-day orders keep a stable, meaningful order by their number.
      return direction === "desc"
        ? right.orderNumber.localeCompare(left.orderNumber)
        : left.orderNumber.localeCompare(right.orderNumber);
    }
    return direction === "desc"
      ? right.date.localeCompare(left.date)
      : left.date.localeCompare(right.date);
  });
}

export function RecentOrders({
  compact,
  orders = recentOrders,
  session,
}: {
  compact: boolean;
  /** Omitted only in previews; the screen supplies the loaded orders. */
  orders?: readonly RecentOrder[];
  session?: MerchantSession;
}) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUSES);
  const [paymentFilter, setPaymentFilter] =
    useState<PaymentFilter>(ALL_PAYMENTS);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const pageSize = 6;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = orders.filter((order) => {
      if (statusFilter !== ALL_STATUSES && order.status !== statusFilter) {
        return false;
      }
      if (paymentFilter !== ALL_PAYMENTS && order.payment !== paymentFilter) {
        return false;
      }
      if (!needle) return true;
      return (
        order.customer.toLowerCase().includes(needle) ||
        order.orderNumber.toLowerCase().includes(needle)
      );
    });
    return sortOrdersByDate(matched, sortDirection);
  }, [orders, paymentFilter, query, sortDirection, statusFilter]);

  const {
    pageCount,
    rows: pageRows,
    safePage,
  } = paginate(filtered, page, pageSize);
  const resetPage = () => setPage(1);

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
        description={`${filtered.length} of ${orders.length} orders match your filters`}
        title="Recent orders"
      />
      <View style={styles.orderControls}>
        <SearchField
          accessibilityLabel="Search recent orders"
          label="Search orders"
          onChangeText={(value) => {
            resetPage();
            setQuery(value);
          }}
          placeholder="Order number or customer"
          value={query}
        />
        <FilterSelect
          label="Order status"
          onChange={(next) => {
            resetPage();
            setStatusFilter(next as StatusFilter);
          }}
          options={[ALL_STATUSES, ...ORDER_STATUSES]}
          testID="order-status-filter"
          value={statusFilter}
        />
        <FilterSelect
          label="Payment"
          onChange={(next) => {
            resetPage();
            setPaymentFilter(next as PaymentFilter);
          }}
          options={[ALL_PAYMENTS, ...PAYMENT_STATUSES]}
          testID="order-payment-filter"
          value={paymentFilter}
        />
      </View>

      {compact ? (
        <View style={styles.orderCards}>
          {pageRows.map((order) => (
            <OrderCard key={order.orderNumber} order={order} />
          ))}
        </View>
      ) : (
        <ScrollView
          className="st-scroll"
          // A horizontal scroller sizes to its content, so without this the
          // table would sit at its minimum width and leave the rest of the card
          // empty. `flexGrow` lets it fill the card, and the table's own
          // minimum still forces a scroll once the card is narrower than that.
          contentContainerStyle={styles.orderTableContent}
          horizontal
          showsHorizontalScrollIndicator
          style={styles.orderTableScroll}
        >
          <View accessibilityRole="list" style={styles.orderTable}>
            <View style={[styles.orderTableRow, styles.orderTableHeader]}>
              <TableCell header label="Order" width={1.1} />
              <TableCell header label="Customer" width={1.3} />
              <SortHeaderCell
                ascendingHint="oldest first"
                descendingHint="newest first"
                direction={sortDirection}
                label="Date"
                onPress={() =>
                  setSortDirection((current) =>
                    current === "desc" ? "asc" : "desc",
                  )
                }
                testID="orders-sort-date"
                width={1.1}
              />
              <TableCell header label="Items" width={0.55} />
              <TableCell header label="Total" width={1} />
              <TableCell header label="Payment" width={1} />
              <TableCell header label="Fulfillment" width={1.1} />
              <TableCell header label="Status" width={1} />
              <View style={styles.rowActionsCell} />
            </View>
            {pageRows.map((order) => (
              <View
                key={order.orderNumber}
                style={styles.orderTableRow}
                testID={`order-row-${order.orderNumber}`}
              >
                <TableCell label={order.orderNumber} strong width={1.1} />
                <TableCell label={order.customer} width={1.3} />
                <TableCell label={formatOrderDate(order.date)} width={1.1} />
                <TableCell label={formatCount(order.items)} width={0.55} />
                <TableCell
                  label={formatPeso(order.totalCentavos, { decimals: false })}
                  numeric
                  strong
                  width={1}
                />
                <TableCell label={order.payment} status width={1} />
                <TableCell label={order.fulfillment} status width={1.1} />
                <TableCell label={order.status} status width={1} />
                <OrderRowActions order={order} session={session} />
              </View>
            ))}
            {pageRows.length === 0 ? (
              <View style={styles.orderEmptyRow}>
                <StylishText
                  style={styles.orderEmptyText}
                  unstyled
                  variant="caption"
                >
                  No orders match your filters.
                </StylishText>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      <TablePagination
        onChange={setPage}
        page={safePage}
        pageCount={pageCount}
        testIDPrefix="orders"
      />
    </DashboardCard>
  );
}

/**
 * Row menu. Only actions the order's own state allows are listed, and
 * fulfilment is withheld from a role that cannot fulfil — nothing here calls a
 * backend, so the menu offers exactly what the dashboard can already express.
 */
function OrderRowActions({
  order,
  session,
}: {
  order: RecentOrder;
  session?: MerchantSession;
}) {
  const cancelled = order.status === "Cancelled";
  const canFulfil = session ? can(session, "orders.fulfill") : true;

  const items: DashboardMenuItem[] = [
    { icon: "receipt-text-outline", key: "view", label: "View order" },
    ...(cancelled
      ? []
      : [
          {
            icon: "printer-outline" as const,
            key: "packing-slip",
            label: "Print packing slip",
          },
        ]),
    ...(!cancelled && order.fulfillment !== "Delivered" && canFulfil
      ? [
          {
            icon: "check-circle-outline" as const,
            key: "fulfil",
            label: "Mark as fulfilled",
          },
        ]
      : []),
    { icon: "email-outline", key: "contact", label: "Contact customer" },
  ];

  return (
    <RowActionsButton
      accessibilityLabel={`Actions for order ${order.orderNumber}`}
      items={items}
      menuLabel={`Order ${order.orderNumber} actions`}
      testID={`order-actions-${order.orderNumber}`}
    />
  );
}

/**
 * One tone per order state, shared by the payment, fulfilment and status
 * columns so a single vocabulary drives every badge in the table.
 */
const orderStateTones: Record<
  string,
  ComponentProps<typeof StatusChip>["tone"]
> = {
  Cancelled: "neutral",
  Confirmed: "blue",
  Delivered: "green",
  Failed: "danger",
  New: "pink",
  Packing: "warning",
  Paid: "green",
  Pending: "warning",
  Processing: "blue",
  "Ready to Ship": "warning",
  Refunded: "neutral",
  Shipped: "blue",
  Unfulfilled: "pink",
};

function TableCell({
  header = false,
  label,
  numeric = false,
  status = false,
  strong = false,
  width,
}: {
  header?: boolean;
  label: string;
  numeric?: boolean;
  status?: boolean;
  strong?: boolean;
  width: number;
}) {
  return (
    <TableColumn width={width}>
      {status ? (
        <StatusChip label={label} tone={orderStateTones[label] ?? "blue"} />
      ) : (
        <TableText
          header={header}
          numeric={numeric}
          strong={strong}
          value={label}
        />
      )}
    </TableColumn>
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
        <StylishText
          numberOfLines={1}
          style={styles.orderTotal}
          unstyled
          variant="price"
        >
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

export function CatalogSummary({
  session,
  summary = catalogSummary,
}: {
  session: MerchantSession;
  /** Omitted only in previews; the screen supplies the loaded counts. */
  summary?: CatalogSummaryCounts;
}) {
  return (
    <DashboardCard style={styles.growCard} testID="dashboard-catalog-summary">
      <SectionHeading
        description="Publication readiness across your product library."
        title="Catalog summary"
      />
      <View style={styles.catalogContent}>
        <View style={styles.catalogGrid}>
          <CatalogStat label="Active products" value={summary.activeProducts} />
          <CatalogStat label="Draft products" value={summary.draftProducts} />
          <CatalogStat
            label="Inactive products"
            value={summary.inactiveProducts}
          />
          <CatalogStat
            label="Archived products"
            value={summary.archivedProducts}
          />
          {/* The two readiness gaps carry a badge, and only while non-zero —
              a catalogue with nothing missing should not be told it needs work. */}
          <CatalogStat
            label="Missing images"
            tone="warning"
            value={summary.missingImages}
          />
          <CatalogStat
            label="Missing active variants"
            tone="danger"
            value={summary.missingActiveVariants}
          />
        </View>
        {/* Each action owns an equal share of the row and fills it, so the two
            buttons match in width and only stack when the row cannot hold
            both at a readable size. */}
        <View style={styles.catalogActions}>
          <View style={styles.catalogAction}>
            <DashboardButton
              disabled={!can(session, "products.write")}
              fullWidth
              icon="plus"
              label="Create Product"
              testID="catalog-create-product"
              title="Your role cannot create products."
              tone="primary"
            />
          </View>
          <View style={styles.catalogAction}>
            <DashboardButton
              fullWidth
              label="Manage Catalog"
              testID="catalog-manage"
              trailingIcon="arrow-right"
            />
          </View>
        </View>
      </View>
    </DashboardCard>
  );
}

function CatalogStat({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "danger" | "neutral" | "warning";
  value: number;
}) {
  const flagged = tone !== "neutral" && value > 0;

  return (
    <View style={styles.catalogStat} testID={`catalog-stat-${tone}`}>
      <StylishText
        numberOfLines={1}
        style={[
          styles.catalogStatLabel,
          flagged && tone === "warning" && styles.catalogStatLabelWarning,
          flagged && tone === "danger" && styles.catalogStatLabelDanger,
        ]}
        unstyled
        variant="caption"
      >
        {label}
      </StylishText>
      {/* Value and badge share one line, as the reference shows. */}
      <View style={styles.catalogStatValueRow}>
        <StylishText style={styles.catalogStatValue} unstyled variant="price">
          {formatCount(value)}
        </StylishText>
        {flagged ? (
          <StatusChip
            label="Needs work"
            tone={tone === "danger" ? "danger" : "warning"}
          />
        ) : null}
      </View>
    </View>
  );
}

export function LowStockAlerts({
  alerts = lowStockAlerts,
  session,
}: {
  /** Omitted only in previews; the screen supplies the loaded alerts. */
  alerts?: readonly InventoryAlert[];
  session: MerchantSession;
}) {
  const canAdjust = can(session, "inventory.adjust");

  return (
    <DashboardCard style={styles.growCard} testID="dashboard-low-stock">
      <SectionHeading
        description="Variants at or below the reorder threshold."
        title="Low-stock alerts"
      />
      <View style={styles.lowStockList}>
        {alerts.map((alert, index) => (
          <View
            key={alert.sku}
            // Hairline separators between rows; the last leaves the card's own
            // padding as its bottom edge.
            style={[
              styles.lowStockRow,
              index < alerts.length - 1 && styles.lowStockRowDivided,
            ]}
            testID={`low-stock-${alert.sku}`}
          >
            <View style={styles.lowStockMain}>
              <Image
                contentFit="cover"
                source={alert.image}
                style={styles.lowStockImage}
              />
              <View style={styles.lowStockCopy}>
                <StylishText
                  numberOfLines={2}
                  style={styles.lowStockName}
                  unstyled
                  variant="label"
                >
                  {alert.name}
                </StylishText>
                <StylishText
                  numberOfLines={1}
                  style={styles.lowStockMeta}
                  unstyled
                  variant="caption"
                >
                  {alert.variant} · SKU {alert.sku}
                </StylishText>
                <StylishText
                  numberOfLines={1}
                  style={styles.lowStockLocation}
                  unstyled
                  variant="caption"
                >
                  {alert.location}
                </StylishText>
              </View>

              <View style={styles.stockNumbers}>
                <StockDatum label="On hand" value={alert.onHand} />
                <StockDatum label="Reserved" value={alert.reserved} />
                <StockDatum
                  // Nothing sellable left is the reason this row is here.
                  depleted={alert.available === 0}
                  label="Available"
                  value={alert.available}
                />
                <StockDatum label="Threshold" value={alert.reorderThreshold} />
              </View>
            </View>

            <View style={styles.stockActions}>
              <StatusChip
                label={alert.available === 0 ? "Out of stock" : "Low stock"}
                tone={alert.available === 0 ? "danger" : "warning"}
              />
              <DashboardButton
                disabled={!canAdjust}
                label="Adjust Stock"
                testID={`low-stock-adjust-${alert.sku}`}
                title="Your role cannot adjust inventory."
              />
            </View>
          </View>
        ))}
      </View>
    </DashboardCard>
  );
}

function StockDatum({
  depleted = false,
  label,
  value,
}: {
  depleted?: boolean;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.stockDatum}>
      <StylishText style={styles.stockDatumLabel} unstyled variant="caption">
        {label.toUpperCase()}
      </StylishText>
      <StylishText
        numberOfLines={1}
        style={[styles.stockDatumValue, depleted && styles.stockDatumDepleted]}
        unstyled
        variant="label"
      >
        {formatCount(value)}
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
  catalogAction: { flexBasis: 0, flexGrow: 1, minWidth: 150 },
  catalogActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  catalogContent: { gap: spacing.md, padding: spacing.lg },
  catalogGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  catalogStat: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    // Required alongside an all-sides width: on web these serialise to the
    // `border` shorthand, which resets the omitted style and hides the border.
    borderStyle: "solid",
    borderWidth: 1,
    // Two per row wherever the card can hold a readable pair, then one.
    flexBasis: "46%",
    flexGrow: 1,
    gap: spacing.xxs,
    minWidth: 132,
    padding: spacing.sm,
  },
  catalogStatLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  catalogStatLabelDanger: { color: colors.feedback.danger },
  catalogStatLabelWarning: { color: colors.feedback.warning },
  catalogStatValueRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
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
  growCard: { flex: 1, minWidth: 0 },
  inventoryContent: { gap: spacing.md, padding: spacing.lg },
  inventoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  inventoryNote: {
    color: colors.neutral[550],
    flexShrink: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  inventoryNoteRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  inventoryStat: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    // Required alongside an all-sides `borderWidth`: on web these serialise to
    // the `border` shorthand, which resets the omitted style to `none` and
    // silently collapses the border to zero width.
    borderStyle: "solid",
    borderWidth: 1,
    // Two per row wherever the card is wide enough for a readable pair, then
    // one per row rather than squeezing the labels.
    flexBasis: "46%",
    flexGrow: 1,
    gap: spacing.xxs,
    minWidth: 132,
    padding: spacing.sm,
  },
  inventoryStatDanger: {
    backgroundColor: colors.feedback.dangerSoft,
    borderColor: colors.feedback.dangerBorder,
  },
  inventoryStatLabelDanger: { color: colors.feedback.danger },
  inventoryStatLabelWarning: { color: colors.feedback.warning },
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
  inventoryStatWarning: {
    backgroundColor: colors.feedback.warningSoft,
    borderColor: colors.feedback.warningBorder,
  },
  legendDot: { borderRadius: borderRadius.pill, height: 8, width: 8 },
  legendDotRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  // Label carries the weight, count stays visually secondary beside it.
  legendCount: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    lineHeight: 16,
  },
  legendText: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
  },
  // `flexBasis: 0` so the copy claims only leftover space: sized from its text
  // instead, a longer SKU would push the metrics onto their own line and break
  // the column alignment down the list.
  lowStockCopy: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    gap: 1,
    minWidth: 132,
  },
  lowStockImage: { borderRadius: borderRadius.sm, height: 40, width: 40 },
  lowStockLocation: {
    color: colors.brand.blue,
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 15,
  },
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
  lowStockRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  lowStockRowDivided: {
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
  },
  // Thumbnail, copy and metrics share one line; the metrics wrap beneath the
  // product once the card can no longer hold them side by side.
  lowStockMain: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  numberDatum: { alignItems: "flex-start", gap: 2 },
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
  numberValueRow: { alignItems: "center", flexDirection: "row", gap: 2 },
  numericValue: { flexShrink: 0, fontVariant: ["tabular-nums"] },
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
  orderStatuses: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  orderEmptyRow: { paddingVertical: spacing.xl },
  orderEmptyText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  // Fills the card when there is room and holds its columns readable when there
  // is not, scrolling horizontally past that point rather than compressing
  // them. The `st-scroll` class keeps that scrollbar thin and in the brand pink.
  orderTable: { flexGrow: 1, minWidth: 880, paddingHorizontal: spacing.lg },
  orderTableContent: { flexGrow: 1 },
  orderTableHeader: { backgroundColor: colors.neutral[50] },
  orderTableScroll: { flexGrow: 0 },
  orderTableRow: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    // Compact like the reference; the badges set the real floor.
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  orderTotal: {
    color: colors.ink.primary,
    flexShrink: 0,
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    lineHeight: 22,
  },
  // The header's spacer over the row-actions column; the trigger itself lives
  // in the shared table module.
  rowActionsCell: {
    alignItems: "center",
    flexBasis: 40,
    flexGrow: 0,
    flexShrink: 0,
  },
  productBadgeRow: { alignItems: "flex-start", flexDirection: "row" },
  // Grows into whatever the metrics and action leave behind, and keeps enough
  // width that a long product name wraps instead of truncating to nothing.
  productCopy: { flex: 1, gap: 2, minWidth: 128 },
  productImage: { borderRadius: borderRadius.sm, height: 44, width: 44 },
  productList: { paddingHorizontal: spacing.lg },
  productName: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
  },
  productNumbers: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexShrink: 0,
    gap: spacing.xs,
  },
  productRow: {
    alignItems: "center",
    flexDirection: "row",
    // Wraps the metrics and action beneath the product once the row can no
    // longer hold them, rather than crushing the columns below legibility.
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  // A single-edge width serialises as a longhand on web, so unlike an
  // all-sides border this one does not need an explicit `borderStyle`.
  productRowDivided: {
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
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
  },
  stockBar: {
    // An empty track shows through when nothing is tracked yet, so a merchant
    // with no stock sees an empty bar rather than a missing one.
    backgroundColor: colors.neutral[150],
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    height: 10,
    overflow: "hidden",
  },
  stockDatumLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 9,
    letterSpacing: 0.3,
    lineHeight: 13,
  },
  stockDatumValue: {
    color: colors.ink.primary,
    flexShrink: 0,
    fontFamily: "Montserrat_700Bold",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    lineHeight: 16,
  },
  stockLegend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stockSegment: { flexBasis: 0, flexShrink: 1 },
  stockNumbers: {
    flexDirection: "row",
    flexShrink: 0,
    gap: spacing.xs,
  },
  // Fixed columns so On hand / Reserved / Available / Threshold line up down
  // the list rather than each row sizing to its own digits.
  stockDatum: { alignItems: "flex-start", gap: 1, width: 62 },
  stockDatumDepleted: { color: colors.feedback.danger },
  timelineLine: {
    backgroundColor: colors.neutral[200],
    bottom: 0,
    position: "absolute",
    top: 34,
    width: 1,
  },
  timelineMarker: { alignItems: "center", width: 34 },
  viewProduct: {
    alignItems: "flex-end",
    flexShrink: 0,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 92,
  },
  viewProductLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 10,
    lineHeight: 16,
  },
});
