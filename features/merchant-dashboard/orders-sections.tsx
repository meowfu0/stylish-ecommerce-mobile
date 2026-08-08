import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { can } from "@/features/merchant-dashboard/dashboard-access";
import {
  formatCount,
  formatOrderDate,
  formatPeso,
} from "@/features/merchant-dashboard/dashboard-format";
import { useResponsiveGrid } from "@/features/merchant-dashboard/dashboard-grid";
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
  RowActionsButton,
  SearchField,
  SortHeaderCell,
  TableCell,
  TablePagination,
  TableText,
} from "@/features/merchant-dashboard/dashboard-table";
import type {
  FulfillmentStatus,
  MerchantSession,
  OrderStatus,
  PaymentStatus,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  FULFILLMENT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  type DemoFulfillmentLocation,
  type DemoShippingMethod,
  orderItemCount,
  type WorkspaceOrder,
} from "@/features/merchant-dashboard/orders-demo-data";
import {
  ALL_FULFILLMENTS,
  ALL_LOCATIONS,
  ALL_ORDER_STATUSES,
  ALL_PAYMENTS,
  ALL_SHIPPING,
  availableTransitions,
  fulfillmentCounts,
  isIsoDate,
  type OrderFilters,
  type OrderSortKey,
  type OrderTransition,
  orderStatusCounts,
  paginate,
  ORDERS_PAGE_SIZE,
  sortOrders,
} from "@/features/merchant-dashboard/use-orders-workspace";

/**
 * The Orders and Fulfillment workspaces.
 *
 * Both are built from the Recent Orders table pattern the dashboard already
 * ships — the same filter row, flex-ratio columns, anchored row menus and
 * pagination — so a merchant moving between them is looking at one system.
 * Neither holds data of its own: rows, locations and shipping methods all
 * arrive as props from the workspace hook.
 */

const ORDER_TILE_MIN_WIDTH = 132;
const ORDER_TILE_GAP = spacing.sm;
const DENSE_TABLE_WIDTH = 1000;

const statusTones: Record<
  OrderStatus,
  ComponentProps<typeof StatusChip>["tone"]
> = {
  Cancelled: "neutral",
  Confirmed: "blue",
  Delivered: "green",
  New: "pink",
  Processing: "blue",
  "Ready to Ship": "warning",
  Shipped: "blue",
};

const paymentTones: Record<
  PaymentStatus,
  ComponentProps<typeof StatusChip>["tone"]
> = {
  Failed: "danger",
  Paid: "green",
  Pending: "warning",
  Refunded: "neutral",
};

const fulfillmentTones: Record<
  FulfillmentStatus,
  ComponentProps<typeof StatusChip>["tone"]
> = {
  Delivered: "green",
  Packing: "warning",
  Shipped: "blue",
  Unfulfilled: "pink",
};

const transitionLabels: Record<OrderTransition, string> = {
  contact: "Contact customer",
  "mark-fulfilled": "Mark as delivered",
  "mark-processing": "Mark as processing",
  "mark-ready": "Mark ready to ship",
  "mark-shipped": "Mark as shipped",
  "start-packing": "Start packing",
};

const transitionIcons: Record<
  OrderTransition,
  ComponentProps<typeof DashboardIcon>["name"]
> = {
  contact: "email-outline",
  "mark-fulfilled": "check-circle-outline",
  "mark-processing": "progress-wrench",
  "mark-ready": "package-variant-closed",
  "mark-shipped": "truck-delivery-outline",
  "start-packing": "package-variant",
};

/**
 * The row menu. Only transitions the order's own state allows are listed, and
 * fulfilment work is withheld from a role that cannot fulfil.
 *
 * These are demo transitions against local state — the menu labels say so via
 * the page's own notice rather than pretending to reach a backend.
 */
