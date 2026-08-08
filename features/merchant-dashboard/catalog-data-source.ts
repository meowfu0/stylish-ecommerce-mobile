import type {
  CatalogPageKey,
  CatalogRecordStatus,
  CatalogTaxonomyRecord,
} from "@/features/merchant-dashboard/dashboard-types";
import { CATALOG_PAGE_KEYS } from "@/features/merchant-dashboard/dashboard-types";
import { AuthRequestError } from "@/services/auth/auth-error";
import {
  type BrandView,
  type CategoryView,
  type CollectionView,
  listBrands,
  listCategories,
  listCollections,
  listProducts,
  type ProductListQuery,
  type ProductSummaryView,
} from "@/services/merchant/catalog-api";

/**
 * Loads the four Catalog pages from the merchant catalog API.
 *
 * Each region resolves independently so one failing endpoint degrades to the
 * partial-data state instead of taking the page down — the same contract the
 * overview's data source gives. Nothing here holds fixtures: every row on these
 * pages comes from PostgreSQL through `/merchants/:merchantId/catalog`.
 */

export const catalogSectionLabels: Record<CatalogPageKey, string> = {
  brands: "Brands",
  categories: "Categories",
  collections: "Collections",
  products: "Products",
};

export type CatalogSectionLoaders = {
  brands: () => Promise<BrandView[]>;
  categories: () => Promise<CategoryView[]>;
  collections: () => Promise<CollectionView[]>;
  products: () => Promise<{
    items: ProductSummaryView[];
    nextCursor: string | null;
  }>;
};

export type CatalogSnapshot = {
  brands: CatalogTaxonomyRecord[];
  categories: CatalogTaxonomyRecord[];
  collections: CatalogTaxonomyRecord[];
  /** Resolves a product's `brandId` to a name for the table. */
  brandNames: ReadonlyMap<string, string>;
  categoryNames: ReadonlyMap<string, string>;
  /** Raw category records, for the product form's category picker. */
  categoryOptions: CategoryView[];
  brandOptions: BrandView[];
  products: ProductSummaryView[];
  /** Opaque; pass back unchanged. Null once the last page is loaded. */
  nextCursor: string | null;
};

export const emptyCatalogSnapshot: CatalogSnapshot = {
  brandNames: new Map(),
  brandOptions: [],
  brands: [],
  categories: [],
  categoryNames: new Map(),
  categoryOptions: [],
  collections: [],
  nextCursor: null,
  products: [],
};

export type CatalogLoadResult = {
  failedSections: CatalogPageKey[];
  snapshot: CatalogSnapshot;
};

export function defaultCatalogSectionLoaders({
  merchantId,
  productQuery = {},
}: {
  merchantId: string;
  productQuery?: ProductListQuery;
}): CatalogSectionLoaders {
  return {
    brands: () => listBrands(merchantId, { limit: 100 }),
    categories: () => listCategories(merchantId, { limit: 100 }),
    collections: () => listCollections(merchantId, { limit: 100 }),
    products: () => listProducts(merchantId, productQuery),
  };
}

function isSessionExpiry(error: unknown) {
  return error instanceof AuthRequestError && error.kind === "session-expired";
}

/**
 * A permission denial is not a load failure: the caller turns it into the
 * permission-denied state, which explains itself, rather than "couldn't be
 * loaded", which does not.
 */
export function isPermissionDenied(error: unknown) {
  return (
    error instanceof AuthRequestError && error.kind === "permission-denied"
  );
}

export async function loadCatalogSnapshot(
  loaders: CatalogSectionLoaders,
): Promise<CatalogLoadResult> {
  const settled = await Promise.allSettled([
    loaders.products(),
    loaders.categories(),
    loaders.collections(),
    loaders.brands(),
  ]);
  const order: CatalogPageKey[] = [
    "products",
    "categories",
    "collections",
    "brands",
  ];

  const fatal = settled.find(
    (result) =>
      result.status === "rejected" &&
      (isSessionExpiry(result.reason) || isPermissionDenied(result.reason)),
  );
  if (fatal && fatal.status === "rejected") {
    throw fatal.reason;
  }

  const failedSections = order.filter(
    (_key, index) => settled[index].status === "rejected",
  );
  const value = <Value>(index: number, fallback: Value): Value => {
    const result = settled[index];
    return result.status === "fulfilled" ? (result.value as Value) : fallback;
  };

  const productPage = value<{
    items: ProductSummaryView[];
    nextCursor: string | null;
  }>(0, { items: [], nextCursor: null });
  const categories = value<CategoryView[]>(1, []);
  const collections = value<CollectionView[]>(2, []);
  const brands = value<BrandView[]>(3, []);

  return {
    failedSections,
    snapshot: {
      brandNames: new Map(brands.map((brand) => [brand.id, brand.name])),
      brandOptions: brands,
      brands: brands.map(brandRecord),
      categories: categories.map(categoryRecord),
      categoryNames: new Map(
        categories.map((category) => [category.id, category.name]),
      ),
      categoryOptions: categories,
      collections: collections.map(collectionRecord),
      nextCursor: productPage.nextCursor,
      products: productPage.items,
    },
  };
}

/** The catalog models activity as a boolean, so the record vocabulary matches. */
function statusFor(isActive: boolean): CatalogRecordStatus {
  return isActive ? "Active" : "Inactive";
}

function brandRecord(brand: BrandView): CatalogTaxonomyRecord {
  return {
    handle: brand.slug,
    key: brand.id,
    name: brand.name,
    // The brand endpoint reports no product count; the page shows an em dash
    // rather than a number the API never gave it.
    status: statusFor(brand.isActive),
    updatedAt: brand.updatedAt,
  };
}

function categoryRecord(category: CategoryView): CatalogTaxonomyRecord {
  return {
    handle: category.slug,
    key: category.id,
    name: category.name,
    // Categories are a platform taxonomy: no per-merchant count, no timestamps.
    status: statusFor(category.isActive),
    updatedAt: "",
  };
}

function collectionRecord(collection: CollectionView): CatalogTaxonomyRecord {
  return {
    handle: collection.slug,
    key: collection.id,
    name: collection.name,
    // The only count the API genuinely reports, from the returned membership.
    productCount: collection.productIds.length,
    status: statusFor(collection.isActive),
    updatedAt: collection.updatedAt,
  };
}
