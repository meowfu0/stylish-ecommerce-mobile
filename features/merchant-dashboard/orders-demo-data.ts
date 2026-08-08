import type {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
} from "@/features/merchant-dashboard/dashboard-types";

/**
 * Demo data for the Orders and Fulfillment workspaces.
 *
 * This file is the only place either page gets its rows from, and it exists
 * purely so the screens can be visualised before the orders API lands. It is
 * shaped like a paged API response on purpose: `loadOrdersWorkspace` has the
 * same signature a real loader would, so swapping it for `apiRequest` later is a
 * one-file change and no component has to be redesigned.
 *
 * Nothing here is imported by a production data path — the overview's Recent
 * Orders card keeps its own fixture, and neither page reads scattered literals.
 */

/** A location a merchant fulfils from. Names only; there is no locations API yet. */
export type DemoFulfillmentLocation = {
  id: string;
  name: string;
};

export type DemoShippingMethod = {
  carrier: string;
  id: string;
  name: string;
};

/**
 * One order row. It extends the dashboard's existing `RecentOrder` vocabulary —
 * the same `OrderStatus`, `PaymentStatus` and `FulfillmentStatus` unions the
 * Recent Orders table already uses — with the fields the Fulfillment queue needs.
 */
export type WorkspaceOrder = {
  customer: string;
  customerEmail: string;
  /** ISO date the order was placed; both tables sort on it exactly. */
  date: string;
  fulfillment: FulfillmentStatus;
  items: WorkspaceOrderItem[];
  locationId: string;
  orderNumber: string;
  payment: PaymentStatus;
  shippingMethodId: string;
  status: OrderStatus;
  /** Money stays in centavos, like every other figure on the dashboard. */
  totalCentavos: number;
  trackingNumber: string | null;
};

export type WorkspaceOrderItem = {
  name: string;
  quantity: number;
  sku: string;
  unitPriceCentavos: number;
};

export const demoLocations: DemoFulfillmentLocation[] = [
  { id: "loc-makati", name: "Makati Warehouse" },
  { id: "loc-cebu", name: "Cebu Hub" },
  { id: "loc-davao", name: "Davao Pop-up" },
];

export const demoShippingMethods: DemoShippingMethod[] = [
  { carrier: "LBC Express", id: "ship-standard", name: "Standard (3-5 days)" },
  { carrier: "LBC Express", id: "ship-express", name: "Express (1-2 days)" },
  { carrier: "Lalamove", id: "ship-sameday", name: "Same-day Metro Manila" },
  { carrier: "Velori Pickup", id: "ship-pickup", name: "Store pickup" },
];

const catalogue: Omit<WorkspaceOrderItem, "quantity">[] = [
  {
    name: "Amihan Linen Wrap Dress",
    sku: "LUM-DRS-016",
    unitPriceCentavos: 349_000,
  },
  {
    name: "Sampaguita Silk Blouse",
    sku: "LUM-TOP-071",
    unitPriceCentavos: 258_000,
  },
  { name: "Habi Weave Tote", sku: "LUM-BAG-032", unitPriceCentavos: 189_000 },
  {
    name: "Baybayin Knit Cardigan",
    sku: "LUM-KNT-008",
    unitPriceCentavos: 298_000,
  },
  { name: "Tala Slip Skirt", sku: "LUM-SKT-045", unitPriceCentavos: 165_000 },
  {
    name: "Marikit Tailored Blazer",
    sku: "LUM-OUT-023",
    unitPriceCentavos: 489_000,
  },
  {
    name: "Liwayway Wide-Leg Trouser",
    sku: "LUM-BOT-054",
    unitPriceCentavos: 232_000,
  },
  {
    name: "Panganay Heritage Scarf",
    sku: "LUM-ACC-067",
    unitPriceCentavos: 126_000,
  },
];

function lineItems(
  indexes: number[],
  quantities: number[],
): WorkspaceOrderItem[] {
  return indexes.map((catalogueIndex, position) => ({
    ...catalogue[catalogueIndex % catalogue.length],
    quantity: quantities[position] ?? 1,
  }));
}

