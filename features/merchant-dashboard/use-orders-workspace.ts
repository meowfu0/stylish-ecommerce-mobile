import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resolveDashboardDataState } from "@/features/merchant-dashboard/dashboard-state-model";
import type {
  DashboardDataState,
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  loadOrdersWorkspace,
  type OrdersWorkspaceSnapshot,
  orderItemCount,
  type WorkspaceOrder,
} from "@/features/merchant-dashboard/orders-demo-data";

/**
 * Filtering, sorting, paging and the demo status transitions for both the
 * Orders and Fulfillment workspaces.
 *
 * Every filter and sort here runs client-side against the loaded snapshot,
 * which is exactly what a fixture allows. When the orders API arrives, the pure
 * functions below become the server's query parameters and this hook keeps its
 * shape — no component above it changes.
 */

export const ALL_ORDER_STATUSES = "All statuses";
export const ALL_PAYMENTS = "All payments";
export const ALL_FULFILLMENTS = "All fulfilment";
export const ALL_LOCATIONS = "All locations";
export const ALL_SHIPPING = "All methods";

export const ORDERS_PAGE_SIZE = 8;

export type OrderFilters = {
  fulfillment?: FulfillmentStatus;
  from?: string;
  locationId?: string;
  payment?: PaymentStatus;
  query: string;
  shippingMethodId?: string;
  status?: OrderStatus;
  to?: string;
};

export const emptyOrderFilters: OrderFilters = { query: "" };

export type OrderSortKey = "date" | "total";

/** Only a complete date filters; a half-typed one must not hide every row. */
export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

export function filterOrders(
  orders: readonly WorkspaceOrder[],
  filters: OrderFilters,
) {
  const needle = filters.query.trim().toLowerCase();

  return orders.filter((order) => {
    if (filters.status && order.status !== filters.status) return false;
    if (filters.payment && order.payment !== filters.payment) return false;
    if (filters.fulfillment && order.fulfillment !== filters.fulfillment) {
      return false;
    }
    if (filters.locationId && order.locationId !== filters.locationId) {
      return false;
    }
    if (
      filters.shippingMethodId &&
      order.shippingMethodId !== filters.shippingMethodId
    ) {
      return false;
    }
    if (filters.from && order.date < filters.from) return false;
    if (filters.to && order.date > filters.to) return false;
    if (!needle) return true;
    return (
      order.orderNumber.toLowerCase().includes(needle) ||
      order.customer.toLowerCase().includes(needle) ||
      order.customerEmail.toLowerCase().includes(needle)
    );
  });
}

/** Ties break on the order number, so equal rows never jitter between renders. */
export function sortOrders(
  orders: readonly WorkspaceOrder[],
  key: OrderSortKey,
  direction: "asc" | "desc",
) {
  const sign = direction === "desc" ? -1 : 1;

  return [...orders].sort((left, right) => {
    const compared =
      key === "total"
        ? left.totalCentavos - right.totalCentavos
        : left.date.localeCompare(right.date);
    if (compared !== 0) return compared * sign;
    return left.orderNumber.localeCompare(right.orderNumber);
  });
}

export function paginate<Row>(
  rows: readonly Row[],
  page: number,
  pageSize: number,
) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  return {
    pageCount,
    rows: rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    safePage,
  };
}

/** The counts behind the Orders summary tiles. */
export function orderStatusCounts(orders: readonly WorkspaceOrder[]) {
  const counts: Record<OrderStatus, number> = {
    Cancelled: 0,
    Confirmed: 0,
    Delivered: 0,
    New: 0,
    Processing: 0,
    "Ready to Ship": 0,
    Shipped: 0,
  };
  for (const order of orders) counts[order.status] += 1;
  return counts;
}

/**
 * The Fulfillment queue's own view of the same rows: cancelled orders have
 * nothing to pack, so they never enter the queue.
 */
export function fulfillmentQueue(orders: readonly WorkspaceOrder[]) {
  return orders.filter((order) => order.status !== "Cancelled");
}

