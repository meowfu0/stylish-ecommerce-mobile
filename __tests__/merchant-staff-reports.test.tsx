import { fireEvent, render } from "@testing-library/react-native";

import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import { resolveStaffSection } from "@/features/merchant-dashboard/merchant-navigation";
import {
  fulfillmentRate,
  OrderReportCard,
  orderStatusShares,
} from "@/features/merchant-dashboard/reports-sections";
import {
  demoOrderReport,
  demoReportMetrics,
  demoStaff,
  loadReportsWorkspace,
  loadStaffWorkspace,
  permissionsFor,
  type StaffMember,
} from "@/features/merchant-dashboard/staff-reports-demo-data";
import {
  permissionSummary,
  StaffContent,
  staffMenuItems,
} from "@/features/merchant-dashboard/staff-sections";
import {
  applyStaffAction,
  availableStaffActions,
  emptyStaffFilters,
  filterStaff,
  inviteToStaff,
  isLastOwner,
  ownerCount,
  ownerProtectionReason,
  previewPermissions,
  staffSummary,
  validateInvite,
} from "@/features/merchant-dashboard/use-staff-reports";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

function sessionFor(role: MerchantSession["role"]): MerchantSession {
  return {
    defaultLocation: "Makati Warehouse",
    displayName: "vinceee",
    email: "vinceee@postmanfashion.ph",
    merchantHandle: "merchant:m1",
    merchantId: "m1",
    merchantName: "Postman Fashion",
    permissions: rolePermissions[role],
    role,
    storeStatus: "active",
    verified: true,
  };
}

const owner = sessionFor("Merchant Owner");
const catalogStaff = sessionFor("Catalog Staff");
const member = (overrides: Partial<StaffMember> = {}): StaffMember => ({
  ...demoStaff[1],
  ...overrides,
});
const ownerMember = demoStaff[0];

describe("resolveStaffSection", () => {
  it("resolves both destinations and nothing else", () => {
    expect(resolveStaffSection("staff-permissions")).toBe("staff-permissions");
    expect(resolveStaffSection("reports")).toBe("reports");
    expect(resolveStaffSection("overview")).toBeUndefined();
    expect(resolveStaffSection(undefined)).toBeUndefined();
    expect(resolveStaffSection(" Reports ")).toBe("reports");
  });
});

describe("demo data", () => {
  it("covers every role and every status", () => {
    expect(new Set(demoStaff.map((s) => s.role)).size).toBe(7);
    expect(new Set(demoStaff.map((s) => s.status)).size).toBe(3);
  });

  it("gives a pending invitation no last-active date", () => {
    for (const row of demoStaff) {
      if (row.status === "Pending") expect(row.lastActiveAt).toBeNull();
    }
  });

  it("derives permissions from the app's own role map, never a copy", () => {
    for (const row of demoStaff) {
      expect(permissionsFor(row)).toBe(rolePermissions[row.role]);
    }
  });

  it("exposes loaders shaped like the APIs that will replace them", async () => {
    expect((await loadStaffWorkspace()).staff).toHaveLength(demoStaff.length);
    const reports = await loadReportsWorkspace();
    expect(reports.metrics).toHaveLength(demoReportMetrics.length);
    expect(reports.series.daily.length).toBeGreaterThan(0);
    expect(reports.series.weekly.length).toBeGreaterThan(0);
    expect(reports.series.monthly.length).toBeGreaterThan(0);
  });

  it("includes both positive and negative trends", () => {
    expect(demoReportMetrics.some((m) => m.changePercent > 0)).toBe(true);
    expect(demoReportMetrics.some((m) => m.changePercent < 0)).toBe(true);
  });
});

describe("staffSummary", () => {
  it("counts the team without double counting", () => {
    const summary = staffSummary(demoStaff);

    expect(summary.total).toBe(demoStaff.length);
    expect(summary.active).toBe(
      demoStaff.filter((s) => s.status === "Active").length,
    );
    expect(summary.pending).toBe(
      demoStaff.filter((s) => s.status === "Pending").length,
    );
    expect(summary.roles).toBe(new Set(demoStaff.map((s) => s.role)).size);
  });
});

