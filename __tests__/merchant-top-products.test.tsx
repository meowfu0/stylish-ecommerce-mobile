import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/constants/design-tokens";
import { TopProducts } from "@/features/merchant-dashboard/dashboard-commerce-sections";
import { topProducts } from "@/features/merchant-dashboard/dashboard-data";
import type { ProductRow } from "@/features/merchant-dashboard/dashboard-types";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const rowStyle = (screen: ReturnType<typeof render>, sku: string) =>
  StyleSheet.flatten(screen.getByTestId(`top-product-${sku}`).props.style);

describe("TopProducts", () => {
  it("renders one row per supplied product rather than repeated markup", () => {
    const screen = render(<TopProducts products={topProducts} />);

    for (const product of topProducts) {
      expect(screen.getByTestId(`top-product-${product.sku}`)).toBeTruthy();
      expect(screen.getByText(product.name)).toBeTruthy();
      expect(screen.getByText(`SKU ${product.sku}`)).toBeTruthy();
    }
  });

  it("divides every row except the last, keeping one clean surface", () => {
    const screen = render(<TopProducts products={topProducts} />);

    topProducts.slice(0, -1).forEach((product) => {
      expect(rowStyle(screen, product.sku).borderBottomWidth).toBe(1);
    });
    const last = topProducts[topProducts.length - 1];
    expect(rowStyle(screen, last.sku).borderBottomWidth).toBeUndefined();
  });

  it("keeps View Product as the row's own control, after the metrics", () => {
    const screen = render(<TopProducts products={topProducts} />);
    const row = screen.getByTestId(`top-product-${topProducts[0].sku}`);
    const children = row.props.children as { props?: { testID?: string } }[];

    // Last child in source order is what puts it at the far right of the row.
    expect(children[children.length - 1].props?.testID).toBe(
      `top-product-view-${topProducts[0].sku}`,
    );
    expect(
      screen.getByLabelText(`View ${topProducts[0].name}`),
    ).toBeTruthy();
  });

  it("colours the trend by direction and keeps it data-driven", () => {
    const products: ProductRow[] = [
      { ...topProducts[0], sku: "UP-1", trendPercent: 18.4 },
      { ...topProducts[1], sku: "DOWN-1", trendPercent: -6.1 },
    ];
    const screen = render(<TopProducts products={products} />);

    const up = StyleSheet.flatten(screen.getByText("+18.4%").props.style);
    const down = StyleSheet.flatten(screen.getByText("-6.1%").props.style);

    expect(up.color).toBe(colors.feedback.success);
    expect(down.color).toBe(colors.feedback.danger);
  });

  // Pixel alignment of the columns is asserted in the browser sweep; here we
  // only guarantee every row contributes the same three labelled metrics.
  it("gives every row the same three metric columns", () => {
    const screen = render(<TopProducts products={topProducts} />);

    for (const label of ["UNITS", "REVENUE", "TREND"]) {
      expect(screen.getAllByText(label)).toHaveLength(topProducts.length);
    }
  });

  it("formats large counts and revenue without inventing values", () => {
    const screen = render(
      <TopProducts
        products={[
          {
            ...topProducts[0],
            revenueCentavos: 1_284_990_050,
            sku: "BIG-1",
            units: 128_450,
          },
        ]}
      />,
    );

    expect(screen.getByText("128,450")).toBeTruthy();
    expect(screen.getByText("₱12,849,901")).toBeTruthy();
  });

  it("renders an empty catalogue without crashing", () => {
    const screen = render(<TopProducts products={[]} />);

    expect(screen.getByTestId("dashboard-top-products")).toBeTruthy();
    expect(screen.queryByText("UNITS")).toBeNull();
  });
});
