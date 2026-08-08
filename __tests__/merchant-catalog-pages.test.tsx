import { fireEvent, render } from "@testing-library/react-native";

import {
  catalogProductActions,
  CatalogProductsSection,
  sortProductPage,
} from "@/features/merchant-dashboard/catalog-products-section";
import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import {
  createBodyFrom,
  errorsFromResponse,
  productFormValues,
  updateBodyFrom,
  validateProductForm,
} from "@/features/merchant-dashboard/product-form-modal";
import { AuthRequestError } from "@/services/auth/auth-error";
import type {
  ProductDetailsView,
  ProductSummaryView,
} from "@/services/merchant/catalog-api";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

function sessionFor(role: MerchantSession["role"]): MerchantSession {
  return {
    defaultLocation: "Lumière Makati Warehouse",
    displayName: "Althea",
    email: "althea@example.com",
    merchantHandle: "merchant:merchant-1",
    merchantId: "merchant-1",
    merchantName: "Lumière",
    permissions: rolePermissions[role],
    role,
    storeStatus: "active",
    verified: true,
  };
}

const owner = sessionFor("Merchant Owner");
const catalogStaff = sessionFor("Catalog Staff");
const readOnly: MerchantSession = {
  ...owner,
  permissions: ["products.read"],
  role: "Support Staff",
};

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

function details(
  overrides: Partial<ProductDetailsView> = {},
): ProductDetailsView {
  return {
    ...product(),
    categoryIds: ["category-1"],
    collectionIds: [],
    description: "A full description",
    options: [],
    primaryCategoryId: "category-1",
    shortDescription: "A summary",
    variants: [],
    ...overrides,
  };
}

const brandNames = new Map([["brand-1", "Lumière Atelier"]]);
const categories = [{ id: "category-1", name: "Dresses" }];

describe("sortProductPage", () => {
  it("orders by stock in both directions", () => {
    const rows = [
      product({ availableStock: 5, id: "a" }),
      product({ availableStock: 90, id: "b" }),
    ];

    expect(sortProductPage(rows, "stock", "desc")[0].id).toBe("b");
    expect(sortProductPage(rows, "stock", "asc")[0].id).toBe("a");
  });

  it("breaks ties on the id so equal rows never jitter", () => {
    const rows = [
      product({ availableStock: 5, id: "zzz" }),
      product({ availableStock: 5, id: "aaa" }),
    ];

    expect(sortProductPage(rows, "stock", "desc").map((row) => row.id)).toEqual(
      ["aaa", "zzz"],
    );
  });

  it("does not mutate the array it was given", () => {
    const rows = [product({ id: "a" }), product({ id: "b" })];
    const original = [...rows];
    sortProductPage(rows, "name", "asc");
    expect(rows).toEqual(original);
  });
});

describe("catalogProductActions", () => {
  const keys = (items: { key: string }[]) => items.map((item) => item.key);
  const disabled = (
    items: { disabled?: boolean; key: string }[],
    key: string,
  ) => items.find((item) => item.key === key)?.disabled;

  it("offers publish and archive on a draft, but not deactivate", () => {
    const items = catalogProductActions({ product: product(), session: owner });

    expect(keys(items)).toContain("publish");
    expect(disabled(items, "publish")).toBe(false);
    expect(disabled(items, "archive")).toBe(false);
    expect(disabled(items, "deactivate")).toBe(true);
  });

  it("offers only deactivate on an active product", () => {
    const items = catalogProductActions({
      product: product({ status: "ACTIVE" }),
      session: owner,
    });

    expect(disabled(items, "deactivate")).toBe(false);
    expect(disabled(items, "publish")).toBe(true);
    // Archiving an active product would 409; it must be deactivated first.
    expect(disabled(items, "archive")).toBe(true);
  });

  it("treats archived as terminal, including editing", () => {
    const items = catalogProductActions({
      product: product({ status: "ARCHIVED" }),
      session: owner,
    });

    for (const key of ["edit", "publish", "deactivate", "archive"]) {
      expect(disabled(items, key)).toBe(true);
    }
  });

  it("lets catalog staff edit but not publish, deactivate or archive", () => {
    expect(catalogStaff.permissions).toContain("products.write");
    expect(catalogStaff.permissions).not.toContain("products.publish");

    const items = catalogProductActions({
      product: product(),
      session: catalogStaff,
    });

    expect(disabled(items, "edit")).toBe(false);
    expect(disabled(items, "publish")).toBe(true);
    expect(disabled(items, "archive")).toBe(true);
  });

  it("disables every write action for a read-only role", () => {
    const items = catalogProductActions({
      product: product(),
      session: readOnly,
    });

    expect(disabled(items, "view")).toBeUndefined();
    for (const key of ["edit", "publish", "deactivate", "archive"]) {
      expect(disabled(items, key)).toBe(true);
    }
  });

  it("never offers a delete, because the API exposes none", () => {
    expect(
      keys(catalogProductActions({ product: product(), session: owner })),
    ).not.toContain("delete");
  });
});