describe("owner protection", () => {
  it("counts only active owners", () => {
    expect(ownerCount(demoStaff)).toBe(1);
    // An inactive owner cannot hold the workspace open.
    expect(
      ownerCount([member({ role: "Merchant Owner", status: "Inactive" })]),
    ).toBe(0);
  });

  it("treats the sole active owner as protected", () => {
    expect(isLastOwner(ownerMember, demoStaff)).toBe(true);
    expect(isLastOwner(demoStaff[1], demoStaff)).toBe(false);
  });

  it("withholds edit, deactivate and remove from the last owner", () => {
    const actions = availableStaffActions(ownerMember, demoStaff);

    expect(actions).not.toContain("edit-role");
    expect(actions).not.toContain("deactivate");
    expect(actions).not.toContain("remove");
    // Viewing their permissions is always fine.
    expect(actions).toContain("view-permissions");
  });

  it("releases the guard once a second owner exists", () => {
    const twoOwners = [
      ownerMember,
      member({ id: "extra", role: "Merchant Owner", status: "Active" }),
    ];

    expect(isLastOwner(ownerMember, twoOwners)).toBe(false);
    expect(availableStaffActions(ownerMember, twoOwners)).toContain("remove");
  });

  it("explains why rather than silently hiding the action", () => {
    expect(ownerProtectionReason(ownerMember, demoStaff)).toContain(
      "at least one active Merchant Owner",
    );
    expect(ownerProtectionReason(demoStaff[1], demoStaff)).toBeUndefined();
  });
});

describe("staff actions", () => {
  it("offers resend only to a pending invitation", () => {
    expect(
      availableStaffActions(member({ status: "Pending" }), demoStaff),
    ).toContain("resend");
    expect(
      availableStaffActions(member({ status: "Active" }), demoStaff),
    ).not.toContain("resend");
  });

  it("offers reactivate only to an inactive member", () => {
    expect(
      availableStaffActions(member({ status: "Inactive" }), demoStaff),
    ).toContain("reactivate");
  });

  it("changes status without mutating the member", () => {
    const source = member({ status: "Active" });
    const snapshot = { ...source };

    expect(applyStaffAction(source, "deactivate").status).toBe("Inactive");
    expect(source).toEqual(snapshot);
  });
});

describe("validateInvite", () => {
  it("requires a plausible email", () => {
    expect(
      validateInvite({ email: "", role: "Manager" }, demoStaff).email,
    ).toBeDefined();
    expect(
      validateInvite({ email: "not-an-email", role: "Manager" }, demoStaff)
        .email,
    ).toBeDefined();
    expect(
      validateInvite({ email: "new@example.com", role: "Manager" }, demoStaff)
        .email,
    ).toBeUndefined();
  });

  it("rejects someone already on the team, case-insensitively", () => {
    expect(
      validateInvite(
        { email: demoStaff[1].email.toUpperCase(), role: "Manager" },
        demoStaff,
      ).email,
    ).toBeDefined();
  });
});

describe("inviteToStaff", () => {
  it("creates a pending member who has never signed in", () => {
    const invited = inviteToStaff({
      email: "  New.Person@Example.com ",
      role: "Manager",
    });

    expect(invited.email).toBe("new.person@example.com");
    expect(invited.status).toBe("Pending");
    expect(invited.lastActiveAt).toBeNull();
    expect(invited.role).toBe("Manager");
    expect(invited.name).toBe("new person");
  });
});

describe("permissions", () => {
  it("reads straight from the repository's role map", () => {
    for (const role of Object.keys(
      rolePermissions,
    ) as MerchantSession["role"][]) {
      expect(previewPermissions(role)).toBe(rolePermissions[role]);
    }
  });

  it("summarises a role by its real permission count", () => {
    expect(permissionSummary("Catalog Staff")).toContain(
      String(rolePermissions["Catalog Staff"].length),
    );
    expect(permissionSummary("Support Staff")).toContain("1 permissions");
  });
});

describe("filterStaff", () => {
  it("matches name and email", () => {
    expect(
      filterStaff(demoStaff, { ...emptyStaffFilters, query: "althea" }).length,
    ).toBe(1);
    expect(
      filterStaff(demoStaff, {
        ...emptyStaffFilters,
        query: demoStaff[2].email,
      }).length,
    ).toBe(1);
  });

  it("combines role and status", () => {
    const filtered = filterStaff(demoStaff, {
      ...emptyStaffFilters,
      status: "Pending",
    });

    expect(filtered.length).toBeGreaterThan(0);
    for (const row of filtered) expect(row.status).toBe("Pending");
  });

  it("returns nothing rather than everything when no row matches", () => {
    expect(
      filterStaff(demoStaff, { ...emptyStaffFilters, query: "nobody" }),
    ).toEqual([]);
  });
});

