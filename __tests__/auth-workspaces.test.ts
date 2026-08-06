import {
  destinationForWorkspace,
  workspacesFromAuthContext,
} from "@/services/auth/auth-workspaces";
import type { AuthenticatedUserContext } from "@/services/auth/auth-types";

function context(
  overrides: Partial<AuthenticatedUserContext> = {},
): AuthenticatedUserContext {
  return {
    email: "customer@example.com",
    emailVerifiedAt: "2026-08-01T00:00:00.000Z",
    id: "user-1",
    merchantMemberships: [],
    platformRoles: ["customer"],
    profile: null,
    status: "ACTIVE",
    ...overrides,
  };
}

describe("authentication workspaces", () => {
  it("automatically produces the single customer context", () => {
    const workspaces = workspacesFromAuthContext(context());

    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]).toMatchObject({
      key: "customer",
      kind: "customer",
      roleLabel: "Customer",
    });
    expect(destinationForWorkspace(workspaces[0])).toBe("/(tabs)/home");
  });

  it("builds merchant and platform contexts only from backend roles", () => {
    const workspaces = workspacesFromAuthContext(
      context({
        merchantMemberships: [
          {
            merchantId: "merchant-1",
            merchantName: "Lumiere",
            membershipId: "membership-1",
            roles: ["owner"],
          },
        ],
        platformRoles: ["customer", "platform_admin"],
      }),
    );

    expect(workspaces.map((workspace) => workspace.key)).toEqual([
      "customer",
      "merchant:merchant-1",
      "platform",
    ]);
    expect(workspaces[1].roleLabel).toBe("Merchant Owner");
    expect(destinationForWorkspace(workspaces[1])).toBe("/merchant/dashboard");
  });

  it("deduplicates repeated merchant memberships", () => {
    const membership = {
      merchantId: "merchant-1",
      merchantName: "Lumiere",
      membershipId: "membership-1",
      roles: ["manager"],
    };

    const workspaces = workspacesFromAuthContext(
      context({ merchantMemberships: [membership, membership] }),
    );

    expect(
      workspaces.filter((workspace) => workspace.kind === "merchant"),
    ).toHaveLength(1);
  });
});
