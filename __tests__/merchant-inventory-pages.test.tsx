import { fireEvent, render, within } from "@testing-library/react-native";

import {
  adjustmentErrorMessage,
  parseQuantity,
} from "@/features/merchant-dashboard/adjust-stock-modal";
import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import {
  type InventorySectionLoaders,
  isPermissionDenied,
  loadInventorySnapshot,
  LOW_STOCK_BADGE_LIMIT,
} from "@/features/merchant-dashboard/inventory-data-source";
import {
  canAdjustLevel,
  isIsoDate,
  levelRowActions,
  LocationsSection,
  LowStockSection,
  MovementsSection,
  StockLevelsSection,
} from "@/features/merchant-dashboard/inventory-sections";
import { resolveInventorySection } from "@/features/merchant-dashboard/merchant-navigation";
import { AuthRequestError } from "@/services/auth/auth-error";
import {
  type InventoryLevelView,
  type InventoryLocationView,
  type InventoryMovementView,
  projectedOnHand,
  validateAdjustment,
} from "@/services/merchant/inventory-api";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

function sessionFor(role: MerchantSession["role"]): MerchantSession {
  return {
    defaultLocation: "Main",
    displayName: "Althea",
    email: "althea@example.com",
    merchantHandle: "merchant:merchant-1",
    merchantId: "merchant-1",
    merchantName: "Lumière",
    permissions: rolePermissions[role],
    role,
    storeStatus: "active",
    verified: true,
  };
}

const owner = sessionFor("Merchant Owner");
const inventoryStaff = sessionFor("Inventory Staff");
const supportStaff = sessionFor("Support Staff");

function level(
  overrides: Partial<InventoryLevelView> = {},
): InventoryLevelView {
  return {
    available: 6,
    barcode: null,
    isActive: true,
    locationId: "location-1",
    merchantId: "merchant-1",
    onHand: 10,
    productId: "product-1",
    productName: "Amihan Linen Wrap Dress",
    reorderThreshold: 8,
    reserved: 4,
    sku: "LUM-DRS-016",
    stockStatus: "LOW_STOCK",
    updatedAt: "2026-08-06T09:30:00.000Z",
    variantId: "variant-1",
    variantName: "Black / M",
    version: 3,
    ...overrides,
  };
}

