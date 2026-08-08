import { fireEvent, render } from "@testing-library/react-native";

import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import { resolveOrdersSection } from "@/features/merchant-dashboard/merchant-navigation";
import {
  demoLocations,
  demoOrders,
  demoShippingMethods,
  loadOrdersWorkspace,
  orderBadgeCounts,
  orderItemCount,
  type WorkspaceOrder,
} from "@/features/merchant-dashboard/orders-demo-data";
import {
  FulfillmentContent,
  OrdersContent,
  orderMenuItems,
} from "@/features/merchant-dashboard/orders-sections";
import {
  applyTransition,
  availableTransitions,
  emptyOrderFilters,
  filterOrders,
  fulfillmentCounts,
  fulfillmentQueue,
  isIsoDate,
  orderStatusCounts,
  paginate,
  sortOrders,
} from "@/features/merchant-dashboard/use-orders-workspace";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

function sessionFor(role: MerchantSession["role"]): MerchantSession {
  return {
    defaultLocation: "Makati Warehouse",
    displayName: "Althea",
    email: "althea@example.com",
    merchantHandle: "merchant:m1",
    merchantId: "m1",
    merchantName: "Lumière",
    permissions: rolePermissions[role],
    role,
    storeStatus: "active",
    verified: true,
  };
}

const owner = sessionFor("Merchant Owner");
const supportStaff = sessionFor("Support Staff");
const order = (overrides: Partial<WorkspaceOrder> = {}): WorkspaceOrder => ({
  ...demoOrders[0],
  ...overrides,
});

describe("resolveOrdersSection", () => {
  it("resolves Orders and Fulfillment and nothing else", () => {
    expect(resolveOrdersSection("orders")).toBe("orders");
    expect(resolveOrdersSection("fulfillment")).toBe("fulfillment");
    expect(resolveOrdersSection("overview")).toBeUndefined();
    expect(resolveOrdersSection(undefined)).toBeUndefined();
    expect(resolveOrdersSection(" Orders ")).toBe("orders");
  });
});

describe("demo data", () => {
  it("totals every order from its own line items", () => {
    for (const row of demoOrders) {
      const summed = row.items.reduce(
        (running, item) => running + item.unitPriceCentavos * item.quantity,
        0,
      );
      expect(row.totalCentavos).toBe(summed);
    }
  });

  it("covers every status, payment and fulfilment state", () => {
    const statuses = new Set(demoOrders.map((row) => row.status));
    const payments = new Set(demoOrders.map((row) => row.payment));
    const fulfilments = new Set(demoOrders.map((row) => row.fulfillment));

    expect(statuses.size).toBeGreaterThanOrEqual(6);
    expect(payments.size).toBe(4);
    expect(fulfilments.size).toBe(4);
    // More than one page, so pagination is exercised.
    expect(demoOrders.length).toBeGreaterThan(8);
  });

  it("references only locations and shipping methods it defines", () => {
    const locationIds = new Set(demoLocations.map((l) => l.id));
    const methodIds = new Set(demoShippingMethods.map((m) => m.id));

    for (const row of demoOrders) {
      expect(locationIds.has(row.locationId)).toBe(true);
      expect(methodIds.has(row.shippingMethodId)).toBe(true);
    }
  });

  it("exposes a loader shaped like the API that will replace it", async () => {
    const snapshot = await loadOrdersWorkspace();

    expect(snapshot.orders).toHaveLength(demoOrders.length);
    expect(snapshot.locations).toHaveLength(demoLocations.length);
    expect(snapshot.shippingMethods).toHaveLength(demoShippingMethods.length);
  });

  it("derives the sidebar badge counts from the rows themselves", () => {
    const counts = orderBadgeCounts(demoOrders);

    expect(counts.orders).toBe(
      demoOrders.filter((row) =>
        ["New", "Confirmed", "Processing", "Ready to Ship"].includes(
          row.status,
        ),
      ).length,
    );
    // Cancelled orders have nothing left to fulfil.
    expect(counts.fulfillment).toBe(
      demoOrders.filter(
        (row) =>
          row.status !== "Cancelled" &&
          (row.fulfillment === "Unfulfilled" || row.fulfillment === "Packing"),
      ).length,
    );
  });
});