export function orderMenuItems({
  onTransition,
  onView,
  order,
  session,
}: {
  onTransition?: (order: WorkspaceOrder, transition: OrderTransition) => void;
  onView?: (order: WorkspaceOrder) => void;
  order: WorkspaceOrder;
  session?: MerchantSession;
}): DashboardMenuItem[] {
  const canFulfil = session ? can(session, "orders.fulfill") : true;

  return [
    {
      icon: "receipt-text-outline",
      key: "view",
      label: "View order",
      onPress: () => onView?.(order),
    },
    ...(order.status === "Cancelled"
      ? []
      : [
          {
            icon: "printer-outline" as const,
            key: "packing-slip",
            label: "Print packing slip",
          },
        ]),
    ...availableTransitions(order).map((transition) => ({
      disabled: transition !== "contact" && !canFulfil,
      icon: transitionIcons[transition],
      key: transition,
      label: transitionLabels[transition],
      onPress:
        transition === "contact" || canFulfil
          ? () => onTransition?.(order, transition)
          : undefined,
    })),
  ];
}

/** Compact summary tiles, laid out by the shared measured grid. */
function SummaryTiles({
  testID,
  tiles,
}: {
  testID: string;
  tiles: { key: string; label: string; tone: string; value: number }[];
}) {
  const grid = useResponsiveGrid({
    count: tiles.length,
    gap: ORDER_TILE_GAP,
    minItemWidth: ORDER_TILE_MIN_WIDTH,
  });

  return (
    <View onLayout={grid.onLayout} style={styles.tileGrid} testID={testID}>
      {tiles.map((tile) => (
        <View key={tile.key} style={[styles.tile, grid.itemStyle]}>
          <View style={styles.tileHeader}>
            <View style={[styles.tileDot, { backgroundColor: tile.tone }]} />
            <StylishText
              numberOfLines={1}
              style={styles.tileLabel}
              unstyled
              variant="caption"
            >
              {tile.label}
            </StylishText>
          </View>
          <StylishText style={styles.tileValue} unstyled variant="price">
            {formatCount(tile.value)}
          </StylishText>
        </View>
      ))}
    </View>
  );
}

function DemoNotice({ label }: { label: string }) {
  return (
    <View style={styles.notice}>
      <DashboardIcon
        color={colors.feedback.info}
        name="flask-outline"
        size={14}
      />
      <StylishText style={styles.noticeText} unstyled variant="caption">
        {label}
      </StylishText>
    </View>
  );
}

function OrderIdentity({ order }: { order: WorkspaceOrder }) {
  return (
    <View style={styles.identityCopy}>
      <StylishText
        numberOfLines={1}
        style={styles.orderNumber}
        unstyled
        variant="caption"
      >
        {order.orderNumber}
      </StylishText>
      <StylishText
        numberOfLines={1}
        style={styles.rowMeta}
        unstyled
        variant="caption"
      >
        {order.customer}
      </StylishText>
    </View>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <View style={styles.emptyRow}>
      <StylishText style={styles.emptyText} unstyled variant="caption">
        {label}
      </StylishText>
    </View>
  );
}

