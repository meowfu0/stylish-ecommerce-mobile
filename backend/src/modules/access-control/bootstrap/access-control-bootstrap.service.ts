import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { permissions, rolePermissions, roles } from '../../../database/schema';

type Scope = 'PLATFORM' | 'MERCHANT';

type RoleDefinition = {
  key: string;
  name: string;
  scope: Scope;
  permissions: string[];
};

const PERMISSIONS = [
  ['account.self.read', 'account', 'read_self'],
  ['account.self.update', 'account', 'update_self'],
  ['account.merchant_application.create', 'merchant_application', 'create_self'],
  ['account.merchant_application.read', 'merchant_application', 'read_self'],
  ['account.merchant_application.update', 'merchant_application', 'update_self'],
  ['account.merchant_application.submit', 'merchant_application', 'submit_self'],
  ['platform.users.read', 'platform_users', 'read'],
  ['platform.users.manage', 'platform_users', 'manage'],
  ['platform.merchants.read', 'platform_merchants', 'read'],
  ['platform.merchants.manage', 'platform_merchants', 'manage'],
  ['platform.audit.read', 'platform_audit', 'read'],
  ['merchant.profile.read', 'merchant_profile', 'read'],
  ['merchant.profile.update', 'merchant_profile', 'update'],
  ['merchant.members.read', 'merchant_members', 'read'],
  ['merchant.members.manage', 'merchant_members', 'manage'],
  ['merchant.catalog.read', 'merchant_catalog', 'read'],
  ['merchant.catalog.write', 'merchant_catalog', 'write'],
  ['merchant.inventory.read', 'merchant_inventory', 'read'],
  ['merchant.inventory.adjust', 'merchant_inventory', 'adjust'],
  ['merchant.inventory.locations.manage', 'merchant_inventory_locations', 'manage'],
  ['merchant.orders.read', 'merchant_orders', 'read'],
  ['merchant.orders.fulfill', 'merchant_orders', 'fulfill'],
  ['merchant.payments.read', 'merchant_payments', 'read'],
  ['merchant.payments.refund', 'merchant_payments', 'refund'],
  ['merchant.promotions.read', 'merchant_promotions', 'read'],
  ['merchant.promotions.write', 'merchant_promotions', 'write'],
  ['merchant.reviews.read', 'merchant_reviews', 'read'],
  ['merchant.reviews.moderate', 'merchant_reviews', 'moderate'],
  ['products.read', 'products', 'read'],
  ['products.write', 'products', 'write'],
  ['products.publish', 'products', 'publish'],
] as const;

const ALL_PLATFORM_PERMISSIONS = PERMISSIONS.filter(([key]) => key.startsWith('platform.')).map(
  ([key]) => key,
);
const ALL_MERCHANT_PERMISSIONS = PERMISSIONS.filter(([key]) => key.startsWith('merchant.')).map(
  ([key]) => key,
);
const MERCHANT_APPLICATION_PERMISSIONS = PERMISSIONS.filter(([key]) =>
  key.startsWith('account.merchant_application.'),
).map(([key]) => key);
const PRODUCT_PERMISSIONS = PERMISSIONS.filter(([key]) => key.startsWith('products.')).map(
  ([key]) => key,
);

const ROLES: RoleDefinition[] = [
  {
    key: 'customer',
    name: 'Customer',
    scope: 'PLATFORM',
    permissions: ['account.self.read', 'account.self.update', ...MERCHANT_APPLICATION_PERMISSIONS],
  },
  {
    key: 'platform_admin',
    name: 'Platform Administrator',
    scope: 'PLATFORM',
    permissions: [
      'account.self.read',
      'account.self.update',
      ...MERCHANT_APPLICATION_PERMISSIONS,
      ...ALL_PLATFORM_PERMISSIONS,
    ],
  },
  {
    key: 'owner',
    name: 'Merchant Owner',
    scope: 'MERCHANT',
    permissions: [...ALL_MERCHANT_PERMISSIONS, ...PRODUCT_PERMISSIONS],
  },
  {
    key: 'admin',
    name: 'Merchant Administrator',
    scope: 'MERCHANT',
    permissions: [...ALL_MERCHANT_PERMISSIONS, ...PRODUCT_PERMISSIONS],
  },
  {
    key: 'manager',
    name: 'Merchant Manager',
    scope: 'MERCHANT',
    permissions: [
      ...ALL_MERCHANT_PERMISSIONS.filter(
        (key) => key !== 'merchant.members.manage' && key !== 'merchant.payments.refund',
      ),
      ...PRODUCT_PERMISSIONS,
    ],
  },
  {
    key: 'catalog_staff',
    name: 'Catalog Staff',
    scope: 'MERCHANT',
    permissions: [
      'merchant.profile.read',
      'merchant.catalog.read',
      'merchant.catalog.write',
      'products.read',
      'products.write',
    ],
  },
  {
    key: 'inventory_staff',
    name: 'Inventory Staff',
    scope: 'MERCHANT',
    permissions: ['merchant.profile.read', 'merchant.inventory.read', 'merchant.inventory.adjust'],
  },
  {
    key: 'fulfillment_staff',
    name: 'Fulfillment Staff',
    scope: 'MERCHANT',
    permissions: [
      'merchant.profile.read',
      'merchant.inventory.read',
      'merchant.orders.read',
      'merchant.orders.fulfill',
    ],
  },
  {
    key: 'support_staff',
    name: 'Support Staff',
    scope: 'MERCHANT',
    permissions: [
      'merchant.profile.read',
      'merchant.members.read',
      'merchant.orders.read',
      'merchant.payments.read',
      'merchant.reviews.read',
    ],
  },
];

@Injectable()
export class AccessControlBootstrapService {
  constructor(private readonly databaseService: DatabaseService) {}

  async bootstrap(): Promise<{ permissions: number; roles: number }> {
    return this.databaseService.db.transaction(async (tx) => {
      const permissionIds = new Map<string, string>();

      for (const [key, resource, action] of PERMISSIONS) {
        await tx.insert(permissions).values({ key, resource, action }).onConflictDoNothing();
        const [permission] = await tx
          .select({ id: permissions.id })
          .from(permissions)
          .where(eq(permissions.key, key))
          .limit(1);

        if (!permission) {
          throw new Error('Permission bootstrap failed');
        }

        permissionIds.set(key, permission.id);
      }

      for (const definition of ROLES) {
        await tx
          .insert(roles)
          .values({
            key: definition.key,
            name: definition.name,
            scope: definition.scope,
            isSystem: true,
          })
          .onConflictDoNothing();
        const [role] = await tx
          .select({ id: roles.id })
          .from(roles)
          .where(and(eq(roles.scope, definition.scope), eq(roles.key, definition.key)))
          .limit(1);

        if (!role) {
          throw new Error('Role bootstrap failed');
        }

        await tx
          .update(roles)
          .set({ name: definition.name, isSystem: true, updatedAt: new Date() })
          .where(eq(roles.id, role.id));

        for (const permissionKey of definition.permissions) {
          const permissionId = permissionIds.get(permissionKey);

          if (!permissionId) {
            throw new Error('Role permission bootstrap failed');
          }

          await tx
            .insert(rolePermissions)
            .values({ roleId: role.id, permissionId })
            .onConflictDoNothing();
        }
      }

      return { permissions: PERMISSIONS.length, roles: ROLES.length };
    });
  }
}