describe("filterOrders", () => {
  it("matches order number, customer and email", () => {
    const target = demoOrders[0];
    for (const needle of [
      target.orderNumber,
      target.customer.toUpperCase(),
      target.customerEmail,
    ]) {
      expect(
        filterOrders(demoOrders, { ...emptyOrderFilters, query: needle }),
      ).toContainEqual(target);
    }
  });

  it("combines every filter", () => {
    const filtered = filterOrders(demoOrders, {
      ...emptyOrderFilters,
      payment: "Paid",
      status: "Delivered",
    });

    expect(filtered.length).toBeGreaterThan(0);
    for (const row of filtered) {
      expect(row.status).toBe("Delivered");
      expect(row.payment).toBe("Paid");
    }
  });

  it("bounds an inclusive date range", () => {
    const filtered = filterOrders(demoOrders, {
      ...emptyOrderFilters,
      from: "2026-08-05",
      to: "2026-08-06",
    });

    expect(filtered.length).toBeGreaterThan(0);
    for (const row of filtered) {
      expect(row.date >= "2026-08-05").toBe(true);
      expect(row.date <= "2026-08-06").toBe(true);
    }
  });

  it("returns nothing rather than everything when no row matches", () => {
    expect(
      filterOrders(demoOrders, { ...emptyOrderFilters, query: "no-such" }),
    ).toEqual([]);
  });
});

describe("sortOrders", () => {
  it("orders by total in both directions", () => {
    const ascending = sortOrders(demoOrders, "total", "asc");
    const descending = sortOrders(demoOrders, "total", "desc");

    expect(ascending[0].totalCentavos).toBeLessThanOrEqual(
      ascending[ascending.length - 1].totalCentavos,
    );
    expect(descending[0].totalCentavos).toBe(
      ascending[ascending.length - 1].totalCentavos,
    );
  });

  it("breaks ties on the order number so equal rows never jitter", () => {
    const tied = [
      order({ date: "2026-08-01", orderNumber: "ZZZ-2" }),
      order({ date: "2026-08-01", orderNumber: "AAA-1" }),
    ];

    expect(sortOrders(tied, "date", "desc").map((r) => r.orderNumber)).toEqual([
      "AAA-1",
      "ZZZ-2",
    ]);
  });

  it("does not mutate the array it was given", () => {
    const original = [...demoOrders];
    sortOrders(demoOrders, "date", "asc");
    expect(demoOrders).toEqual(original);
  });
});

describe("paginate", () => {
  it("clamps a page past the end back onto the last one", () => {
    const { pageCount, rows, safePage } = paginate(demoOrders, 99, 8);

    expect(safePage).toBe(pageCount);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(8);
  });
});

describe("fulfillmentQueue", () => {
  it("drops cancelled orders, which have nothing to pack", () => {
    const queue = fulfillmentQueue(demoOrders);

    expect(queue.every((row) => row.status !== "Cancelled")).toBe(true);
    expect(queue.length).toBeLessThan(demoOrders.length);
  });

  it("counts units from the line items, not the row count", () => {
    const counts = fulfillmentCounts(demoOrders);
    const expected = fulfillmentQueue(demoOrders).reduce(
      (running, row) => running + orderItemCount(row),
      0,
    );

    expect(counts.units).toBe(expected);
    expect(counts.units).toBeGreaterThan(fulfillmentQueue(demoOrders).length);
  });
});

describe("orderStatusCounts", () => {
  it("accounts for every row exactly once", () => {
    const counts = orderStatusCounts(demoOrders);
    const total = Object.values(counts).reduce(
      (running, value) => running + value,
      0,
    );
    expect(total).toBe(demoOrders.length);
  });
});

describe("transitions", () => {
  it("moves a new order into processing and packing together", () => {
    const next = applyTransition(
      order({ fulfillment: "Unfulfilled", status: "New" }),
      "mark-processing",
    );

    expect(next.status).toBe("Processing");
    expect(next.fulfillment).toBe("Packing");
  });

  it("marks shipped and delivered across both fields", () => {
    expect(applyTransition(order(), "mark-shipped")).toMatchObject({
      fulfillment: "Shipped",
      status: "Shipped",
    });
    expect(applyTransition(order(), "mark-fulfilled")).toMatchObject({
      fulfillment: "Delivered",
      status: "Delivered",
    });
  });

  it("leaves a cancelled order with nothing but contact", () => {
    expect(availableTransitions(order({ status: "Cancelled" }))).toEqual([
      "contact",
    ]);
  });

  it("offers packing only once an order has left New", () => {
    expect(
      availableTransitions(
        order({ fulfillment: "Unfulfilled", status: "New" }),
      ),
    ).not.toContain("start-packing");
    expect(
      availableTransitions(
        order({ fulfillment: "Unfulfilled", status: "Ready to Ship" }),
      ),
    ).toContain("start-packing");
  });

  it("never mutates the order it was given", () => {
    const source = order({ status: "New" });
    const snapshot = { ...source };
    applyTransition(source, "mark-shipped");
    expect(source).toEqual(snapshot);
  });
});