function DateRangeFields({
  onChange,
  prefix,
  values,
}: {
  onChange: (next: Partial<OrderFilters>) => void;
  prefix: string;
  values: OrderFilters;
}) {
  return (
    <>
      <SearchField
        accessibilityLabel="Orders from date"
        label="From (YYYY-MM-DD)"
        onChangeText={(value) =>
          onChange({ from: isIsoDate(value) ? value : undefined })
        }
        placeholder="2026-08-01"
        testID={`${prefix}-from`}
        value={values.from ?? ""}
      />
      <SearchField
        accessibilityLabel="Orders to date"
        label="To (YYYY-MM-DD)"
        onChangeText={(value) =>
          onChange({ to: isIsoDate(value) ? value : undefined })
        }
        placeholder="2026-08-31"
        testID={`${prefix}-to`}
        value={values.to ?? ""}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export function OrdersContent({
  compact,
  filters,
  onFiltersChange,
  onTransition,
  onViewOrder,
  orders,
  session,
}: {
  compact: boolean;
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  onTransition?: (order: WorkspaceOrder, transition: OrderTransition) => void;
  onViewOrder?: (order: WorkspaceOrder) => void;
  orders: readonly WorkspaceOrder[];
  session?: MerchantSession;
}) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<OrderSortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [tableWidth, setTableWidth] = useState(0);

  const counts = useMemo(() => orderStatusCounts(orders), [orders]);
  const sorted = useMemo(
    () => sortOrders(orders, sortKey, sortDirection),
    [orders, sortDirection, sortKey],
  );
  const { pageCount, rows, safePage } = paginate(
    sorted,
    page,
    ORDERS_PAGE_SIZE,
  );
  const dense = tableWidth > 0 && tableWidth < DENSE_TABLE_WIDTH;

  const setFilter = (next: Partial<OrderFilters>) => {
    setPage(1);
    onFiltersChange({ ...filters, ...next });
  };
  const sortBy = (key: OrderSortKey) => {
    setSortDirection((current) =>
      sortKey === key ? (current === "desc" ? "asc" : "desc") : "desc",
    );
    setSortKey(key);
  };
  const menu = (order: WorkspaceOrder) =>
    orderMenuItems({ onTransition, onView: onViewOrder, order, session });

  return (
    <>
      <DashboardCard testID="orders-summary">
        <SectionHeading
          description="Where every order in this workspace currently stands."
          title="Order pipeline"
        />
        <View style={styles.tileWrap}>
          <SummaryTiles
            testID="orders-tiles"
            tiles={ORDER_STATUSES.map((status) => ({
              key: status,
              label: status,
              tone: toneColour(statusTones[status]),
              value: counts[status],
            }))}
          />
        </View>
      </DashboardCard>

      <DashboardCard testID="orders-table-card">
        <SectionHeading
          action={
            <DashboardButton
              icon="download-outline"
              label="Export"
              testID="orders-export"
            />
          }
          description={`${orders.length} orders match your filters`}
          title="Orders"
        />
        <DemoNotice label="Status changes on this page update the demo data only — they are not sent anywhere yet." />

        <View style={styles.controls}>
          <SearchField
            accessibilityLabel="Search orders"
            label="Search orders"
            onChangeText={(query) => setFilter({ query })}
            placeholder="Order number, customer or email"
            testID="orders-search"
            value={filters.query}
          />
          <FilterSelect
            label="Order status"
            onChange={(next) =>
              setFilter({
                status: ORDER_STATUSES.find((status) => status === next),
              })
            }
            options={[ALL_ORDER_STATUSES, ...ORDER_STATUSES]}
            testID="orders-status-filter"
            value={filters.status ?? ALL_ORDER_STATUSES}
          />
          <FilterSelect
            label="Payment"
            onChange={(next) =>
              setFilter({
                payment: PAYMENT_STATUSES.find((status) => status === next),
              })
            }
            options={[ALL_PAYMENTS, ...PAYMENT_STATUSES]}
            testID="orders-payment-filter"
            value={filters.payment ?? ALL_PAYMENTS}
          />
          <FilterSelect
            label="Fulfilment"
            onChange={(next) =>
              setFilter({
                fulfillment: FULFILLMENT_STATUSES.find(
                  (status) => status === next,
                ),
              })
            }
            options={[ALL_FULFILLMENTS, ...FULFILLMENT_STATUSES]}
            testID="orders-fulfillment-filter"
            value={filters.fulfillment ?? ALL_FULFILLMENTS}
          />
          <DateRangeFields
            onChange={setFilter}
            prefix="orders"
            values={filters}
          />
        </View>

        {compact ? (
          <View style={styles.cards} testID="orders-body">
            {rows.map((order) => (
              <View
                key={order.orderNumber}
                style={styles.card}
                testID={`order-card-${order.orderNumber}`}
              >
                <View style={styles.cardHeading}>
                  <OrderIdentity order={order} />
                  <RowActionsButton
                    accessibilityLabel={`Actions for order ${order.orderNumber}`}
                    items={menu(order)}
                    menuLabel={`Order ${order.orderNumber} actions`}
                    testID={`order-card-actions-${order.orderNumber}`}
                  />
                </View>
                <View style={styles.cardChips}>
                  <StatusChip
                    label={order.status}
                    tone={statusTones[order.status]}
                  />
                  <StatusChip
                    label={order.payment}
                    tone={paymentTones[order.payment]}
                  />
                  <StatusChip
                    label={order.fulfillment}
                    tone={fulfillmentTones[order.fulfillment]}
                  />
                </View>
                <View style={styles.cardFooter}>
                  <StylishText
                    style={styles.cardMeta}
                    unstyled
                    variant="caption"
                  >
                    {formatOrderDate(order.date)} ·{" "}
                    {formatCount(orderItemCount(order))} items
                  </StylishText>
                  <StylishText style={styles.total} unstyled variant="caption">
                    {formatPeso(order.totalCentavos, { decimals: false })}
                  </StylishText>
                </View>
              </View>
            ))}
            {rows.length === 0 ? (
              <EmptyRow label="No orders match your filters." />
            ) : null}
          </View>
        ) : (
          <ScrollView
            className="st-scroll"
            contentContainerStyle={styles.tableContent}
            horizontal
            onLayout={(event) => setTableWidth(event.nativeEvent.layout.width)}
            showsHorizontalScrollIndicator
            style={styles.tableScroll}
          >
            <View
              accessibilityRole="list"
              style={[styles.table, { minWidth: dense ? 840 : 1000 }]}
            >
              <View style={[styles.tableRow, styles.tableHeader]}>
                <TableCell width={1.2}>
                  <TableText header value="Order" />
                </TableCell>
                <TableCell width={1.4}>
                  <TableText header value="Customer" />
                </TableCell>
                <SortHeaderCell
                  active={sortKey === "date"}
                  ascendingHint="oldest first"
                  descendingHint="newest first"
                  direction={sortDirection}
                  label="Date"
                  onPress={() => sortBy("date")}
                  testID="orders-sort-date"
                  width={1.1}
                />
                <TableCell width={0.6}>
                  <TableText header value="Items" />
                </TableCell>
                <SortHeaderCell
                  active={sortKey === "total"}
                  ascendingHint="lowest first"
                  descendingHint="highest first"
                  direction={sortDirection}
                  label="Total"
                  onPress={() => sortBy("total")}
                  testID="orders-sort-total"
                  width={1}
                />
                <TableCell width={1}>
                  <TableText header value="Payment" />
                </TableCell>
                {dense ? null : (
                  <TableCell width={1.1}>
                    <TableText header value="Fulfilment" />
                  </TableCell>
                )}
                <TableCell width={1.1}>
                  <TableText header value="Status" />
                </TableCell>
                <View style={styles.actionsSpacer} />
              </View>

              <View style={styles.tableBody} testID="orders-body">
                {rows.map((order) => (
                  <View
                    key={order.orderNumber}
                    style={styles.tableRow}
                    testID={`order-row-${order.orderNumber}`}
                  >
                    <TableCell width={1.2}>
                      <TableText strong value={order.orderNumber} />
                    </TableCell>
                    <TableCell width={1.4}>
                      <TableText value={order.customer} />
                    </TableCell>
                    <TableCell width={1.1}>
                      <TableText value={formatOrderDate(order.date)} />
                    </TableCell>
                    <TableCell width={0.6}>
                      <TableText
                        numeric
                        value={formatCount(orderItemCount(order))}
                      />
                    </TableCell>
                    <TableCell width={1}>
                      <TableText
                        numeric
                        strong
                        value={formatPeso(order.totalCentavos, {
                          decimals: false,
                        })}
                      />
                    </TableCell>
                    <TableCell width={1}>
                      <StatusChip
                        label={order.payment}
                        tone={paymentTones[order.payment]}
                      />
                    </TableCell>
                    {dense ? null : (
                      <TableCell width={1.1}>
                        <StatusChip
                          label={order.fulfillment}
                          tone={fulfillmentTones[order.fulfillment]}
                        />
                      </TableCell>
                    )}
                    <TableCell width={1.1}>
                      <StatusChip
                        label={order.status}
                        tone={statusTones[order.status]}
                      />
                    </TableCell>
                    <RowActionsButton
                      accessibilityLabel={`Actions for order ${order.orderNumber}`}
                      items={menu(order)}
                      menuLabel={`Order ${order.orderNumber} actions`}
                      testID={`order-actions-${order.orderNumber}`}
                    />
                  </View>
                ))}
                {rows.length === 0 ? (
                  <EmptyRow label="No orders match your filters." />
                ) : null}
              </View>
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
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Fulfillment                                                         */
/* ------------------------------------------------------------------ */

export function FulfillmentContent({
  compact,
  filters,
  locations,
  onFiltersChange,
  onTransition,
  onViewOrder,
  orders,
  session,
  shippingMethods,
}: {
  compact: boolean;
  filters: OrderFilters;
  locations: readonly DemoFulfillmentLocation[];
  onFiltersChange: (filters: OrderFilters) => void;
  onTransition?: (order: WorkspaceOrder, transition: OrderTransition) => void;
  onViewOrder?: (order: WorkspaceOrder) => void;
  orders: readonly WorkspaceOrder[];
  session?: MerchantSession;
  shippingMethods: readonly DemoShippingMethod[];
}) {
  const [page, setPage] = useState(1);
  const [tableWidth, setTableWidth] = useState(0);

  const counts = useMemo(() => fulfillmentCounts(orders), [orders]);
  const locationName = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name])),
    [locations],
  );
  const methodName = useMemo(
    () => new Map(shippingMethods.map((method) => [method.id, method.name])),
    [shippingMethods],
  );
  const { pageCount, rows, safePage } = paginate(
    orders,
    page,
    ORDERS_PAGE_SIZE,
  );
  const dense = tableWidth > 0 && tableWidth < DENSE_TABLE_WIDTH;

  const setFilter = (next: Partial<OrderFilters>) => {
    setPage(1);
    onFiltersChange({ ...filters, ...next });
  };
  const menu = (order: WorkspaceOrder) =>
    orderMenuItems({ onTransition, onView: onViewOrder, order, session });

  return (
    <>
      <DashboardCard testID="fulfillment-summary">
        <SectionHeading
          description={`${formatCount(counts.units)} units across the open queue.`}
          title="Fulfilment pipeline"
        />
        <View style={styles.tileWrap}>
          <SummaryTiles
            testID="fulfillment-tiles"
            tiles={[
              {
                key: "awaiting",
                label: "Awaiting fulfilment",
                tone: colors.brand.primary,
                value: counts.awaiting,
              },
              {
                key: "packing",
                label: "Packing",
                tone: colors.feedback.warning,
                value: counts.packing,
              },
              {
                key: "ready",
                label: "Ready to ship",
                tone: colors.feedback.rating,
                value: counts.readyToShip,
              },
              {
                key: "shipped",
                label: "Shipped",
                tone: colors.feedback.info,
                value: counts.shipped,
              },
              {
                key: "delivered",
                label: "Delivered",
                tone: colors.feedback.success,
                value: counts.delivered,
              },
            ]}
          />
        </View>
      </DashboardCard>

      <DashboardCard testID="fulfillment-queue-card">
        <SectionHeading
          description={`${orders.length} orders in the queue`}
          title="Fulfilment queue"
        />
        <DemoNotice label="Packing and shipping actions update the demo data only — they are not sent anywhere yet." />

        <View style={styles.controls}>
          <SearchField
            accessibilityLabel="Search fulfilment queue"
            label="Search queue"
            onChangeText={(query) => setFilter({ query })}
            placeholder="Order number or customer"
            testID="fulfillment-search"
            value={filters.query}
          />
          <FilterSelect
            label="Fulfilment"
            onChange={(next) =>
              setFilter({
                fulfillment: FULFILLMENT_STATUSES.find(
                  (status) => status === next,
                ),
              })
            }
            options={[ALL_FULFILLMENTS, ...FULFILLMENT_STATUSES]}
            testID="fulfillment-status-filter"
            value={filters.fulfillment ?? ALL_FULFILLMENTS}
          />
          <FilterSelect
            label="Location"
            onChange={(next) =>
              setFilter({
                locationId: locations.find((location) => location.name === next)
                  ?.id,
              })
            }
            options={[ALL_LOCATIONS, ...locations.map((l) => l.name)]}
            testID="fulfillment-location-filter"
            value={
              filters.locationId
                ? (locationName.get(filters.locationId) ?? ALL_LOCATIONS)
                : ALL_LOCATIONS
            }
          />
          <FilterSelect
            label="Shipping method"
            onChange={(next) =>
              setFilter({
                shippingMethodId: shippingMethods.find(
                  (method) => method.name === next,
                )?.id,
              })
            }
            options={[ALL_SHIPPING, ...shippingMethods.map((m) => m.name)]}
            testID="fulfillment-method-filter"
            value={
              filters.shippingMethodId
                ? (methodName.get(filters.shippingMethodId) ?? ALL_SHIPPING)
                : ALL_SHIPPING
            }
          />
          <DateRangeFields
            onChange={setFilter}
            prefix="fulfillment"
            values={filters}
          />
        </View>

        {compact ? (
          <View style={styles.cards} testID="fulfillment-body">
            {rows.map((order) => (
              <View
                key={order.orderNumber}
                style={styles.card}
                testID={`fulfillment-card-${order.orderNumber}`}
              >
                <View style={styles.cardHeading}>
                  <OrderIdentity order={order} />
                  <RowActionsButton
                    accessibilityLabel={`Actions for order ${order.orderNumber}`}
                    items={menu(order)}
                    menuLabel={`Order ${order.orderNumber} actions`}
                    testID={`fulfillment-card-actions-${order.orderNumber}`}
                  />
                </View>
                <View style={styles.cardChips}>
                  <StatusChip
                    label={order.fulfillment}
                    tone={fulfillmentTones[order.fulfillment]}
                  />
                  <StatusChip
                    label={order.status}
                    tone={statusTones[order.status]}
                  />
                </View>
                <StylishText
                  numberOfLines={2}
                  style={styles.cardMeta}
                  unstyled
                  variant="caption"
                >
                  {locationName.get(order.locationId) ?? "—"} ·{" "}
                  {methodName.get(order.shippingMethodId) ?? "—"} ·{" "}
                  {formatCount(orderItemCount(order))} items ·{" "}
                  {formatOrderDate(order.date)}
                </StylishText>
              </View>
            ))}
            {rows.length === 0 ? (
              <EmptyRow label="Nothing is waiting to be fulfilled." />
            ) : null}
          </View>
        ) : (
          <ScrollView
            className="st-scroll"
            contentContainerStyle={styles.tableContent}
            horizontal
            onLayout={(event) => setTableWidth(event.nativeEvent.layout.width)}
            showsHorizontalScrollIndicator
            style={styles.tableScroll}
          >
            <View
              accessibilityRole="list"
              style={[styles.table, { minWidth: dense ? 860 : 1040 }]}
            >
              <View style={[styles.tableRow, styles.tableHeader]}>
                <TableCell width={1.2}>
                  <TableText header value="Order" />
                </TableCell>
                <TableCell width={1.3}>
                  <TableText header value="Customer" />
                </TableCell>
                <TableCell width={0.6}>
                  <TableText header value="Items" />
                </TableCell>
                <TableCell width={1.3}>
                  <TableText header value="Location" />
                </TableCell>
                {dense ? null : (
                  <TableCell width={1.5}>
                    <TableText header value="Shipping method" />
                  </TableCell>
                )}
                <TableCell width={1.1}>
                  <TableText header value="Fulfilment" />
                </TableCell>
                {dense ? null : (
                  <TableCell width={1.1}>
                    <TableText header value="Order status" />
                  </TableCell>
                )}
                <TableCell width={1}>
                  <TableText header value="Placed" />
                </TableCell>
                <View style={styles.actionsSpacer} />
              </View>

              <View style={styles.tableBody} testID="fulfillment-body">
                {rows.map((order) => (
                  <View
                    key={order.orderNumber}
                    style={styles.tableRow}
                    testID={`fulfillment-row-${order.orderNumber}`}
                  >
                    <TableCell width={1.2}>
                      <TableText strong value={order.orderNumber} />
                    </TableCell>
                    <TableCell width={1.3}>
                      <TableText value={order.customer} />
                    </TableCell>
                    <TableCell width={0.6}>
                      <TableText
                        numeric
                        value={formatCount(orderItemCount(order))}
                      />
                    </TableCell>
                    <TableCell width={1.3}>
                      <TableText
                        value={locationName.get(order.locationId) ?? "—"}
                      />
                    </TableCell>
                    {dense ? null : (
                      <TableCell width={1.5}>
                        <TableText
                          value={methodName.get(order.shippingMethodId) ?? "—"}
                        />
                      </TableCell>
                    )}
                    <TableCell width={1.1}>
                      <StatusChip
                        label={order.fulfillment}
                        tone={fulfillmentTones[order.fulfillment]}
                      />
                    </TableCell>
                    {dense ? null : (
                      <TableCell width={1.1}>
                        <StatusChip
                          label={order.status}
                          tone={statusTones[order.status]}
                        />
                      </TableCell>
                    )}
                    <TableCell width={1}>
                      <TableText value={formatOrderDate(order.date)} />
                    </TableCell>
                    <RowActionsButton
                      accessibilityLabel={`Actions for order ${order.orderNumber}`}
                      items={menu(order)}
                      menuLabel={`Order ${order.orderNumber} actions`}
                      testID={`fulfillment-actions-${order.orderNumber}`}
                    />
                  </View>
                ))}
                {rows.length === 0 ? (
                  <EmptyRow label="Nothing is waiting to be fulfilled." />
                ) : null}
              </View>
            </View>
          </ScrollView>
        )}

        <TablePagination
          onChange={setPage}
          page={safePage}
          pageCount={pageCount}
          testIDPrefix="fulfillment"
        />
      </DashboardCard>
    </>
  );
}

/** Maps a chip tone onto the dot colour its tile uses. */
function toneColour(tone: ComponentProps<typeof StatusChip>["tone"]) {
  switch (tone) {
    case "green":
      return colors.feedback.success;
    case "warning":
      return colors.feedback.warning;
    case "danger":
      return colors.feedback.danger;
    case "blue":
      return colors.feedback.info;
    case "pink":
      return colors.brand.primary;
    default:
      return colors.neutral[400];
  }
}

export function OrdersEmptyState({ label }: { label: string }) {
  return <EmptyRow label={label} />;
}

const styles = StyleSheet.create({
  actionsSpacer: { flexBasis: 40, flexGrow: 0, flexShrink: 0 },
  card: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderStyle: "solid",
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  cardMeta: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 16,
  },
  cards: { gap: spacing.sm, paddingHorizontal: spacing.md },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  emptyRow: { paddingVertical: spacing.xl },
  emptyText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  // `flexBasis: 0` so the copy claims only leftover space: sized from its text
  // instead, a long customer name would push the columns out of line.
  identityCopy: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    gap: 1,
    minWidth: 0,
  },
  notice: {
    alignItems: "center",
    backgroundColor: colors.feedback.infoSoft,
    borderColor: colors.brand.blueSoft,
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  noticeText: {
    color: colors.feedback.info,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  orderNumber: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    lineHeight: 18,
  },
  rowMeta: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 15,
  },
  table: { flexGrow: 1, paddingHorizontal: spacing.lg },
  tableBody: { minHeight: ORDERS_PAGE_SIZE * 48 },
  tableContent: { flexGrow: 1 },
  tableHeader: { backgroundColor: colors.neutral[50] },
  tableRow: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  tableScroll: { flexGrow: 0 },
  tile: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    // Required alongside an all-sides `borderWidth`: on web these serialise to
    // the `border` shorthand, which resets the omitted style to `none`.
    borderStyle: "solid",
    borderWidth: 1,
    gap: spacing.xxs,
    padding: spacing.sm,
  },
  tileDot: {
    borderRadius: borderRadius.pill,
    flexShrink: 0,
    height: 8,
    width: 8,
  },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: ORDER_TILE_GAP },
  tileHeader: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  tileLabel: {
    color: colors.neutral[550],
    flexShrink: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  tileValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  tileWrap: { padding: spacing.lg },
  total: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    lineHeight: 20,
  },
});