/** Totals are summed from the line items so a row can never contradict itself. */
function totalOf(items: WorkspaceOrderItem[]) {
  return items.reduce(
    (running, item) => running + item.unitPriceCentavos * item.quantity,
    0,
  );
}

type OrderSeed = {
  customer: string;
  customerEmail: string;
  date: string;
  fulfillment: FulfillmentStatus;
  itemIndexes: number[];
  locationId: string;
  orderNumber: string;
  payment: PaymentStatus;
  quantities: number[];
  shippingMethodId: string;
  status: OrderStatus;
  trackingNumber?: string;
};

/**
 * Twenty-two orders spanning every status, payment state, fulfilment state,
 * location and shipping method, over three weeks of dates — enough to exercise
 * the filters, both sorts, and more than one page at either page size.
 */
const seeds: OrderSeed[] = [
  {
    customer: "Maria Santos",
    customerEmail: "maria.santos@example.com",
    date: "2026-08-08",
    fulfillment: "Unfulfilled",
    itemIndexes: [0, 4],
    locationId: "loc-makati",
    orderNumber: "LUM-24831",
    payment: "Paid",
    quantities: [1, 2],
    shippingMethodId: "ship-express",
    status: "New",
  },
  {
    customer: "Jonas Reyes",
    customerEmail: "jonas.reyes@example.com",
    date: "2026-08-08",
    fulfillment: "Unfulfilled",
    itemIndexes: [2],
    locationId: "loc-makati",
    orderNumber: "LUM-24830",
    payment: "Pending",
    quantities: [1],
    shippingMethodId: "ship-standard",
    status: "New",
  },
  {
    customer: "Althea Cruz",
    customerEmail: "althea.cruz@example.com",
    date: "2026-08-07",
    fulfillment: "Packing",
    itemIndexes: [1, 3, 7],
    locationId: "loc-cebu",
    orderNumber: "LUM-24829",
    payment: "Paid",
    quantities: [2, 1, 1],
    shippingMethodId: "ship-standard",
    status: "Processing",
  },
  {
    customer: "Rafael Mendoza",
    customerEmail: "rafael.mendoza@example.com",
    date: "2026-08-07",
    fulfillment: "Packing",
    itemIndexes: [5],
    locationId: "loc-makati",
    orderNumber: "LUM-24828",
    payment: "Paid",
    quantities: [1],
    shippingMethodId: "ship-sameday",
    status: "Processing",
  },
  {
    customer: "Bea Villanueva",
    customerEmail: "bea.villanueva@example.com",
    date: "2026-08-06",
    fulfillment: "Packing",
    itemIndexes: [6, 0],
    locationId: "loc-davao",
    orderNumber: "LUM-24827",
    payment: "Paid",
    quantities: [1, 1],
    shippingMethodId: "ship-standard",
    status: "Confirmed",
  },
  {
    customer: "Miguel Torres",
    customerEmail: "miguel.torres@example.com",
    date: "2026-08-06",
    fulfillment: "Shipped",
    itemIndexes: [3],
    locationId: "loc-makati",
    orderNumber: "LUM-24826",
    payment: "Paid",
    quantities: [3],
    shippingMethodId: "ship-express",
    status: "Ready to Ship",
    trackingNumber: "LBC-8827-4419",
  },
  {
    customer: "Kristine Lim",
    customerEmail: "kristine.lim@example.com",
    date: "2026-08-05",
    fulfillment: "Shipped",
    itemIndexes: [2, 7],
    locationId: "loc-cebu",
    orderNumber: "LUM-24825",
    payment: "Paid",
    quantities: [1, 2],
    shippingMethodId: "ship-standard",
    status: "Shipped",
    trackingNumber: "LBC-8827-4402",
  },
  {
    customer: "Paolo Aquino",
    customerEmail: "paolo.aquino@example.com",
    date: "2026-08-05",
    fulfillment: "Shipped",
    itemIndexes: [4],
    locationId: "loc-makati",
    orderNumber: "LUM-24824",
    payment: "Paid",
    quantities: [1],
    shippingMethodId: "ship-sameday",
    status: "Shipped",
    trackingNumber: "LAL-2261-7730",
  },
  {
    customer: "Danica Ocampo",
    customerEmail: "danica.ocampo@example.com",
    date: "2026-08-04",
    fulfillment: "Delivered",
    itemIndexes: [0, 1],
    locationId: "loc-makati",
    orderNumber: "LUM-24823",
    payment: "Paid",
    quantities: [1, 1],
    shippingMethodId: "ship-standard",
    status: "Delivered",
    trackingNumber: "LBC-8827-4388",
  },
  {
    customer: "Enrico Bautista",
    customerEmail: "enrico.bautista@example.com",
    date: "2026-08-04",
    fulfillment: "Delivered",
    itemIndexes: [6],
    locationId: "loc-davao",
    orderNumber: "LUM-24822",
    payment: "Paid",
    quantities: [2],
    shippingMethodId: "ship-pickup",
    status: "Delivered",
  },
  {
    customer: "Sofia Ramos",
    customerEmail: "sofia.ramos@example.com",
    date: "2026-08-03",
    fulfillment: "Unfulfilled",
    itemIndexes: [5, 2],
    locationId: "loc-cebu",
    orderNumber: "LUM-24821",
    payment: "Refunded",
    quantities: [1, 1],
    shippingMethodId: "ship-standard",
    status: "Cancelled",
  },
  {
    customer: "Nathan Dela Cruz",
    customerEmail: "nathan.delacruz@example.com",
    date: "2026-08-03",
    fulfillment: "Unfulfilled",
    itemIndexes: [7],
    locationId: "loc-makati",
    orderNumber: "LUM-24820",
    payment: "Failed",
    quantities: [1],
    shippingMethodId: "ship-express",
    status: "Cancelled",
  },
  {
    customer: "Camille Navarro",
    customerEmail: "camille.navarro@example.com",
    date: "2026-08-02",
    fulfillment: "Delivered",
    itemIndexes: [1, 4, 6],
    locationId: "loc-makati",
    orderNumber: "LUM-24819",
    payment: "Paid",
    quantities: [1, 1, 1],
    shippingMethodId: "ship-standard",
    status: "Delivered",
    trackingNumber: "LBC-8827-4351",
  },
  {
    customer: "Gabriel Ilagan",
    customerEmail: "gabriel.ilagan@example.com",
    date: "2026-08-02",
    fulfillment: "Packing",
    itemIndexes: [3, 5],
    locationId: "loc-cebu",
    orderNumber: "LUM-24818",
    payment: "Paid",
    quantities: [1, 1],
    shippingMethodId: "ship-express",
    status: "Processing",
  },
  {
    customer: "Trisha Gonzales",
    customerEmail: "trisha.gonzales@example.com",
    date: "2026-08-01",
    fulfillment: "Unfulfilled",
    itemIndexes: [0],
    locationId: "loc-makati",
    orderNumber: "LUM-24817",
    payment: "Paid",
    quantities: [3],
    shippingMethodId: "ship-standard",
    status: "Ready to Ship",
  },
  {
    customer: "Iñigo Salazar",
    customerEmail: "inigo.salazar@example.com",
    date: "2026-08-01",
    fulfillment: "Shipped",
    itemIndexes: [2, 3],
    locationId: "loc-davao",
    orderNumber: "LUM-24816",
    payment: "Paid",
    quantities: [1, 2],
    shippingMethodId: "ship-standard",
    status: "Shipped",
    trackingNumber: "LBC-8827-4302",
  },
  {
    customer: "Andrea Pascual",
    customerEmail: "andrea.pascual@example.com",
    date: "2026-07-31",
    fulfillment: "Delivered",
    itemIndexes: [7, 1],
    locationId: "loc-makati",
    orderNumber: "LUM-24815",
    payment: "Paid",
    quantities: [1, 1],
    shippingMethodId: "ship-sameday",
    status: "Delivered",
    trackingNumber: "LAL-2261-7688",
  },
  {
    customer: "Victor Aguilar",
    customerEmail: "victor.aguilar@example.com",
    date: "2026-07-30",
    fulfillment: "Unfulfilled",
    itemIndexes: [4, 6],
    locationId: "loc-cebu",
    orderNumber: "LUM-24814",
    payment: "Pending",
    quantities: [2, 1],
    shippingMethodId: "ship-standard",
    status: "Confirmed",
  },
  {
    customer: "Patricia Yap",
    customerEmail: "patricia.yap@example.com",
    date: "2026-07-29",
    fulfillment: "Delivered",
    itemIndexes: [5],
    locationId: "loc-makati",
    orderNumber: "LUM-24813",
    payment: "Paid",
    quantities: [1],
    shippingMethodId: "ship-express",
    status: "Delivered",
    trackingNumber: "LBC-8827-4255",
  },
  {
    customer: "Marco Bautista",
    customerEmail: "marco.bautista@example.com",
    date: "2026-07-28",
    fulfillment: "Delivered",
    itemIndexes: [0, 2, 4],
    locationId: "loc-davao",
    orderNumber: "LUM-24812",
    payment: "Paid",
    quantities: [1, 1, 2],
    shippingMethodId: "ship-pickup",
    status: "Delivered",
  },
  {
    customer: "Hannah Lorenzo",
    customerEmail: "hannah.lorenzo@example.com",
    date: "2026-07-27",
    fulfillment: "Unfulfilled",
    itemIndexes: [6],
    locationId: "loc-makati",
    orderNumber: "LUM-24811",
    payment: "Refunded",
    quantities: [1],
    shippingMethodId: "ship-standard",
    status: "Cancelled",
  },
  {
    customer: "Emilio Ramirez",
    customerEmail: "emilio.ramirez@example.com",
    date: "2026-07-27",
    fulfillment: "Packing",
    itemIndexes: [1, 7],
    locationId: "loc-cebu",
    orderNumber: "LUM-24810",
    payment: "Paid",
    quantities: [2, 1],
    shippingMethodId: "ship-express",
    status: "Processing",
  },
];

