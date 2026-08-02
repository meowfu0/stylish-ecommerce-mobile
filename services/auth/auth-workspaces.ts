import type { Href } from "expo-router";

import type { AuthenticatedUserContext } from "@/services/auth/auth-types";

export type AuthWorkspace = {
  description: string;
  key: string;
  kind: "customer" | "merchant" | "platform";
  merchantId?: string;
  roleLabel: string;
  title: string;
};

const WORKSPACE_DESTINATIONS: Readonly<Record<AuthWorkspace["kind"], Href>> = {
  customer: "/(tabs)/home",
  merchant: "/merchant/dashboard" as Href,
  platform: "/(tabs)/home",
};

const MERCHANT_ROLE_LABELS: Readonly<Record<string, string>> = {
  admin: "Merchant Administrator",
  catalog_staff: "Catalog Staff",
  fulfillment_staff: "Fulfillment Staff",
  inventory_staff: "Inventory Staff",
  manager: "Merchant Manager",
  owner: "Merchant Owner",
  support_staff: "Support Staff",
};

const MERCHANT_ROLE_PRIORITY = [
  "owner",
  "admin",
  "manager",
  "catalog_staff",
  "inventory_staff",
  "fulfillment_staff",
  "support_staff",
] as const;

function roleLabelFor(roleKeys: string[]) {
  const normalizedRoles = roleKeys.map((role) => role.trim().toLowerCase());
  const primaryRole = MERCHANT_ROLE_PRIORITY.find((role) =>
    normalizedRoles.includes(role),
  );

  if (primaryRole) {
    return MERCHANT_ROLE_LABELS[primaryRole];
  }

  const backendRole = normalizedRoles[0];
  if (!backendRole) {
    return "Merchant workspace";
  }

  return backendRole
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function workspacesFromAuthContext(
  context: AuthenticatedUserContext,
): AuthWorkspace[] {
  const platformRoles = new Set(
    context.platformRoles.map((role) => role.trim().toLowerCase()),
  );
  const workspaces: AuthWorkspace[] = [];

  if (platformRoles.has("customer")) {
    workspaces.push({
      description:
        "Browse the marketplace, track orders, and manage your personal account.",
      key: "customer",
      kind: "customer",
      roleLabel: "Customer",
      title: "Shop as Customer",
    });
  }

  const seenMerchantIds = new Set<string>();
  for (const membership of context.merchantMemberships) {
    if (seenMerchantIds.has(membership.merchantId)) {
      continue;
    }

    seenMerchantIds.add(membership.merchantId);
    workspaces.push({
      description: `Run the ${membership.merchantName} storefront: catalog, inventory, orders, and staff.`,
      key: `merchant:${membership.merchantId}`,
      kind: "merchant",
      merchantId: membership.merchantId,
      roleLabel: roleLabelFor(membership.roles),
      title: `Manage ${membership.merchantName}`,
    });
  }

  if (platformRoles.has("platform_admin")) {
    workspaces.push({
      description:
        "Oversee merchants, marketplace policy, and platform-wide operations.",
      key: "platform",
      kind: "platform",
      roleLabel: "Platform Administrator",
      title: "Platform Administration",
    });
  }

  return workspaces;
}

export function destinationForWorkspace(workspace: AuthWorkspace): Href {
  return WORKSPACE_DESTINATIONS[workspace.kind];
}
