import type {
  MerchantRole,
  MerchantSession,
  Permission,
} from "@/features/merchant-dashboard/dashboard-types";

export const merchantPermissions: Permission[] = [
  "products.read",
  "products.write",
  "products.publish",
  "inventory.read",
  "inventory.adjust",
  "inventory.locations.manage",
  "orders.read",
  "orders.fulfill",
  "promotions.manage",
  "reviews.moderate",
  "staff.manage",
  "reports.read",
  "merchant.profile.update",
  "settings.manage",
];

export const dashboardMatrixPermissions: Permission[] = [
  "products.read",
  "products.write",
  "products.publish",
  "inventory.read",
  "inventory.adjust",
  "inventory.locations.manage",
  "orders.read",
  "orders.fulfill",
  "merchant.profile.update",
  "staff.manage",
];

export const rolePermissions: Record<MerchantRole, Permission[]> = {
  "Merchant Owner": merchantPermissions,
  "Merchant Administrator": merchantPermissions,
  Manager: merchantPermissions.filter(
    (permission) =>
      permission !== "staff.manage" && permission !== "settings.manage",
  ),
  "Catalog Staff": ["products.read", "products.write"],
  "Inventory Staff": ["inventory.read", "inventory.adjust"],
  "Fulfillment Staff": ["inventory.read", "orders.read", "orders.fulfill"],
  "Support Staff": ["orders.read"],
};

const permissionAliases: Readonly<Record<string, Permission>> = {
  "merchant.catalog.read": "products.read",
  "merchant.catalog.write": "products.write",
  "merchant.inventory.adjust": "inventory.adjust",
  "merchant.inventory.locations.manage": "inventory.locations.manage",
  "merchant.inventory.read": "inventory.read",
  "merchant.members.manage": "staff.manage",
  "merchant.orders.fulfill": "orders.fulfill",
  "merchant.orders.read": "orders.read",
  "merchant.profile.update": "merchant.profile.update",
  "merchant.promotions.write": "promotions.manage",
  "merchant.reviews.moderate": "reviews.moderate",
};

export function can(session: MerchantSession, permission: Permission) {
  return session.permissions.includes(permission);
}

export function normalizeMerchantRole(
  roleLabel: string,
): MerchantRole | undefined {
  const aliases: Partial<Record<string, MerchantRole>> = {
    admin: "Merchant Administrator",
    catalog_staff: "Catalog Staff",
    fulfillment_staff: "Fulfillment Staff",
    inventory_staff: "Inventory Staff",
    manager: "Manager",
    "merchant manager": "Manager",
    owner: "Merchant Owner",
    support_staff: "Support Staff",
  };
  const normalized = roleLabel.trim();
  const direct = Object.keys(rolePermissions).find(
    (role) => role.toLowerCase() === normalized.toLowerCase(),
  ) as MerchantRole | undefined;

  return direct ?? aliases[normalized.toLowerCase()];
}

export function resolveMerchantPermissions(
  backendPermissions: string[] | undefined,
  role: MerchantRole | undefined,
): Permission[] {
  if (backendPermissions === undefined) {
    return role ? rolePermissions[role] : [];
  }

  const resolved = backendPermissions
    .map((permission) => {
      const normalized = permission.trim().toLowerCase();
      if (merchantPermissions.includes(normalized as Permission)) {
        return normalized as Permission;
      }
      return permissionAliases[normalized];
    })
    .filter((permission): permission is Permission => Boolean(permission));

  return [...new Set(resolved)];
}
