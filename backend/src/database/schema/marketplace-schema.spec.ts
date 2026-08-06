import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
  is,
  normalizeRelation,
} from 'drizzle-orm';
import type { TablesRelationalConfig } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import type { AnyPgTable } from 'drizzle-orm/pg-core';

import * as schema from './index';
import { collections, productImages, products, productVariants } from './catalog/schema';
import { inventoryBalances } from './inventory/schema';
import { inventoryLocations } from './inventory/schema';
import { merchantVerifications, merchants } from './merchants/schema';

const marketplaceTableCount = 62;

const getSchemaTables = (): AnyPgTable[] => {
  const schemaValues: unknown[] = Object.values(schema);

  return schemaValues.filter((value): value is AnyPgTable => is(value, PgTable));
};

describe('marketplace database schema', () => {
  it('exports every marketplace table and materializes every foreign key', () => {
    const tables = getSchemaTables();

    expect(tables).toHaveLength(marketplaceTableCount);

    for (const table of tables) {
      for (const foreignKey of getTableConfig(table).foreignKeys) {
        expect(() => foreignKey.reference()).not.toThrow();
      }
    }
  });

  it('backs every composite foreign key with a matching primary or unique constraint', () => {
    const tables = getSchemaTables();

    for (const table of tables) {
      for (const foreignKey of getTableConfig(table).foreignKeys) {
        const reference = foreignKey.reference();

        if (reference.foreignColumns.length < 2) {
          continue;
        }

        const foreignTableConfig = getTableConfig(reference.foreignTable);
        const referencedColumnNames = reference.foreignColumns.map((column) => column.name);
        const candidateKeys = [
          ...foreignTableConfig.primaryKeys.map((key) => key.columns.map((column) => column.name)),
          ...foreignTableConfig.uniqueConstraints.map((key) =>
            key.columns.map((column) => column.name),
          ),
        ];

        expect(candidateKeys).toContainEqual(referencedColumnNames);
      }
    }
  });

  it('normalizes every declared Drizzle relation', () => {
    const relationalConfig = extractTablesRelationalConfig<TablesRelationalConfig>(
      schema,
      createTableRelationsHelpers,
    );

    for (const table of Object.values(relationalConfig.tables)) {
      for (const relation of Object.values(table.relations)) {
        expect(() =>
          normalizeRelation(relationalConfig.tables, relationalConfig.tableNamesMap, relation),
        ).not.toThrow();
      }
    }
  });

  it('keeps stock out of variants and in location balances', () => {
    const variantColumnNames = getTableConfig(productVariants).columns.map((column) => column.name);
    const balanceColumnNames = getTableConfig(inventoryBalances).columns.map(
      (column) => column.name,
    );

    expect(variantColumnNames).not.toContain('stock_on_hand');
    expect(variantColumnNames).not.toContain('stock_reserved');
    expect(balanceColumnNames).toEqual(
      expect.arrayContaining(['merchant_id', 'location_id', 'stock_on_hand', 'stock_reserved']),
    );
  });

  it('enforces one open application, pending review, and active default location', () => {
    const merchantIndexes = getTableConfig(merchants).indexes.map((index) => index.config.name);
    const verificationIndexes = getTableConfig(merchantVerifications).indexes.map(
      (index) => index.config.name,
    );
    const locationIndexes = getTableConfig(inventoryLocations).indexes.map(
      (index) => index.config.name,
    );

    expect(merchantIndexes).toContain('merchants_applicant_open_application_unique');
    expect(verificationIndexes).toContain('merchant_verifications_pending_merchant_unique');
    expect(locationIndexes).toContain('inventory_locations_default_unique');
  });

  it('enforces private product-image metadata and one primary image per product', () => {
    const config = getTableConfig(productImages);
    const columnNames = config.columns.map((column) => column.name);
    const indexNames = config.indexes.map((index) => index.config.name);
    const uniqueConstraintNames = config.uniqueConstraints.map((constraint) => constraint.name);
    const checkNames = config.checks.map((check) => check.name);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        'status',
        'storage_path',
        'content_type',
        'size_bytes',
        'upload_expires_at',
        'confirmed_at',
      ]),
    );
    expect(indexNames).toEqual(
      expect.arrayContaining([
        'product_images_primary_unique',
        'product_images_pending_expiry_idx',
      ]),
    );
    expect(uniqueConstraintNames).toContain('product_images_storage_path_unique');
    expect(checkNames).toEqual(
      expect.arrayContaining([
        'product_images_content_type_check',
        'product_images_size_bytes_check',
        'product_images_lifecycle_check',
        'product_images_upload_expiry_check',
      ]),
    );
  });

  it('supports public storefront visibility, featured listings, brands, and variant prices', () => {
    const collectionIndexes = getTableConfig(collections).indexes.map((index) => index.config.name);
    const productIndexes = getTableConfig(products).indexes.map((index) => index.config.name);
    const variantIndexes = getTableConfig(productVariants).indexes.map(
      (index) => index.config.name,
    );

    expect(collectionIndexes).toContain('collections_storefront_active_slug_unique');
    expect(productIndexes).toEqual(
      expect.arrayContaining([
        'products_storefront_active_slug_unique',
        'products_storefront_featured_published_idx',
        'products_storefront_brand_published_idx',
      ]),
    );
    expect(variantIndexes).toContain('product_variants_storefront_active_price_idx');
  });
});