const locations: InventoryLocationView[] = [
  {
    addressSnapshot: "12 Makati Ave",
    code: "MAIN",
    createdAt: "2026-07-01T00:00:00.000Z",
    id: "location-1",
    isActive: true,
    isDefault: true,
    merchantId: "merchant-1",
    name: "Makati Warehouse",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
];

const locationNames = new Map([["location-1", "Makati Warehouse"]]);

function movement(
  overrides: Partial<InventoryMovementView> = {},
): InventoryMovementView {
  return {
    afterOnHand: 10,
    afterReserved: 4,
    beforeOnHand: 4,
    beforeReserved: 4,
    createdAt: "2026-08-06T09:30:00.000Z",
    createdByUserId: "user-1",
    deltaOnHand: 6,
    id: "movement-1",
    locationCode: "MAIN",
    locationId: "location-1",
    merchantId: "merchant-1",
    movementType: "STOCK_IN",
    productId: "product-1",
    productName: "Amihan Linen Wrap Dress",
    reason: "Supplier delivery",
    sku: "LUM-DRS-016",
    variantId: "variant-1",
    variantName: "Black / M",
    ...overrides,
  };
}

function loaders(
  overrides: Partial<InventorySectionLoaders> = {},
): InventorySectionLoaders {
  return {
    levels: async () => ({ items: [level()], nextCursor: "cursor-2" }),
    locations: async () => locations,
    lowStock: async () => ({ items: [level()], nextCursor: null }),
    movements: async () => ({ items: [movement()], nextCursor: null }),
    ...overrides,
  };
}

describe("resolveInventorySection", () => {
  it("resolves every Inventory child and nothing else", () => {
    for (const key of ["stock-levels", "locations", "movements", "low-stock"]) {
      expect(resolveInventorySection(key)).toBe(key);
    }
    expect(resolveInventorySection("inventory")).toBeUndefined();
    expect(resolveInventorySection("products")).toBeUndefined();
    expect(resolveInventorySection(undefined)).toBeUndefined();
    // URLs carry casing and padding.
    expect(resolveInventorySection(" Low-Stock ")).toBe("low-stock");
  });
});

describe("loadInventorySnapshot", () => {
  it("maps every region and carries the cursors through unchanged", async () => {
    const { failedSections, snapshot } = await loadInventorySnapshot(loaders());

    expect(failedSections).toEqual([]);
    expect(snapshot.levels).toHaveLength(1);
    expect(snapshot.levelsCursor).toBe("cursor-2");
    expect(snapshot.locationNames.get("location-1")).toBe("Makati Warehouse");
    expect(snapshot.movements).toHaveLength(1);
  });

  it("derives the low-stock badge count from the rows the API returned", async () => {
    const { snapshot } = await loadInventorySnapshot(loaders());

    expect(snapshot.lowStockCount).toBe(1);
    expect(snapshot.lowStockCapped).toBe(false);
  });

  it("flags the badge as capped once the page limit is reached", async () => {
    const { snapshot } = await loadInventorySnapshot(
      loaders({
        lowStock: async () => ({
          items: Array.from({ length: LOW_STOCK_BADGE_LIMIT }, (_v, index) =>
            level({ variantId: `variant-${index}` }),
          ),
          nextCursor: "more",
        }),
      }),
    );

    expect(snapshot.lowStockCount).toBe(LOW_STOCK_BADGE_LIMIT);
    expect(snapshot.lowStockCapped).toBe(true);
  });

  it("degrades one failing region without losing the others", async () => {
    const { failedSections, snapshot } = await loadInventorySnapshot(
      loaders({
        movements: async () => {
          throw new AuthRequestError("server", "offline", 500);
        },
      }),
    );

    expect(failedSections).toEqual(["movements"]);
    expect(snapshot.movements).toEqual([]);
    expect(snapshot.levels).toHaveLength(1);
  });

  it("rethrows a denial and an expired session rather than degrading", async () => {
    const denial = new AuthRequestError("permission-denied", "no", 403);
    await expect(
      loadInventorySnapshot(loaders({ levels: () => Promise.reject(denial) })),
    ).rejects.toBe(denial);
    expect(isPermissionDenied(denial)).toBe(true);

    await expect(
      loadInventorySnapshot(
        loaders({
          levels: () =>
            Promise.reject(
              new AuthRequestError("session-expired", "expired", 401),
            ),
        }),
      ),
    ).rejects.toBeInstanceOf(AuthRequestError);
  });
});

describe("canAdjustLevel", () => {
  it("requires a single location's optimistic-locking version", () => {
    expect(canAdjustLevel(level())).toBe(true);
    // An unfiltered aggregate row reports no version to lock against.
    expect(canAdjustLevel(level({ version: null }))).toBe(false);
    expect(canAdjustLevel(level({ locationId: null }))).toBe(false);
  });
});

describe("levelRowActions", () => {
  const disabled = (
    items: { disabled?: boolean; key: string }[],
    key: string,
  ) => items.find((item) => item.key === key)?.disabled;

  it("lets a role with inventory.adjust adjust a location-scoped row", () => {
    expect(inventoryStaff.permissions).toContain("inventory.adjust");
    expect(
      disabled(
        levelRowActions({ level: level(), session: inventoryStaff }),
        "adjust",
      ),
    ).toBe(false);
  });

  it("disables adjust for a role without the permission", () => {
    expect(supportStaff.permissions).not.toContain("inventory.adjust");
    expect(
      disabled(
        levelRowActions({ level: level(), session: supportStaff }),
        "adjust",
      ),
    ).toBe(true);
  });

  it("disables adjust on an aggregate row even for an owner", () => {
    expect(
      disabled(
        levelRowActions({ level: level({ version: null }), session: owner }),
        "adjust",
      ),
    ).toBe(true);
  });
});

describe("validateAdjustment", () => {
  it("requires a positive quantity for stock in and stock out", () => {
    for (const operation of ["STOCK_IN", "STOCK_OUT"] as const) {
      expect(
        validateAdjustment({ operation, quantity: 0, reason: "count" })
          .quantity,
      ).toBeDefined();
      expect(
        validateAdjustment({ operation, quantity: -2, reason: "count" })
          .quantity,
      ).toBeDefined();
      expect(
        validateAdjustment({ operation, quantity: 5, reason: "count" })
          .quantity,
      ).toBeUndefined();
    }
  });

  it("allows a signed non-zero delta for an adjustment", () => {
    expect(
      validateAdjustment({
        operation: "ADJUSTMENT",
        quantity: -3,
        reason: "count",
      }).quantity,
    ).toBeUndefined();
    expect(
      validateAdjustment({
        operation: "ADJUSTMENT",
        quantity: 0,
        reason: "count",
      }).quantity,
    ).toBeDefined();
  });

  it("enforces the server's 3-500 character reason", () => {
    expect(
      validateAdjustment({ operation: "STOCK_IN", quantity: 1, reason: "ab" })
        .reason,
    ).toBeDefined();
    expect(
      validateAdjustment({
        operation: "STOCK_IN",
        quantity: 1,
        reason: "a".repeat(501),
      }).reason,
    ).toBeDefined();
  });

  it("rejects a non-integer quantity", () => {
    expect(
      validateAdjustment({
        operation: "STOCK_IN",
        quantity: Number.NaN,
        reason: "count",
      }).quantity,
    ).toBeDefined();
  });
});

describe("projectedOnHand", () => {
  it("previews the figure each operation would produce", () => {
    expect(projectedOnHand(10, "STOCK_IN", 5)).toBe(15);
    expect(projectedOnHand(10, "STOCK_OUT", 5)).toBe(5);
    expect(projectedOnHand(10, "ADJUSTMENT", -4)).toBe(6);
    // A sign typed into stock in/out still adds or removes as labelled.
    expect(projectedOnHand(10, "STOCK_OUT", -5)).toBe(5);
  });
});

describe("parseQuantity", () => {
  it("refuses anything that is not a whole number", () => {
    expect(parseQuantity("12")).toBe(12);
    expect(parseQuantity("-3")).toBe(-3);
    expect(Number.isNaN(parseQuantity(""))).toBe(true);
    expect(Number.isNaN(parseQuantity("1.5"))).toBe(true);
    expect(Number.isNaN(parseQuantity("-"))).toBe(true);
    expect(Number.isNaN(parseQuantity("abc"))).toBe(true);
  });
});

describe("adjustmentErrorMessage", () => {
  it("explains a version conflict rather than inviting a blind retry", () => {
    const message = adjustmentErrorMessage(
      new AuthRequestError("server", "", 409),
    );
    expect(message).toContain("changed while the dialog was open");
  });

  it("names a permission denial and never leaks an unknown error", () => {
    expect(
      adjustmentErrorMessage(
        new AuthRequestError("permission-denied", "no", 403),
      ),
    ).toBe("Your role cannot adjust inventory.");
    expect(adjustmentErrorMessage(new Error("stack trace"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});

describe("isIsoDate", () => {
  it("only accepts a complete calendar date", () => {
    expect(isIsoDate("2026-08-01")).toBe(true);
    // A half-typed date must not filter the table.
    expect(isIsoDate("2026-08")).toBe(false);
    expect(isIsoDate("2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("StockLevelsSection", () => {
  const renderLevels = (overrides: Record<string, unknown> = {}) =>
    render(
      <StockLevelsSection
        compact={false}
        hasNextPage={false}
        hasPreviousPage={false}
        levels={[level()]}
        locationNames={locationNames}
        locations={locations}
        onQueryChange={jest.fn()}
        page={1}
        query={{}}
        session={owner}
        {...overrides}
      />,
    );

  it("renders the fields the levels endpoint returns", () => {
    const screen = renderLevels();

    expect(screen.getByTestId("level-row-variant-1")).toBeTruthy();
    expect(screen.getByText("Amihan Linen Wrap Dress")).toBeTruthy();
    expect(screen.getByText("Black / M · LUM-DRS-016")).toBeTruthy();
    expect(screen.getByText("Low stock")).toBeTruthy();
  });

  it("reports a filter change up rather than filtering locally", () => {
    const onQueryChange = jest.fn();
    const screen = renderLevels({ onQueryChange, query: { search: "old" } });

    fireEvent.changeText(screen.getByLabelText("Search stock levels"), "linen");

    expect(onQueryChange).toHaveBeenCalledWith({
      cursor: undefined,
      search: "linen",
    });
  });

  it("says an aggregate row totals every location", () => {
    const screen = renderLevels({
      levels: [level({ locationId: null, version: null })],
    });

    // Scoped to the row: "All locations" is also the location filter's
    // resting value, so a bare text query would match either.
    expect(
      within(screen.getByTestId("level-row-variant-1")).getByText(
        "All locations",
      ),
    ).toBeTruthy();
  });

  it("stacks cards instead of the table when compact", () => {
    const screen = renderLevels({ compact: true });

    expect(screen.getByTestId("level-card-variant-1")).toBeTruthy();
    expect(screen.queryByTestId("level-row-variant-1")).toBeNull();
  });

  it("distinguishes an empty catalogue from an empty filter result", () => {
    expect(
      renderLevels({ levels: [] }).getByText("No tracked inventory yet."),
    ).toBeTruthy();
    expect(
      renderLevels({ levels: [], query: { search: "x" } }).getByText(
        "No stock matches your filters.",
      ),
    ).toBeTruthy();
  });
});

describe("LowStockSection", () => {
  const renderLowStock = (overrides: Record<string, unknown> = {}) =>
    render(
      <LowStockSection
        capped={false}
        compact={false}
        hasNextPage={false}
        hasPreviousPage={false}
        levels={[level()]}
        locationNames={locationNames}
        locations={locations}
        onQueryChange={jest.fn()}
        page={1}
        query={{}}
        session={owner}
        {...overrides}
      />,
    );

  it("shows the approved compact alert row with all four figures", () => {
    const screen = renderLowStock();

    expect(screen.getByTestId("low-stock-row-variant-1")).toBeTruthy();
    for (const label of ["ON HAND", "RESERVED", "AVAILABLE", "THRESHOLD"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText("Makati Warehouse")).toBeTruthy();
  });

  it("disables Adjust Stock for a role that cannot adjust", () => {
    expect(
      renderLowStock({ session: supportStaff }).getByTestId(
        "low-stock-adjust-variant-1",
      ).props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      renderLowStock().getByTestId("low-stock-adjust-variant-1").props
        .accessibilityState.disabled,
    ).toBe(false);
  });

  it("says so when the count is capped rather than implying a total", () => {
    expect(
      renderLowStock({ capped: true }).getByText(
        "Showing the first 100 variants at or below their reorder threshold.",
      ),
    ).toBeTruthy();
  });
});

describe("LocationsSection", () => {
  const renderLocations = (overrides: Record<string, unknown> = {}) =>
    render(
      <LocationsSection
        compact={false}
        locations={locations}
        session={owner}
        {...overrides}
      />,
    );

  it("renders the fields the locations endpoint returns", () => {
    const screen = renderLocations();

    expect(screen.getByTestId("location-row-location-1")).toBeTruthy();
    expect(screen.getByText("Makati Warehouse")).toBeTruthy();
    expect(screen.getByText("MAIN")).toBeTruthy();
    expect(screen.getByText("12 Makati Ave")).toBeTruthy();
    expect(screen.getByText("Default location")).toBeTruthy();
  });

  it("says plainly that per-location totals are not reported yet", () => {
    // Rather than printing a fabricated variant or stock count.
    expect(
      renderLocations().getByText(/Per-location variant and stock totals/),
    ).toBeTruthy();
  });

  it("gates Create Location on inventory.locations.manage", () => {
    expect(inventoryStaff.permissions).not.toContain(
      "inventory.locations.manage",
    );
    expect(
      renderLocations({ session: inventoryStaff }).getByTestId(
        "locations-create",
      ).props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      renderLocations().getByTestId("locations-create").props.accessibilityState
        .disabled,
    ).toBe(false);
  });

  it("guides a merchant with no locations", () => {
    const screen = renderLocations({ locations: [] });

    expect(screen.getByText("No locations yet")).toBeTruthy();
    expect(screen.queryByTestId("locations-table")).toBeNull();
  });
});

describe("MovementsSection", () => {
  const renderMovements = (overrides: Record<string, unknown> = {}) =>
    render(
      <MovementsSection
        compact={false}
        hasNextPage={false}
        hasPreviousPage={false}
        locationNames={locationNames}
        locations={locations}
        movements={[movement()]}
        onQueryChange={jest.fn()}
        page={1}
        query={{}}
        {...overrides}
      />,
    );

  it("renders the before and after figures the history records", () => {
    const screen = renderMovements();

    expect(screen.getByTestId("movement-row-movement-1")).toBeTruthy();
    expect(screen.getByText("Stock in")).toBeTruthy();
    expect(screen.getByText("4 → 10")).toBeTruthy();
    expect(screen.getByText("Supplier delivery")).toBeTruthy();
  });

  it("says history is read-only", () => {
    expect(renderMovements().getByText(/history is read-only/)).toBeTruthy();
  });

  it("only sends a complete date to the server", () => {
    const onQueryChange = jest.fn();
    const screen = renderMovements({ onQueryChange });

    fireEvent.changeText(
      screen.getByLabelText("Movements from date"),
      "2026-08",
    );
    expect(onQueryChange).toHaveBeenLastCalledWith({
      createdFrom: undefined,
      cursor: undefined,
    });

    fireEvent.changeText(
      screen.getByLabelText("Movements from date"),
      "2026-08-01",
    );
    expect(onQueryChange).toHaveBeenLastCalledWith({
      createdFrom: "2026-08-01T00:00:00.000Z",
      cursor: undefined,
    });
  });
});