export const demoOrders: WorkspaceOrder[] = seeds.map((seed) => {
  const items = lineItems(seed.itemIndexes, seed.quantities);
  return {
    customer: seed.customer,
    customerEmail: seed.customerEmail,
    date: seed.date,
    fulfillment: seed.fulfillment,
    items,
    locationId: seed.locationId,
    orderNumber: seed.orderNumber,
    payment: seed.payment,
    shippingMethodId: seed.shippingMethodId,
    status: seed.status,
    totalCentavos: totalOf(items),
    trackingNumber: seed.trackingNumber ?? null,
  };
});

export type OrdersWorkspaceSnapshot = {
  locations: DemoFulfillmentLocation[];
  orders: WorkspaceOrder[];
  shippingMethods: DemoShippingMethod[];
};

/**
 * Stands in for the orders API.
 *
 * The signature is deliberately async and failable so the page's loading, error
 * and empty states are exercised by the same code path a real loader will use.
 * Replacing this body with `apiRequest` requires no change above it.
 */
export async function loadOrdersWorkspace(): Promise<OrdersWorkspaceSnapshot> {
  return {
    locations: demoLocations,
    orders: demoOrders,
    shippingMethods: demoShippingMethods,
  };
}

/** Total item count across an order's lines, for the Items column. */
export function orderItemCount(order: WorkspaceOrder) {
  return order.items.reduce((running, item) => running + item.quantity, 0);
}

/**
 * The sidebar's Orders and Fulfillment badges, counted from the same rows the
 * pages show rather than written into the navigation model.
 */
export function orderBadgeCounts(orders: readonly WorkspaceOrder[]) {
  const open: OrderStatus[] = [
    "New",
    "Confirmed",
    "Processing",
    "Ready to Ship",
  ];
  return {
    fulfillment: orders.filter(
      (order) =>
        order.status !== "Cancelled" &&
        (order.fulfillment === "Unfulfilled" ||
          order.fulfillment === "Packing"),
    ).length,
    orders: orders.filter((order) => open.includes(order.status)).length,
  };
}