describe("orderMenuItems", () => {
  it("withholds fulfilment work from a role that cannot fulfil", () => {
    expect(supportStaff.permissions).not.toContain("orders.fulfill");

    const items = orderMenuItems({
      order: order({ fulfillment: "Packing", status: "Processing" }),
      session: supportStaff,
    });
    const shipped = items.find((item) => item.key === "mark-shipped");

    expect(shipped?.disabled).toBe(true);
    // Contacting a customer is not fulfilment work.
    expect(items.find((item) => item.key === "contact")?.disabled).toBe(false);
  });

  it("enables the transitions an owner may run", () => {
    const items = orderMenuItems({
      order: order({ fulfillment: "Packing", status: "Processing" }),
      session: owner,
    });

    expect(items.find((item) => item.key === "mark-shipped")?.disabled).toBe(
      false,
    );
  });
});

describe("isIsoDate", () => {
  it("only accepts a complete calendar date", () => {
    expect(isIsoDate("2026-08-01")).toBe(true);
    expect(isIsoDate("2026-08")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("OrdersContent", () => {
  const renderOrders = (overrides: Record<string, unknown> = {}) =>
    render(
      <OrdersContent
        compact={false}
        filters={emptyOrderFilters}
        onFiltersChange={jest.fn()}
        orders={demoOrders}
        session={owner}
        {...overrides}
      />,
    );

  it("renders a page of rows with the summary tiles", () => {
    const screen = renderOrders();

    expect(screen.getByTestId("orders-tiles")).toBeTruthy();
    expect(
      screen.getByTestId(`order-row-${demoOrders[0].orderNumber}`),
    ).toBeTruthy();
    expect(
      screen.getByText(`${demoOrders.length} orders match your filters`),
    ).toBeTruthy();
  });

  it("says plainly that the transitions are demo-only", () => {
    expect(renderOrders().getByText(/update the demo data only/)).toBeTruthy();
  });

  it("reports a filter change up rather than filtering locally", () => {
    const onFiltersChange = jest.fn();
    const screen = renderOrders({ onFiltersChange });

    fireEvent.changeText(screen.getByLabelText("Search orders"), "maria");

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ query: "maria" }),
    );
  });

  it("toggles a column's sort rather than only decorating the header", () => {
    const screen = renderOrders();
    const total = screen.getByTestId("orders-sort-total");

    expect(total.props.accessibilityState.selected).toBe(false);
    fireEvent.press(total);
    expect(
      screen.getByTestId("orders-sort-total").props.accessibilityState.selected,
    ).toBe(true);
  });

  it("stacks cards instead of the table when compact", () => {
    const screen = renderOrders({ compact: true });

    expect(
      screen.getByTestId(`order-card-${demoOrders[0].orderNumber}`),
    ).toBeTruthy();
    expect(screen.queryByTestId("orders-sort-total")).toBeNull();
  });

  it("shows the no-match message rather than an empty table", () => {
    expect(
      renderOrders({ orders: [] }).getByText("No orders match your filters."),
    ).toBeTruthy();
  });
});

describe("FulfillmentContent", () => {
  const queue = fulfillmentQueue(demoOrders);
  const renderQueue = (overrides: Record<string, unknown> = {}) =>
    render(
      <FulfillmentContent
        compact={false}
        filters={emptyOrderFilters}
        locations={demoLocations}
        onFiltersChange={jest.fn()}
        orders={queue}
        session={owner}
        shippingMethods={demoShippingMethods}
        {...overrides}
      />,
    );

  it("renders the queue with its own summary tiles", () => {
    const screen = renderQueue();

    expect(screen.getByTestId("fulfillment-tiles")).toBeTruthy();
    expect(
      screen.getByTestId(`fulfillment-row-${queue[0].orderNumber}`),
    ).toBeTruthy();
  });

  it("resolves location and shipping method names from the fixtures", () => {
    const screen = renderQueue();

    expect(screen.getAllByText("Makati Warehouse").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Standard (3-5 days)").length).toBeGreaterThan(
      0,
    );
  });

  it("stacks cards instead of the table when compact", () => {
    const screen = renderQueue({ compact: true });

    expect(
      screen.getByTestId(`fulfillment-card-${queue[0].orderNumber}`),
    ).toBeTruthy();
  });
});
