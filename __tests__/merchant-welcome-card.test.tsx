import { render } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";

import { colors } from "@/constants/design-tokens";
import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import { WelcomeBanner } from "@/features/merchant-dashboard/dashboard-overview-sections";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const session: MerchantSession = {
  defaultLocation: "Postman Fashion Main Location",
  displayName: "vinceee",
  email: "owner@example.com",
  merchantHandle: "postman-fashion",
  merchantName: "Postman Fashion",
  permissions: rolePermissions["Merchant Owner"],
  role: "Merchant Owner",
  storeStatus: "active",
  verified: true,
};

describe("WelcomeBanner", () => {
  it("shows the signed-in merchant rather than any design placeholder", () => {
    const screen = render(<WelcomeBanner mobile={false} session={session} />);

    expect(screen.getByText(/vinceee$/)).toBeTruthy();
    expect(
      screen.getByText("Here's what's happening with Postman Fashion today."),
    ).toBeTruthy();
    // The reference mock's values must never be baked in.
    expect(screen.queryByText(/Owner$/)).toBeNull();
    expect(screen.queryByText(/Lumière/)).toBeNull();
  });

  it("presents the store status capitalised without changing the stored value", () => {
    const screen = render(<WelcomeBanner mobile={false} session={session} />);

    expect(screen.getByText("Store status: Active")).toBeTruthy();
    expect(session.storeStatus).toBe("active");
  });

  it("drops the verified badge when the merchant is not verified", () => {
    const screen = render(
      <WelcomeBanner
        mobile={false}
        session={{ ...session, verified: false }}
      />,
    );

    expect(screen.queryByText("Verified merchant")).toBeNull();
    expect(screen.getByText("Store status: Active")).toBeTruthy();
  });

  it("warns on a store that is not active", () => {
    const screen = render(
      <WelcomeBanner
        mobile={false}
        session={{ ...session, storeStatus: "suspended" }}
      />,
    );

    expect(screen.getByText("Store status: Suspended")).toBeTruthy();
  });

  it("keeps the decorative shapes behind the content", () => {
    const screen = render(<WelcomeBanner mobile={false} session={session} />);
    const card = screen.getByTestId("dashboard-welcome");
    const [blue, pink] = (
      card.props.children as { props: { style: ViewStyle } }[]
    )
      .slice(0, 2)
      .map((node) => StyleSheet.flatten(node.props.style));

    expect(blue.zIndex).toBe(0);
    expect(pink.zIndex).toBe(0);
    // Existing tokens only — no new brand colours for decoration.
    expect([blue.backgroundColor, pink.backgroundColor]).toEqual([
      colors.feedback.infoSoft,
      colors.brand.socialSurface,
    ]);
  });

  it("disables Add Product for a role that cannot create products", () => {
    const screen = render(
      <WelcomeBanner
        mobile={false}
        session={{ ...session, permissions: [] }}
      />,
    );

    expect(screen.getByTestId("welcome-view-storefront")).toBeTruthy();
    expect(
      screen.getByTestId("welcome-add-product").props.accessibilityState
        .disabled,
    ).toBe(true);
  });
});