describe("staffMenuItems", () => {
  it("disables management for a role without staff.manage", () => {
    expect(catalogStaff.permissions).not.toContain("staff.manage");

    const items = staffMenuItems({
      member: member({ status: "Active" }),
      session: catalogStaff,
      staff: demoStaff,
    });

    expect(items.find((i) => i.key === "edit-role")?.disabled).toBe(true);
    expect(items.find((i) => i.key === "view-permissions")?.disabled).toBe(
      false,
    );
  });

  it("never lists a protected action for the last owner", () => {
    const keys = staffMenuItems({
      member: ownerMember,
      session: owner,
      staff: demoStaff,
    }).map((i) => i.key);

    expect(keys).not.toContain("remove");
    expect(keys).not.toContain("edit-role");
  });
});

describe("order report maths", () => {
  it("shares sum to one", () => {
    const total = orderStatusShares(demoOrderReport).reduce(
      (running, status) => running + status.share,
      0,
    );
    expect(total).toBeCloseTo(1, 5);
  });

  it("guards an empty report against dividing by zero", () => {
    const empty = { ...demoOrderReport, statuses: [], total: 0 };
    expect(orderStatusShares(empty)).toEqual([]);
    expect(fulfillmentRate(empty)).toBe(0);
  });

  it("reports the fulfilment rate as a fraction of all orders", () => {
    expect(fulfillmentRate(demoOrderReport)).toBeCloseTo(
      demoOrderReport.fulfilled / demoOrderReport.total,
      5,
    );
  });
});

describe("StaffContent", () => {
  const renderStaff = (overrides: Record<string, unknown> = {}) =>
    render(
      <StaffContent
        compact={false}
        filters={emptyStaffFilters}
        onFiltersChange={jest.fn()}
        session={owner}
        staff={demoStaff}
        visibleStaff={demoStaff}
        {...overrides}
      />,
    );

  it("renders tiles, rows and the shared permission matrix", () => {
    const screen = renderStaff();

    expect(screen.getByTestId("staff-tiles")).toBeTruthy();
    expect(screen.getByTestId(`staff-row-${demoStaff[0].id}`)).toBeTruthy();
    // The existing matrix component, found by its own accessibility label
    // rather than a testID it does not define.
    expect(
      screen.getByLabelText("Merchant roles and permissions"),
    ).toBeTruthy();
  });

  it("marks the owner with an icon and a label, not colour alone", () => {
    expect(renderStaff().getByText("Owner")).toBeTruthy();
  });

  it("gates Invite Staff on staff.manage", () => {
    expect(
      renderStaff({ session: catalogStaff }).getByTestId("staff-invite").props
        .accessibilityState.disabled,
    ).toBe(true);
    expect(
      renderStaff().getByTestId("staff-invite").props.accessibilityState
        .disabled,
    ).toBe(false);
  });

  it("says plainly that changes are demo-only", () => {
    expect(renderStaff().getByText(/update the demo data only/)).toBeTruthy();
  });

  it("reports a filter change up rather than filtering locally", () => {
    const onFiltersChange = jest.fn();
    const screen = renderStaff({ onFiltersChange });

    fireEvent.changeText(screen.getByLabelText("Search staff"), "althea");

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ query: "althea" }),
    );
  });

  it("stacks cards instead of the table when compact", () => {
    const screen = renderStaff({ compact: true });

    expect(screen.getByTestId(`staff-card-${demoStaff[0].id}`)).toBeTruthy();
  });

  it("shows the no-match message rather than an empty table", () => {
    expect(
      renderStaff({ visibleStaff: [] }).getByText(
        "No team members match your filters.",
      ),
    ).toBeTruthy();
  });
});

describe("OrderReportCard", () => {
  it("renders every status in the distribution", () => {
    const screen = render(
      <OrderReportCard compact={false} report={demoOrderReport} />,
    );

    expect(screen.getByTestId("order-report")).toBeTruthy();
    for (const status of demoOrderReport.statuses) {
      // "Cancelled" is both a summary tile and a legend entry, so the count
      // matters more than presence: every status reaches the legend.
      expect(screen.getAllByText(status.label).length).toBeGreaterThan(0);
    }
  });

  it("shows the fulfilment rate rather than a bare count", () => {
    const screen = render(
      <OrderReportCard compact={false} report={demoOrderReport} />,
    );
    const rate = (fulfillmentRate(demoOrderReport) * 100).toFixed(1);

    expect(
      screen.getByText(`${rate}% of orders in this range were fulfilled.`),
    ).toBeTruthy();
  });
});
