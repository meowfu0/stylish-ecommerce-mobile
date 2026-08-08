import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import { normalizeMerchantStoreStatus } from "@/features/merchant-dashboard/dashboard-state-model";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import { HelpSupportDialog } from "@/features/merchant-dashboard/help-support-dialog";
import { MerchantSidebar } from "@/features/merchant-dashboard/merchant-sidebar";
import {
  presentStoreStatus,
  STOREFRONT_ROUTE,
  storeStatusPresentation,
} from "@/features/merchant-dashboard/merchant-store-status";
import {
  searchSupport,
  supportChannels,
  supportSections,
} from "@/features/merchant-dashboard/support-content-data";

// `mock`-prefixed so jest allows the factories below to close over them.
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock("@/services/auth/auth-session", () => ({
  signOutCurrentSession: () => mockSignOut(),
}));

function sessionWith(
  overrides: Partial<MerchantSession> = {},
): MerchantSession {
  return {
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
    ...overrides,
  };
}

function renderSidebar(
  session = sessionWith(),
  props: Partial<React.ComponentProps<typeof MerchantSidebar>> = {},
) {
  return render(
    <MerchantSidebar
      onToggleRail={jest.fn()}
      rail={false}
      session={session}
      {...props}
    />,
  );
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockSignOut.mockClear();
});

describe("store status", () => {
  it("labels every status in words, with an icon and a tone", () => {
    (["active", "inactive", "suspended", "under_review"] as const).forEach(
      (status) => {
        const presentation = storeStatusPresentation[status];
        expect(presentation.label.length).toBeGreaterThan(0);
        expect(presentation.shortLabel.length).toBeGreaterThan(0);
        expect(presentation.icon.length).toBeGreaterThan(0);
        expect(presentation.summary.length).toBeGreaterThan(0);
      },
    );
  });

  it("only permits the storefront while the store is active", () => {
    expect(storeStatusPresentation.active.canViewStorefront).toBe(true);
    (["inactive", "suspended", "under_review"] as const).forEach((status) => {
      expect(storeStatusPresentation[status].canViewStorefront).toBe(false);
      // A blocked action must be able to say why, not just look dim.
      expect(storeStatusPresentation[status].disabledReason).toBeDefined();
    });
  });

  it("normalizes the backend's spellings of the review state", () => {
    ["under_review", "in_review", "pending", "PENDING_REVIEW"].forEach(
      (value) =>
        expect(normalizeMerchantStoreStatus(value)).toBe("under_review"),
    );
    expect(normalizeMerchantStoreStatus("suspended")).toBe("suspended");
    expect(normalizeMerchantStoreStatus(undefined)).toBe("active");
  });

  it("renders the chip from the shared map, not a string built in the sidebar", () => {
    const view = renderSidebar(sessionWith({ storeStatus: "under_review" }));

    expect(view.getByText("Under review")).toBeTruthy();
    expect(
      view.getByTestId("sidebar-store-status").props.accessibilityLabel,
    ).toBe("Store status: Under review");
  });

  it("keeps the status readable in the collapsed rail", () => {
    const view = renderSidebar(sessionWith({ storeStatus: "suspended" }), {
      rail: true,
    });

    const status = view.getByTestId("sidebar-store-status");
    expect(status.props.accessibilityLabel).toBe("Store status: Suspended");
    // No clipped text in the rail — the label lives on the container instead.
    expect(view.queryByText("Store suspended")).toBeNull();
  });
});

