import { render } from "@testing-library/react-native";
import { Animated } from "react-native";

import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import {
  findMerchantNavigationGroupLabel,
  findMerchantNavigationTarget,
  merchantNavigationItems,
  resolveCatalogSection,
  resolveMerchantNavigationAccess,
} from "@/features/merchant-dashboard/merchant-navigation";
import { MerchantSidebar } from "@/features/merchant-dashboard/merchant-sidebar";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const owner: MerchantSession = {
  defaultLocation: "Lumière Makati Warehouse",
  displayName: "Althea",
  email: "althea@example.com",
  merchantHandle: "lumiere",
  merchantName: "Lumière",
  permissions: rolePermissions["Merchant Owner"],
  role: "Merchant Owner",
  storeStatus: "active",
  verified: true,
};

let timingSpy: jest.SpiedFunction<typeof Animated.timing>;

beforeAll(() => {
  timingSpy = jest.spyOn(Animated, "timing").mockImplementation(
    (value, configuration) =>
      ({
        reset: jest.fn(),
        start: (callback?: (result: { finished: boolean }) => void) => {
          (value as Animated.Value).setValue(configuration.toValue as number);
          callback?.({ finished: true });
        },
        stop: jest.fn(),
      }) as ReturnType<typeof Animated.timing>,
  );
});

afterAll(() => timingSpy.mockRestore());

describe("resolveCatalogSection", () => {
  it("resolves every Catalog child declared in the navigation model", () => {
    const catalog = merchantNavigationItems.find(
      (item) => item.key === "catalog",
    );

    for (const child of catalog?.children ?? []) {
      expect(resolveCatalogSection(child.key)).toBe(child.key);
    }
  });

  it("leaves the overview and the Catalog group itself to the overview", () => {
    expect(resolveCatalogSection(undefined)).toBeUndefined();
    expect(resolveCatalogSection("overview")).toBeUndefined();
    expect(resolveCatalogSection("catalog")).toBeUndefined();
    expect(resolveCatalogSection("orders")).toBeUndefined();
  });

  it("tolerates the casing and padding a URL can carry", () => {
    expect(resolveCatalogSection("  Products ")).toBe("products");
    expect(resolveCatalogSection("BRANDS")).toBe("brands");
  });
});

describe("findMerchantNavigationTarget", () => {
  it("carries the section key so the shell can pick catalog content", () => {
    expect(findMerchantNavigationTarget("products").key).toBe("products");
    expect(findMerchantNavigationTarget("overview").key).toBe("overview");
    expect(findMerchantNavigationTarget("nonsense").key).toBe("overview");
  });

  it("gives a Catalog child its parent's permission gate", () => {
    for (const key of ["products", "categories", "collections", "brands"]) {
      expect(findMerchantNavigationTarget(key).permission).toBe(
        "products.read",
      );
    }
  });
});

describe("findMerchantNavigationGroupLabel", () => {
  it("finds the group a child belongs to", () => {
    expect(findMerchantNavigationGroupLabel("Products")).toBe("Catalog");
    expect(findMerchantNavigationGroupLabel("Collections")).toBe("Catalog");
    expect(findMerchantNavigationGroupLabel("Low Stock")).toBe("Inventory");
  });

  it("returns nothing for a top-level destination", () => {
    expect(findMerchantNavigationGroupLabel("Overview")).toBeUndefined();
    expect(findMerchantNavigationGroupLabel("Catalog")).toBeUndefined();
  });
});

describe("MerchantSidebar Catalog group", () => {
  it("stays collapsed when the active page is not one of its children", () => {
    const screen = render(
      <MerchantSidebar
        activeItemLabel="Overview"
        onToggleRail={jest.fn()}
        rail={false}
        session={owner}
      />,
    );

    expect(screen.getByLabelText("Catalog")).toBeTruthy();
    // The children only exist in the tree while the group is open.
    expect(screen.queryByLabelText("Categories")).toBeNull();
  });

  it("opens Catalog and selects the child when a child page is active", () => {
    const screen = render(
      <MerchantSidebar
        activeItemLabel="Products"
        onToggleRail={jest.fn()}
        rail={false}
        session={owner}
      />,
    );

    expect(screen.getByLabelText("Products")).toBeTruthy();
    expect(screen.getByLabelText("Categories")).toBeTruthy();
    expect(
      screen.getByLabelText("Products").props.accessibilityState.selected,
    ).toBe(true);
    // Its siblings stay neutral.
    expect(
      screen.getByLabelText("Categories").props.accessibilityState.selected,
    ).toBe(false);
    // And the group reports itself as expanded for the chevron and for AT.
    expect(
      screen.getByLabelText("Catalog").props.accessibilityState.expanded,
    ).toBe(true);
  });

  it("keeps the group open when moving between its children", () => {
    const screen = render(
      <MerchantSidebar
        activeItemLabel="Products"
        onToggleRail={jest.fn()}
        rail={false}
        session={owner}
      />,
    );

    screen.rerender(
      <MerchantSidebar
        activeItemLabel="Brands"
        onToggleRail={jest.fn()}
        rail={false}
        session={owner}
      />,
    );

    expect(
      screen.getByLabelText("Brands").props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByLabelText("Products").props.accessibilityState.selected,
    ).toBe(false);
    expect(
      screen.getByLabelText("Catalog").props.accessibilityState.expanded,
    ).toBe(true);
  });

  it("does not highlight the Catalog row itself while a child is selected", () => {
    const screen = render(
      <MerchantSidebar
        activeItemLabel="Collections"
        onToggleRail={jest.fn()}
        rail={false}
        session={owner}
      />,
    );

    expect(
      screen.getByLabelText("Catalog").props.accessibilityState.selected,
    ).toBe(false);
  });

  it("hides Catalog entirely from a role without products.read", () => {
    const support: MerchantSession = {
      ...owner,
      permissions: rolePermissions["Support Staff"],
      role: "Support Staff",
    };

    expect(
      resolveMerchantNavigationAccess(support).map(({ item }) => item.key),
    ).not.toContain("catalog");

    const screen = render(
      <MerchantSidebar
        activeItemLabel="Overview"
        onToggleRail={jest.fn()}
        rail={false}
        session={support}
      />,
    );

    expect(screen.queryByLabelText("Catalog")).toBeNull();
  });

  it("disables Catalog while the store is not active", () => {
    const suspended: MerchantSession = { ...owner, storeStatus: "suspended" };
    const access = resolveMerchantNavigationAccess(suspended).find(
      ({ item }) => item.key === "catalog",
    );

    expect(access?.disabled).toBe(true);
  });
});
