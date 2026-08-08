import { apiRequest } from "@/services/api/api-client";

/**
 * The merchant catalog API.
 *
 * Every type and route here mirrors the backend one-for-one — see
 * `backend/src/modules/catalog/types/catalog.types.ts`,
 * `dto/catalog-request.dto.ts` and `docs/frontend-merchant-catalog.md`. Nothing
 * is added that the server does not return, because a field invented here would
 * silently become a lie on screen.
 *
 * Base path: `/merchants/:merchantId/catalog`. The merchant ID is always taken
 * from the selected workspace and never from anything the user can type, and the
 * server independently re-checks membership and permission on every call.
 */

export type ProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export const PRODUCT_STATUSES: readonly ProductStatus[] = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
];
export const STOCK_STATUSES: readonly StockStatus[] = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
];

export type BrandView = {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CategoryView = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type CollectionView = {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  productIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ProductOptionValueView = {
  id: string;
  optionId: string;
  value: string;
  displayLabel: string;
  swatchHex: string | null;
  displayOrder: number;
};

export type ProductOptionView = {
  id: string;
  name: string;
  displayOrder: number;
  values: ProductOptionValueView[];
};

export type ProductVariantView = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  priceCentavos: number;
  compareAtPriceCentavos: number | null;
  isDefault: boolean;
  isActive: boolean;
  optionValueIds: string[];
  availableStock: number;
  stockStatus: StockStatus;
  createdAt: string;
  updatedAt: string;
};

/** What the product list returns. Note: no price, variant count or category. */
export type ProductSummaryView = {
  id: string;
  merchantId: string;
  brandId: string | null;
  name: string;
  slug: string;
  status: ProductStatus;
  isFeatured: boolean;
  publishedAt: string | null;
  availableStock: number;
  stockStatus: StockStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProductDetailsView = ProductSummaryView & {
  shortDescription: string | null;
  description: string | null;
  categoryIds: string[];
  primaryCategoryId: string | null;
  collectionIds: string[];
  options: ProductOptionView[];
  variants: ProductVariantView[];
};

export type ProductListView = {
  items: ProductSummaryView[];
  nextCursor: string | null;
};

/** Exactly the fields `CreateProductDto` accepts. Status is server-assigned. */
export type CreateProductBody = {
  name: string;
  slug: string;
  brandId?: string;
  shortDescription?: string;
  description?: string;
  isFeatured?: boolean;
  categoryIds?: string[];
  primaryCategoryId?: string;
};

/** `UpdateProductDto`. Nullable fields clear the column; status is not writable. */
export type UpdateProductBody = {
  name?: string;
  slug?: string;
  brandId?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  isFeatured?: boolean;
  categoryIds?: string[];
  primaryCategoryId?: string | null;
};

export type ProductListQuery = {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  stockStatus?: StockStatus;
};

const catalogPath = (merchantId: string, suffix = "") =>
  `/merchants/${merchantId}/catalog${suffix}`;

function queryString(query: Record<string, string | number | undefined>) {
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  return params.length > 0 ? `?${params.join("&")}` : "";
}

/**
 * Creation and every lifecycle action require an idempotency key of 8–128
 * characters from `A-Z a-z 0-9 . _ : -`. Replaying a key with the same body
 * returns the original product, so a double-tap cannot create two products.
 */
export function newIdempotencyKey(seed?: string) {
  const random = `${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
  const key = `${seed ? `${seed}.` : ""}${Date.now().toString(36)}.${random}`;
  return key.replace(/[^A-Za-z0-9._:-]/g, "").slice(0, 128);
}

export async function listProducts(
  merchantId: string,
  query: ProductListQuery = {},
) {
  const response = await apiRequest<ProductListView>(
    `${catalogPath(merchantId, "/products")}${queryString(query)}`,
    { auth: true, method: "GET" },
  );
  return response.data;
}

export async function getProduct(merchantId: string, productId: string) {
  const response = await apiRequest<ProductDetailsView>(
    catalogPath(merchantId, `/products/${productId}`),
    { auth: true, method: "GET" },
  );
  return response.data;
}

export async function createProduct(
  merchantId: string,
  body: CreateProductBody,
  idempotencyKey: string,
) {
  const response = await apiRequest<ProductDetailsView>(
    catalogPath(merchantId, "/products"),
    {
      auth: true,
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": idempotencyKey },
      method: "POST",
    },
  );
  return response.data;
}

export async function updateProduct(
  merchantId: string,
  productId: string,
  body: UpdateProductBody,
) {
  const response = await apiRequest<ProductDetailsView>(
    catalogPath(merchantId, `/products/${productId}`),
    { auth: true, body: JSON.stringify(body), method: "PATCH" },
  );
  return response.data;
}

/**
 * The three lifecycle transitions the server allows. There is deliberately no
 * delete: the API exposes none, and the schema restricts it — `products` is
 * referenced by `collection_products` with `on delete restrict`, and orders and
 * inventory hang off its variants. Archiving is the supported end state.
 */
async function lifecycle(
  merchantId: string,
  productId: string,
  action: "publish" | "deactivate" | "archive",
  idempotencyKey: string,
) {
  const response = await apiRequest<ProductDetailsView>(
    catalogPath(merchantId, `/products/${productId}/${action}`),
    {
      auth: true,
      headers: { "Idempotency-Key": idempotencyKey },
      method: "POST",
    },
  );
  return response.data;
}

export const publishProduct = (
  merchantId: string,
  productId: string,
  idempotencyKey: string,
) => lifecycle(merchantId, productId, "publish", idempotencyKey);

export const deactivateProduct = (
  merchantId: string,
  productId: string,
  idempotencyKey: string,
) => lifecycle(merchantId, productId, "deactivate", idempotencyKey);

export const archiveProduct = (
  merchantId: string,
  productId: string,
  idempotencyKey: string,
) => lifecycle(merchantId, productId, "archive", idempotencyKey);

export async function listBrands(
  merchantId: string,
  query: { limit?: number; search?: string } = {},
) {
  const response = await apiRequest<{ items: BrandView[] }>(
    `${catalogPath(merchantId, "/brands")}${queryString(query)}`,
    { auth: true, method: "GET" },
  );
  return response.data.items;
}

/** Categories are a platform-managed taxonomy: readable, never merchant-writable. */
export async function listCategories(
  merchantId: string,
  query: { activeOnly?: boolean; limit?: number; search?: string } = {},
) {
  const response = await apiRequest<{ items: CategoryView[] }>(
    `${catalogPath(merchantId, "/categories")}${queryString({
      ...query,
      activeOnly:
        query.activeOnly === undefined ? undefined : String(query.activeOnly),
    })}`,
    { auth: true, method: "GET" },
  );
  return response.data.items;
}

export async function listCollections(
  merchantId: string,
  query: { limit?: number; search?: string } = {},
) {
  const response = await apiRequest<{ items: CollectionView[] }>(
    `${catalogPath(merchantId, "/collections")}${queryString(query)}`,
    { auth: true, method: "GET" },
  );
  return response.data.items;
}

/**
 * The transitions the server will accept, mirrored so the UI can disable an
 * action rather than offer it and let the request 409. The server remains
 * authoritative; this only decides what is worth showing.
 */
export function allowedProductTransitions(status: ProductStatus) {
  return {
    archive: status === "DRAFT" || status === "INACTIVE",
    deactivate: status === "ACTIVE",
    edit: status !== "ARCHIVED",
    publish: status === "DRAFT" || status === "INACTIVE",
  };
}

/**
 * The slug rule the server enforces: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 220.
 * Accents are decomposed and their combining marks dropped so "Lumière" becomes
 * "lumiere" rather than losing the letter.
 */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

export const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