describe("View Storefront", () => {
  it("navigates to the app's existing storefront route", () => {
    const view = renderSidebar();

    fireEvent.press(view.getByTestId("sidebar-utility-view-storefront"));
    expect(mockPush).toHaveBeenCalledWith(STOREFRONT_ROUTE);
  });

  it("is disabled, with a reason, when the store cannot sell", () => {
    const view = renderSidebar(sessionWith({ storeStatus: "suspended" }));
    const action = view.getByTestId("sidebar-utility-view-storefront");

    expect(action.props.accessibilityState.disabled).toBe(true);
    expect(action.props.accessibilityHint).toBe(
      presentStoreStatus(sessionWith({ storeStatus: "suspended" }))
        .disabledReason,
    );

    fireEvent.press(action);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("closes the mobile drawer after navigating", () => {
    const onClose = jest.fn();
    const view = renderSidebar(sessionWith(), { onClose });

    fireEvent.press(view.getByTestId("sidebar-utility-view-storefront"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("Switch Workspace", () => {
  it("opens the existing workspace picker rather than a second one", () => {
    const view = renderSidebar();

    fireEvent.press(view.getByTestId("sidebar-utility-switch-workspace"));
    expect(mockPush).toHaveBeenCalledWith("/auth/choose-workspace");
  });

  it("stays available while the store cannot sell", () => {
    const view = renderSidebar(sessionWith({ storeStatus: "suspended" }));

    expect(
      view.getByTestId("sidebar-utility-switch-workspace").props
        .accessibilityState.disabled,
    ).toBe(false);
  });
});

describe("Help & Support", () => {
  it("opens from the sidebar", () => {
    const view = renderSidebar();

    expect(view.queryByTestId("help-support")).toBeNull();
    fireEvent.press(view.getByTestId("sidebar-utility-help-support"));
    expect(view.getByTestId("help-support")).toBeTruthy();
  });

  it("shows every help section and contact channel", () => {
    const view = render(<HelpSupportDialog onClose={jest.fn()} visible />);

    supportSections.forEach((section) =>
      expect(view.getByTestId(`help-section-${section.id}`)).toBeTruthy(),
    );
    supportChannels.forEach((channel) =>
      expect(view.getByTestId(`help-channel-${channel.id}`)).toBeTruthy(),
    );
  });

  it("reveals an answer only once its question is opened", () => {
    const view = render(<HelpSupportDialog onClose={jest.fn()} visible />);

    expect(view.queryByTestId("help-answer-publish")).toBeNull();
    fireEvent.press(view.getByTestId("help-topic-publish"));
    expect(view.getByTestId("help-answer-publish")).toBeTruthy();
    expect(
      view.getByTestId("help-topic-publish").props.accessibilityState.expanded,
    ).toBe(true);
  });

  it("filters topics by question and by answer text", () => {
    const byQuestion = searchSupport(supportSections, "publish");
    expect(byQuestion.length).toBeGreaterThan(0);

    const byAnswer = searchSupport(supportSections, "centavos");
    expect(byAnswer.flatMap((section) => section.topics)).toHaveLength(1);

    expect(searchSupport(supportSections, "   ")).toEqual(supportSections);
    expect(searchSupport(supportSections, "nothing matches this")).toEqual([]);
  });

  it("says nothing was filed, because there is no support API", () => {
    const view = render(<HelpSupportDialog onClose={jest.fn()} visible />);

    expect(
      view.getByText(/nothing on this screen files a request/i),
    ).toBeTruthy();
    // A ticket form would be a lie without an endpoint behind it.
    expect(view.queryByText(/submit/i)).toBeNull();
  });

  it("explains an empty search instead of showing a blank panel", () => {
    const view = render(<HelpSupportDialog onClose={jest.fn()} visible />);

    fireEvent.changeText(view.getByTestId("help-support-search"), "zzzzz");
    expect(view.getByTestId("help-support-empty")).toBeTruthy();
  });
});

describe("Sign Out", () => {
  it("uses the existing session helper and lands on Sign In", async () => {
    const view = renderSidebar();

    fireEvent.press(view.getByTestId("sidebar-utility-sign-out"));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    // `replace`, not `push`: the merchant must not be able to go back into an
    // authenticated page afterwards.
    expect(mockReplace).toHaveBeenCalledWith("/sign-in");
    expect(mockPush).not.toHaveBeenCalledWith("/sign-in");
  });
});

describe("footer accessibility and layout", () => {
  it("gives every action a button role and a label at both widths", () => {
    [false, true].forEach((rail) => {
      const view = renderSidebar(sessionWith(), { rail });

      [
        "view-storefront",
        "switch-workspace",
        "help-support",
        "sign-out",
      ].forEach((key) => {
        const action = view.getByTestId(`sidebar-utility-${key}`);
        expect(action.props.accessibilityRole).toBe("button");
        expect(action.props.accessibilityLabel.length).toBeGreaterThan(0);
      });

      view.unmount();
    });
  });

  it("hides labels in the rail but keeps them for assistive technology", () => {
    const view = renderSidebar(sessionWith(), { rail: true });

    expect(view.queryByText("View Storefront")).toBeNull();
    expect(
      view.getByTestId("sidebar-utility-view-storefront").props
        .accessibilityLabel,
    ).toBe("View Storefront");
  });
});