describe("validateProductForm", () => {
  const base = productFormValues(details());

  it("requires a name and a slug", () => {
    const errors = validateProductForm({ ...base, name: " ", slug: "" });

    expect(errors.name).toBeDefined();
    expect(errors.slug).toBeDefined();
  });

  it("rejects a slug the server's pattern would reject", () => {
    for (const slug of [
      "Not Lower",
      "trailing-",
      "double--hyphen",
      "sym!bol",
    ]) {
      expect(validateProductForm({ ...base, slug }).slug).toBeDefined();
    }
    expect(
      validateProductForm({ ...base, slug: "linen-wrap-2" }).slug,
    ).toBeUndefined();
  });

  it("enforces the column limits the database declares", () => {
    expect(
      validateProductForm({ ...base, name: "a".repeat(201) }).name,
    ).toBeDefined();
    expect(
      validateProductForm({ ...base, shortDescription: "a".repeat(501) })
        .shortDescription,
    ).toBeDefined();
  });

  it("rejects a primary category that is not among the selected ones", () => {
    expect(
      validateProductForm({
        ...base,
        categoryIds: ["category-1"],
        primaryCategoryId: "category-9",
      }).primaryCategoryId,
    ).toBeDefined();
  });
});

describe("createBodyFrom", () => {
  it("sends only the fields the create DTO accepts", () => {
    const body = createBodyFrom({
      brandId: "brand-1",
      categoryIds: ["category-1"],
      description: "Full",
      isFeatured: true,
      name: "  Linen Wrap Dress  ",
      primaryCategoryId: "category-1",
      shortDescription: "Summary",
      slug: "linen-wrap-dress",
    });

    expect(body).toEqual({
      brandId: "brand-1",
      categoryIds: ["category-1"],
      description: "Full",
      isFeatured: true,
      name: "Linen Wrap Dress",
      primaryCategoryId: "category-1",
      shortDescription: "Summary",
      slug: "linen-wrap-dress",
    });
    // Status is never sent: the server always creates a DRAFT.
    expect("status" in body).toBe(false);
  });

  it("omits blank optional fields rather than sending empty strings", () => {
    expect(
      createBodyFrom({
        brandId: "",
        categoryIds: [],
        description: "  ",
        isFeatured: false,
        name: "Tote",
        primaryCategoryId: "",
        shortDescription: "",
        slug: "tote",
      }),
    ).toEqual({ name: "Tote", slug: "tote" });
  });
});

describe("updateBodyFrom", () => {
  const saved = details();

  it("sends nothing when nothing changed, so an empty PATCH is never issued", () => {
    expect(updateBodyFrom(productFormValues(saved), saved)).toEqual({});
  });

  it("sends only what actually changed", () => {
    expect(
      updateBodyFrom({ ...productFormValues(saved), name: "Renamed" }, saved),
    ).toEqual({ name: "Renamed" });
  });

  it("clears a field with null rather than an empty string", () => {
    expect(
      updateBodyFrom(
        { ...productFormValues(saved), shortDescription: "" },
        saved,
      ),
    ).toEqual({ shortDescription: null });
  });

  it("always pairs a primary-category change with categoryIds", () => {
    // The server rejects primaryCategoryId without categoryIds in the same call.
    const body = updateBodyFrom(
      {
        ...productFormValues(saved),
        categoryIds: ["category-1", "category-2"],
        primaryCategoryId: "category-2",
      },
      saved,
    );

    expect(body.primaryCategoryId).toBe("category-2");
    expect(body.categoryIds).toEqual(["category-1", "category-2"]);
  });

  it("drops the brand with null when it is cleared", () => {
    expect(
      updateBodyFrom({ ...productFormValues(saved), brandId: "" }, saved),
    ).toEqual({ brandId: null });
  });
});

