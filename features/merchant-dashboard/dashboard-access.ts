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

export const rolePermissions: Record<MerchantRole, Permission[]> = {
  "Merchant Owner": merchantPermissions,
  "Merchant Administrator": merchantPermissions,
  Manager: merchantPermissions.filter(
    (permission) =>
      permission !== "staff.manage" && permission !== "settings.manage",
  ),
  "Catalog Staff": ["products.read", "products.write", "products.publish"],
  "Inventory Staff": [
    "products.read",
    "inventory.read",
    "inventory.adjust",
    "inventory.locations.manage",
  ],
  "Fulfillment Staff": ["inventory.read", "orders.read", "orders.fulfill"],
  "Support Staff": [
    "products.read",
    "orders.read",
    "reviews.moderate",
    "merchant.profile.update",
  ],
};

export function can(session: MerchantSession, permission: Permission) {
  return session.permissions.includes(permission);
}

export function normalizeMerchantRole(roleLabel: string): MerchantRole {
  const aliases: Partial<Record<string, MerchantRole>> = {
    admin: "Merchant Administrator",
    catalog_staff: "Catalog Staff",
    fulfillment_staff: "Fulfillment Staff",
    inventory_staff: "Inventory Staff",
    manager: "Manager",
    owner: "Merchant Owner",
    support_staff: "Support Staff",
  };
  const normalized = roleLabel.trim();
  const direct = Object.keys(rolePermissions).find(
    (role) => role.toLowerCase() === normalized.toLowerCase(),
  ) as MerchantRole | undefined;

  return direct ?? aliases[normalized.toLowerCase()] ?? "Support Staff";
}
