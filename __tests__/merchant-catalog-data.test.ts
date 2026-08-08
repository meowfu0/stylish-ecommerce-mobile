import {
  type CatalogSectionLoaders,
  isPermissionDenied,
  loadCatalogSnapshot,
} from "@/features/merchant-dashboard/catalog-data-source";
import { AuthRequestError } from "@/services/auth/auth-error";
import {
  allowedProductTransitions,
  newIdempotencyKey,
  PRODUCT_SLUG_PATTERN,
  type ProductSummaryView,
  slugify,
} from "@/services/merchant/catalog-api";

function product(
  overrides: Partial<ProductSummaryView> = {},
): ProductSummaryView {
  return {
    availableStock: 12,
    brandId: "brand-1",
    createdAt: "2026-08-01T00:00:00.000Z",
    id: "product-1",
    isFeatured: false,
    merchantId: "merchant-1",
    name: "Linen Wrap Dress",
    publishedAt: null,
    slug: "linen-wrap-dress",
    status: "DRAFT",
    stockStatus: "IN_STOCK",
    updatedAt: "2026-08-06T09:30:00.000Z",
    ...overrides,
  };
}

function loaders(
  overrides: Partial<CatalogSectionLoaders> = {},
): CatalogSectionLoaders {
  return {
    brands: async () => [
      {
        createdAt: "2026-07-01T00:00:00.000Z",
        description: null,
        id: "brand-1",
        isActive: true,
        merchantId: "merchant-1",
        name: "Lumière Atelier",
        slug: "lumiere-atelier",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    categories: async () => [
      {
        description: null,
        id: "category-1",
        isActive: true,
        name: "Dresses",
        parentId: null,
        slug: "dresses",
        sortOrder: 0,
      },
    ],
    collections: async () => [
      {
        createdAt: "2026-07-01T00:00:00.000Z",
        description: null,
        endsAt: null,
        id: "collection-1",
        isActive: false,
        merchantId: "merchant-1",
        name: "Holiday Capsule",
        productIds: ["product-1", "product-2"],
        slug: "holiday-capsule",
        sortOrder: 0,
        startsAt: null,
        updatedAt: "2026-08-02T00:00:00.000Z",
      },
    ],
    products: async () => ({ items: [product()], nextCursor: "cursor-2" }),
    ...overrides,
  };
}

describe("loadCatalogSnapshot", () => {
  it("maps every region and carries the cursor through unchanged", async () => {
    const { failedSections, snapshot } = await loadCatalogSnapshot(loaders());

    expect(failedSections).toEqual([]);
    expect(snapshot.products).toHaveLength(1);
    expect(snapshot.nextCursor).toBe("cursor-2");
    expect(snapshot.brandNames.get("brand-1")).toBe("Lumière Atelier");
    expect(snapshot.categoryNames.get("category-1")).toBe("Dresses");
  });

  it("reports a product count only where the API actually returns one", async () => {
    const { snapshot } = await loadCatalogSnapshot(loaders());

    // Collections return their membership, so the count is real.
    expect(snapshot.collections[0].productCount).toBe(2);
    // Brands and categories return none, and none is invented for them.
    expect(snapshot.brands[0].productCount).toBeUndefined();
    expect(snapshot.categories[0].productCount).toBeUndefined();
  });

  it("maps the API's active flag onto the record vocabulary", async () => {
    const { snapshot } = await loadCatalogSnapshot(loaders());

    expect(snapshot.brands[0].status).toBe("Active");
    expect(snapshot.collections[0].status).toBe("Inactive");
  });

  it("degrades one failing region without losing the others", async () => {
    const { failedSections, snapshot } = await loadCatalogSnapshot(
      loaders({
        brands: async () => {
          throw new AuthRequestError("server", "offline", 500);
        },
      }),
    );

    expect(failedSections).toEqual(["brands"]);
    expect(snapshot.brands).toEqual([]);
    expect(snapshot.products).toHaveLength(1);
  });

  it("rethrows an expired session so the caller can stop requesting", async () => {
    await expect(
      loadCatalogSnapshot(
        loaders({
          products: async () => {
            throw new AuthRequestError("session-expired", "expired", 401);
          },
        }),
      ),
    ).rejects.toBeInstanceOf(AuthRequestError);
  });

  it("rethrows a permission denial rather than calling it a load failure", async () => {
    const denial = new AuthRequestError("permission-denied", "no", 403);

    await expect(
      loadCatalogSnapshot(
        loaders({ products: async () => Promise.reject(denial) }),
      ),
    ).rejects.toBe(denial);
    expect(isPermissionDenied(denial)).toBe(true);
    expect(isPermissionDenied(new AuthRequestError("server", "x", 500))).toBe(
      false,
    );
  });
});

describe("allowedProductTransitions", () => {
  it("mirrors the server's state machine exactly", () => {
    // DRAFT/INACTIVE -> ACTIVE, ACTIVE -> INACTIVE, DRAFT/INACTIVE -> ARCHIVED.
    expect(allowedProductTransitions("DRAFT")).toEqual({
      archive: true,
      deactivate: false,
      edit: true,
      publish: true,
    });
    expect(allowedProductTransitions("ACTIVE")).toEqual({
      archive: false,
      deactivate: true,
      edit: true,
      publish: false,
    });
    expect(allowedProductTransitions("INACTIVE")).toEqual({
      archive: true,
      deactivate: false,
      edit: true,
      publish: true,
    });
    // Archived is terminal: the server refuses edits and reactivation.
    expect(allowedProductTransitions("ARCHIVED")).toEqual({
      archive: false,
      deactivate: false,
      edit: false,
      publish: false,
    });
  });
});

describe("slugify", () => {
  it("produces slugs the server's pattern accepts", () => {
    for (const name of [
      "Lumière Café — Wrap Dress",
      "  Multiple   spaces  ",
      "Symbols!!! &&& here",
      "Habi Weave Tote 2.0",
    ]) {
      const slug = slugify(name);
      expect(slug).toMatch(PRODUCT_SLUG_PATTERN);
    }
  });

  it("keeps the letter when stripping an accent", () => {
    expect(slugify("Lumière Atelier")).toBe("lumiere-atelier");
  });

  it("stays inside the column's 220-character limit", () => {
    expect(slugify("a".repeat(400)).length).toBeLessThanOrEqual(220);
  });
});

describe("newIdempotencyKey", () => {
  it("matches the 8-128 character charset the server requires", () => {
    for (let index = 0; index < 50; index += 1) {
      const key = newIdempotencyKey("product");
      expect(key.length).toBeGreaterThanOrEqual(8);
      expect(key.length).toBeLessThanOrEqual(128);
      expect(key).toMatch(/^[A-Za-z0-9._:-]+$/);
    }
  });

  it("does not repeat, so two creates cannot collide", () => {
    const keys = new Set(
      Array.from({ length: 200 }, () => newIdempotencyKey("product")),
    );
    expect(keys.size).toBe(200);
  });
});