describe("errorsFromResponse", () => {
  it("maps the server's field errors onto the form", () => {
    const error = new AuthRequestError("validation", "Validation failed", 400, {
      slug: "Slug already exists",
    });

    expect(errorsFromResponse(error)).toEqual({ slug: "Slug already exists" });
  });

  it("falls back to a form-level message for a conflict with no field", () => {
    expect(
      errorsFromResponse(new AuthRequestError("server", "Slug in use", 409))
        .form,
    ).toBe("Slug in use");
  });

  it("never leaks an unknown error shape to the merchant", () => {
    expect(errorsFromResponse(new Error("stack trace here")).form).toBe(
      "Something went wrong. Please try again.",
    );
  });
});

describe("CatalogProductsSection", () => {
  const renderList = (overrides: Record<string, unknown> = {}) =>
    render(
      <CatalogProductsSection
        brandNames={brandNames}
        categories={categories}
        compact={false}
        hasNextPage={false}
        hasPreviousPage={false}
        onQueryChange={jest.fn()}
        page={1}
        products={[product()]}
        query={{}}
        session={owner}
        {...overrides}
      />,
    );

  it("renders the rows the API returned", () => {
    const screen = renderList();

    expect(screen.getByTestId("product-row-product-1")).toBeTruthy();
    expect(screen.getByText("Linen Wrap Dress")).toBeTruthy();
    expect(screen.getByText("Lumière Atelier")).toBeTruthy();
    expect(screen.getByText("Draft")).toBeTruthy();
  });

  it("guides a merchant with an empty catalog", () => {
    const screen = renderList({ products: [] });

    expect(screen.getByText("No products yet")).toBeTruthy();
    expect(screen.getByTestId("catalog-create-product")).toBeTruthy();
  });

  it("separates an empty catalog from a filter that matched nothing", () => {
    const screen = renderList({ products: [], query: { search: "nothing" } });

    expect(screen.getByText("No products match your filters.")).toBeTruthy();
    expect(screen.queryByText("No products yet")).toBeNull();
  });

  it("disables Create Product for a role that cannot write", () => {
    expect(
      renderList({ session: readOnly }).getByTestId("catalog-create-product")
        .props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      renderList().getByTestId("catalog-create-product").props
        .accessibilityState.disabled,
    ).toBe(false);
  });

  it("reports a filter change up rather than filtering locally", () => {
    const onQueryChange = jest.fn();
    const screen = renderList({ onQueryChange, query: { search: "old" } });

    fireEvent.changeText(screen.getByLabelText("Search products"), "linen");

    // Filtering is server-side, and a new filter resets the cursor.
    expect(onQueryChange).toHaveBeenCalledWith({
      cursor: undefined,
      search: "linen",
    });
  });

  it("clamps paging to what the cursor API reports", () => {
    const screen = renderList();

    expect(
      screen.getByTestId("products-previous-page").props.accessibilityState
        .disabled,
    ).toBe(true);
    expect(
      screen.getByTestId("products-next-page").props.accessibilityState
        .disabled,
    ).toBe(true);

    const withNext = renderList({ hasNextPage: true, hasPreviousPage: true });
    expect(
      withNext.getByTestId("products-next-page").props.accessibilityState
        .disabled,
    ).toBe(false);
  });

  it("stacks cards instead of the table when compact", () => {
    const screen = renderList({ compact: true });

    expect(screen.getByTestId("product-card-product-1")).toBeTruthy();
    expect(screen.queryByTestId("products-sort-stock")).toBeNull();
  });
});