export function fulfillmentCounts(orders: readonly WorkspaceOrder[]) {
  const queue = fulfillmentQueue(orders);
  return {
    awaiting: queue.filter((order) => order.fulfillment === "Unfulfilled")
      .length,
    delivered: queue.filter((order) => order.fulfillment === "Delivered")
      .length,
    packing: queue.filter((order) => order.fulfillment === "Packing").length,
    readyToShip: queue.filter((order) => order.status === "Ready to Ship")
      .length,
    shipped: queue.filter((order) => order.fulfillment === "Shipped").length,
    units: queue.reduce((running, order) => running + orderItemCount(order), 0),
  };
}

/**
 * The demo transitions the action menus offer.
 *
 * They move a row through the same vocabulary the dashboard already models, so
 * the visual result is faithful — but they are local state only. Nothing here
 * calls a backend, and the menus say so.
 */
export type OrderTransition =
  | "contact"
  | "mark-fulfilled"
  | "mark-processing"
  | "mark-ready"
  | "mark-shipped"
  | "start-packing";

export function applyTransition(
  order: WorkspaceOrder,
  transition: OrderTransition,
): WorkspaceOrder {
  switch (transition) {
    case "mark-processing":
      return { ...order, fulfillment: "Packing", status: "Processing" };
    case "start-packing":
      return { ...order, fulfillment: "Packing" };
    case "mark-ready":
      return { ...order, status: "Ready to Ship" };
    case "mark-shipped":
      return { ...order, fulfillment: "Shipped", status: "Shipped" };
    case "mark-fulfilled":
      return { ...order, fulfillment: "Delivered", status: "Delivered" };
    default:
      return order;
  }
}

/** Which transitions a row's current state allows, mirroring the order lifecycle. */
export function availableTransitions(order: WorkspaceOrder): OrderTransition[] {
  if (order.status === "Cancelled") return ["contact"];

  const available: OrderTransition[] = [];
  if (order.status === "New" || order.status === "Confirmed") {
    available.push("mark-processing");
  }
  if (order.fulfillment === "Unfulfilled" && order.status !== "New") {
    available.push("start-packing");
  }
  if (order.fulfillment === "Packing") available.push("mark-ready");
  if (order.status === "Ready to Ship" || order.fulfillment === "Packing") {
    available.push("mark-shipped");
  }
  if (order.fulfillment === "Shipped") available.push("mark-fulfilled");
  available.push("contact");
  return available;
}

export type OrdersWorkspace = {
  dataState: DashboardDataState;
  locations: OrdersWorkspaceSnapshot["locations"];
  orders: WorkspaceOrder[];
  refresh: () => void;
  retry: () => void;
  shippingMethods: OrdersWorkspaceSnapshot["shippingMethods"];
  /** Applies a demo transition in local state and reports what changed. */
  transition: (orderNumber: string, transition: OrderTransition) => void;
};

export function useOrdersWorkspace({
  enabled,
  load = loadOrdersWorkspace,
}: {
  enabled: boolean;
  /** Injected by tests and by the loading/error previews. */
  load?: () => Promise<OrdersWorkspaceSnapshot>;
}): OrdersWorkspace {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<OrdersWorkspaceSnapshot | null>(
    null,
  );
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setFailed(false);
        setSnapshot(result);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, enabled]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  const transition = useCallback(
    (orderNumber: string, next: OrderTransition) => {
      setSnapshot((current) =>
        current
          ? {
              ...current,
              orders: current.orders.map((order) =>
                order.orderNumber === orderNumber
                  ? applyTransition(order, next)
                  : order,
              ),
            }
          : current,
      );
    },
    [],
  );

  return useMemo(
    () => ({
      dataState: resolveDashboardDataState({
        failedSectionCount: failed ? 1 : 0,
        hasCatalog: (snapshot?.orders.length ?? 0) > 0,
        hasSnapshot: snapshot !== null,
        loading,
        sectionCount: 1,
      }),
      locations: snapshot?.locations ?? [],
      orders: snapshot?.orders ?? [],
      refresh: reload,
      retry: reload,
      shippingMethods: snapshot?.shippingMethods ?? [],
      transition,
    }),
    [failed, loading, reload, snapshot, transition],
  );
}
