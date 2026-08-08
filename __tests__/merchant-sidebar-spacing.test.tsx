import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { spacing } from "@/constants/design-tokens";
import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import { MerchantSidebar } from "@/features/merchant-dashboard/merchant-sidebar";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const session: MerchantSession = {
  defaultLocation: "Makati Warehouse",
  displayName: "vinceee",
  email: "vinceee@postmanfashion.ph",
  merchantHandle: "merchant:m1",
  merchantId: "m1",
  merchantName: "Postman Fashion",
  permissions: rolePermissions["Merchant Owner"],
  role: "Merchant Owner",
  storeStatus: "active",
  verified: true,
};

function renderSidebar(rail: boolean) {
  const screen = render(
    <MerchantSidebar onToggleRail={jest.fn()} rail={rail} session={session} />,
  );
  const flatten = (testID: string) =>
    StyleSheet.flatten(screen.getByTestId(testID).props.style);

  return {
    avatar: flatten("merchant-sidebar-merchant-avatar"),
    brand: flatten("merchant-sidebar-brand-region"),
    card: flatten("merchant-sidebar-workspace-card"),
    region: flatten("merchant-sidebar-workspace-region"),
    sidebar: flatten("merchant-sidebar"),
    collapse: StyleSheet.flatten(
      screen.getByLabelText(rail ? "Expand sidebar" : "Collapse sidebar").props
        .style,
    ),
    screen,
  };
}

describe("brand clearance", () => {
  it("keeps the logo off the sidebar's top edge", () => {
    const { brand, sidebar } = renderSidebar(false);

    // The clearance is the sidebar's own padding, so it applies before the
    // brand band and is identical in both states.
    expect(sidebar.paddingTop).toBeGreaterThan(0);
    expect(sidebar.paddingTop).toBe(spacing.sm);
    expect(brand.alignItems).toBe("center");
  });

  it("gives the collapsed mark the same clearance as the expanded logo", () => {
    expect(renderSidebar(false).sidebar.paddingTop).toBe(
      renderSidebar(true).sidebar.paddingTop,
    );
  });

  it("leaves the rail stack room above and below inside the brand band", () => {
    const { brand, collapse, screen } = renderSidebar(true);
    const mark = StyleSheet.flatten(
      screen.getByTestId("merchant-sidebar-brand-mark").props.style,
    );
    const stack = mark.height + brand.gap + collapse.height;

    // Not merely "fits": the leftover has to be real clearance, or the mark
    // reads as stuck to the top of the rail.
    expect(brand.height - stack).toBeGreaterThanOrEqual(spacing.xxs * 2);
    expect(brand.justifyContent).toBe("center");
  });
});

describe("shared rhythm across states", () => {
  it("uses one brand band height, so collapsing cannot shift the navigation", () => {
    expect(renderSidebar(false).brand.height).toBe(
      renderSidebar(true).brand.height,
    );
  });

  it("uses one workspace band height for both states", () => {
    expect(renderSidebar(false).region.height).toBe(
      renderSidebar(true).region.height,
    );
  });

  it("centres the rail's shorter avatar block in that band", () => {
    expect(renderSidebar(true).region.justifyContent).toBe("center");
  });
});

describe("gap before the first navigation row", () => {
  it("is tight, and is the only spacing between the card and the nav", () => {
    const { region, screen } = renderSidebar(false);
    const nav = StyleSheet.flatten(
      screen.getByLabelText("Merchant sections").props.contentContainerStyle,
    );

    expect(region.paddingBottom).toBe(spacing.xs);
    // The navigation adds none of its own, so the gap above `Overview` is
    // exactly the value asserted above rather than two stacked paddings.
    expect(nav.paddingTop).toBeUndefined();
  });

  it("sizes the card from its avatar and padding rather than a fixed height", () => {
    const { avatar, card } = renderSidebar(false);

    expect(card.padding).toBe(spacing.sm);
    expect(card.minHeight).toBe(avatar.height + spacing.sm * 2);
    // A fixed height would leave the card taller than its contents and push
    // the navigation down for no reason.
    expect(card.height).toBeUndefined();
  });

  it("keeps the workspace band exactly the card plus that gap", () => {
    const { card, region } = renderSidebar(false);

    expect(region.height).toBe(card.minHeight + region.paddingBottom);
  });
});

describe("navigation rows are untouched", () => {
  it("keeps the 44px row and its icon alignment", () => {
    const { screen } = renderSidebar(false);
    const row = StyleSheet.flatten(
      screen.getByLabelText("Overview").props.style,
    );

    expect(row.minHeight).toBe(44);
    expect(row.alignItems).toBe("center");
    expect(row.flexDirection).toBe("row");
  });

  it("keeps rail rows square and centred", () => {
    const { screen } = renderSidebar(true);
    const row = StyleSheet.flatten(
      screen.getByLabelText("Overview").props.style,
    );

    expect(row.height).toBe(44);
    expect(row.width).toBe(44);
    expect(row.justifyContent).toBe("center");
  });
});
