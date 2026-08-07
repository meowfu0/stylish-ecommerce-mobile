export type CatalogSort =
  | "best-selling"
  | "biggest-discount"
  | "latest"
  | "name-ascending"
  | "price-ascending"
  | "price-descending"
  | "recommended"
  | "top-rated";

export type CatalogPricePreset =
  "all" | "custom" | "from-5000-to-8000" | "over-8000" | "under-5000";

export type CatalogCategory =
  | "accessories"
  | "bottoms"
  | "dresses"
  | "knitwear"
  | "skirts"
  | "tailoring"
  | "tops";

export type CatalogRating = "3-and-up" | "4-and-up";
export type CatalogAvailability = "in-stock" | "low-stock" | "out-of-stock";
export type CatalogPromotion = "free-shipping" | "on-sale" | "with-voucher";
export type CatalogBrand = "amour" | "dahlia" | "lumen" | "stylish";
export type CatalogSize = "XS" | "S" | "M" | "L" | "XL";
export type CatalogColor =
  "black" | "blue" | "cream" | "floral" | "neutral" | "pink" | "red";

export type CatalogFilterState = {
  availability: CatalogAvailability[];
  brands: CatalogBrand[];
  categories: CatalogCategory[];
  colors: CatalogColor[];
  customMaximumPrice: string;
  customMinimumPrice: string;
  pricePreset: CatalogPricePreset;
  promotions: CatalogPromotion[];
  ratings: CatalogRating[];
  sizes: CatalogSize[];
};

type CatalogFacetOption<Value extends string> = {
  description?: string;
  label: string;
  swatch?: string;
  value: Value;
};

type CatalogProductFacets = {
  arrivalRank: number;
  availability: CatalogAvailability;
  brand: CatalogBrand;
  categories: CatalogCategory[];
  colors: CatalogColor[];
  discountPercent: number;
  promotions: CatalogPromotion[];
  rating: number;
  sales: number;
  sizes: CatalogSize[];
};

export type CatalogFilterChip = {
  id: string;
  label: string;
  section:
    | "availability"
    | "brands"
    | "categories"
    | "colors"
    | "price"
    | "promotions"
    | "ratings"
    | "sizes";
  value?: string;
};

export const CATALOG_SORT_OPTIONS = [
  {
    description: "Our balanced edit of featured pieces.",
    label: "Recommended",
    value: "recommended",
  },
  {
    description: "See the newest pieces first.",
    label: "Latest Arrivals",
    value: "latest",
  },
  {
    description: "Shop the pieces customers choose most.",
    label: "Best Selling",
    value: "best-selling",
  },
  {
    description: "Show products with the strongest ratings.",
    label: "Top Rated",
    value: "top-rated",
  },
  {
    description: "Show the most affordable products first.",
    label: "Price: Low to High",
    value: "price-ascending",
  },
  {
    description: "Show the highest-priced products first.",
    label: "Price: High to Low",
    value: "price-descending",
  },
  {
    description: "Arrange products alphabetically.",
    label: "Product Name: A to Z",
    value: "name-ascending",
  },
  {
    description: "Lead with the strongest current savings.",
    label: "Biggest Discount",
    value: "biggest-discount",
  },
] as const satisfies readonly {
  description: string;
  label: string;
  value: CatalogSort;
}[];

export const CATALOG_PRICE_PRESETS = [
  {
    description: "Include products from every price point.",
    label: "All prices",
    value: "all",
  },
  {
    description: "Everyday pieces below ₱5,000.",
    label: "Under ₱5,000",
    value: "under-5000",
  },
  {
    description: "Products from ₱5,000 through ₱8,000.",
    label: "₱5,000–₱8,000",
    value: "from-5000-to-8000",
  },
  {
    description: "Premium pieces above ₱8,000.",
    label: "Above ₱8,000",
    value: "over-8000",
  },
  {
    description: "Set your own minimum and maximum.",
    label: "Custom range",
    value: "custom",
  },
] as const satisfies readonly CatalogFacetOption<CatalogPricePreset>[];

export const CATALOG_CATEGORY_OPTIONS = [
  { label: "Dresses", value: "dresses" },
  { label: "Tailoring", value: "tailoring" },
  { label: "Knitwear", value: "knitwear" },
  { label: "Skirts", value: "skirts" },
  { label: "Tops", value: "tops" },
  { label: "Accessories", value: "accessories" },
  { label: "Bottoms", value: "bottoms" },
] as const satisfies readonly CatalogFacetOption<CatalogCategory>[];

export const CATALOG_RATING_OPTIONS = [
  { label: "4★ & Up", value: "4-and-up" },
  { label: "3★ & Up", value: "3-and-up" },
] as const satisfies readonly CatalogFacetOption<CatalogRating>[];

export const CATALOG_AVAILABILITY_OPTIONS = [
  { label: "In Stock", value: "in-stock" },
  { label: "Low Stock", value: "low-stock" },
  { label: "Out of Stock", value: "out-of-stock" },
] as const satisfies readonly CatalogFacetOption<CatalogAvailability>[];

export const CATALOG_PROMOTION_OPTIONS = [
  { label: "On Sale", value: "on-sale" },
  { label: "With Voucher", value: "with-voucher" },
  { label: "Free Shipping", value: "free-shipping" },
] as const satisfies readonly CatalogFacetOption<CatalogPromotion>[];

export const CATALOG_BRAND_OPTIONS = [
  { label: "Velori", value: "stylish" },
  { label: "Lumen", value: "lumen" },
  { label: "Amour", value: "amour" },
  { label: "Dahlia", value: "dahlia" },
] as const satisfies readonly CatalogFacetOption<CatalogBrand>[];

export const CATALOG_SIZE_OPTIONS = [
  { label: "XS", value: "XS" },
  { label: "S", value: "S" },
  { label: "M", value: "M" },
  { label: "L", value: "L" },
  { label: "XL", value: "XL" },
] as const satisfies readonly CatalogFacetOption<CatalogSize>[];

export const CATALOG_COLOR_OPTIONS = [
  { label: "Pink", swatch: "#E89BB0", value: "pink" },
  { label: "Neutral", swatch: "#C7B7AD", value: "neutral" },
  { label: "Floral", swatch: "#B85C73", value: "floral" },
  { label: "Black", swatch: "#271B21", value: "black" },
  { label: "Red", swatch: "#C64C57", value: "red" },
  { label: "Blue", swatch: "#657D9C", value: "blue" },
  { label: "Cream", swatch: "#EFE3D2", value: "cream" },
] as const satisfies readonly CatalogFacetOption<CatalogColor>[];

export const EMPTY_CATALOG_FILTERS: CatalogFilterState = {
  availability: [],
  brands: [],
  categories: [],
  colors: [],
  customMaximumPrice: "",
  customMinimumPrice: "",
  pricePreset: "all",
  promotions: [],
  ratings: [],
  sizes: [],
};

const PRODUCT_FACETS: Record<string, CatalogProductFacets> = {
  "black-dress": {
    arrivalRank: 10,
    availability: "in-stock",
    brand: "amour",
    categories: ["dresses"],
    colors: ["black"],
    discountPercent: 32,
    promotions: ["on-sale", "with-voucher", "free-shipping"],
    rating: 4.5,
    sales: 523456,
    sizes: ["XS", "S", "M", "L"],
  },
  "black-jacket": {
    arrivalRank: 4,
    availability: "low-stock",
    brand: "stylish",
    categories: ["tops", "tailoring"],
    colors: ["black", "neutral"],
    discountPercent: 18,
    promotions: ["with-voucher", "free-shipping"],
    rating: 4.5,
    sales: 223569,
    sizes: ["M", "L", "XL"],
  },
  "black-winter-hoodie": {
    arrivalRank: 12,
    availability: "in-stock",
    brand: "stylish",
    categories: ["knitwear", "tops"],
    colors: ["black"],
    discountPercent: 24,
    promotions: ["on-sale", "with-voucher"],
    rating: 4.5,
    sales: 6890,
    sizes: ["S", "M", "L", "XL"],
  },
  "denim-dress": {
    arrivalRank: 7,
    availability: "in-stock",
    brand: "lumen",
    categories: ["dresses", "bottoms"],
    colors: ["blue"],
    discountPercent: 20,
    promotions: ["with-voucher", "free-shipping"],
    rating: 4.5,
    sales: 27344,
    sizes: ["S", "M", "L"],
  },
  "flare-dress": {
    arrivalRank: 8,
    availability: "in-stock",
    brand: "dahlia",
    categories: ["dresses"],
    colors: ["floral", "black"],
    discountPercent: 28,
    promotions: ["on-sale", "free-shipping"],
    rating: 4.5,
    sales: 335566,
    sizes: ["XS", "S", "M", "L"],
  },
  "jordan-stay": {
    arrivalRank: 6,
    availability: "low-stock",
    brand: "stylish",
    categories: ["accessories"],
    colors: ["black", "red"],
    discountPercent: 12,
    promotions: ["with-voucher", "free-shipping"],
    rating: 4.5,
    sales: 1023456,
    sizes: ["S", "M", "L", "XL"],
  },
  "mens-formal-shoes": {
    arrivalRank: 1,
    availability: "in-stock",
    brand: "amour",
    categories: ["accessories"],
    colors: ["black", "neutral"],
    discountPercent: 16,
    promotions: ["with-voucher"],
    rating: 4.5,
    sales: 1345678,
    sizes: ["M", "L", "XL"],
  },
  "mens-starry-shirt": {
    arrivalRank: 11,
    availability: "low-stock",
    brand: "lumen",
    categories: ["tops"],
    colors: ["black"],
    discountPercent: 22,
    promotions: ["on-sale", "with-voucher"],
    rating: 4.5,
    sales: 152344,
    sizes: ["S", "M", "L", "XL"],
  },
  "nikon-d7200": {
    arrivalRank: 2,
    availability: "low-stock",
    brand: "stylish",
    categories: ["accessories"],
    colors: ["black"],
    discountPercent: 10,
    promotions: ["free-shipping"],
    rating: 4.5,
    sales: 67456,
    sizes: [],
  },
  "pink-embroidered-dress": {
    arrivalRank: 9,
    availability: "in-stock",
    brand: "dahlia",
    categories: ["dresses"],
    colors: ["pink"],
    discountPercent: 35,
    promotions: ["on-sale", "with-voucher", "free-shipping"],
    rating: 4.5,
    sales: 45678,
    sizes: ["XS", "S", "M", "L"],
  },
  "realme-7": {
    arrivalRank: 5,
    availability: "out-of-stock",
    brand: "lumen",
    categories: ["accessories"],
    colors: ["black", "blue"],
    discountPercent: 30,
    promotions: ["on-sale", "with-voucher"],
    rating: 4.5,
    sales: 344567,
    sizes: [],
  },
  "sony-ps4": {
    arrivalRank: 3,
    availability: "in-stock",
    brand: "stylish",
    categories: ["accessories"],
    colors: ["black", "blue"],
    discountPercent: 26,
    promotions: ["on-sale", "free-shipping"],
    rating: 4.5,
    sales: 835566,
    sizes: [],
  },
  "amour-slip-skirt": {
    arrivalRank: 4,
    availability: "in-stock",
    brand: "amour",
    categories: ["skirts", "bottoms"],
    colors: ["black", "neutral"],
    discountPercent: 24,
    promotions: ["with-voucher", "free-shipping"],
    rating: 4.7,
    sales: 2840,
    sizes: ["XS", "S", "M", "L"],
  },
  "celine-wide-leg-pant": {
    arrivalRank: 8,
    availability: "low-stock",
    brand: "lumen",
    categories: ["bottoms", "tailoring"],
    colors: ["cream", "neutral"],
    discountPercent: 18,
    promotions: ["with-voucher", "free-shipping"],
    rating: 4.6,
    sales: 1740,
    sizes: ["S", "M", "L", "XL"],
  },
  "dahlia-ruffle-top": {
    arrivalRank: 5,
    availability: "in-stock",
    brand: "dahlia",
    categories: ["tops"],
    colors: ["pink", "cream"],
    discountPercent: 30,
    promotions: ["on-sale", "with-voucher"],
    rating: 4.8,
    sales: 3290,
    sizes: ["XS", "S", "M", "L"],
  },
  "lena-flower-knit": {
    arrivalRank: 3,
    availability: "in-stock",
    brand: "lumen",
    categories: ["knitwear", "tops"],
    colors: ["floral", "red"],
    discountPercent: 35,
    promotions: ["on-sale", "free-shipping"],
    rating: 4.9,
    sales: 4380,
    sizes: ["S", "M", "L", "XL"],
  },
  "mila-tailored-blazer": {
    arrivalRank: 2,
    availability: "low-stock",
    brand: "stylish",
    categories: ["tailoring", "tops"],
    colors: ["neutral", "cream"],
    discountPercent: 15,
    promotions: ["with-voucher", "free-shipping"],
    rating: 4.7,
    sales: 1950,
    sizes: ["XS", "S", "M"],
  },
  "petal-shoulder-bag": {
    arrivalRank: 7,
    availability: "in-stock",
    brand: "stylish",
    categories: ["accessories"],
    colors: ["black", "pink"],
    discountPercent: 20,
    promotions: ["with-voucher"],
    rating: 4.5,
    sales: 3640,
    sizes: ["M"],
  },
  "rosebud-midi-dress": {
    arrivalRank: 6,
    availability: "out-of-stock",
    brand: "dahlia",
    categories: ["dresses"],
    colors: ["pink", "floral"],
    discountPercent: 42,
    promotions: ["on-sale", "free-shipping"],
    rating: 4.9,
    sales: 5160,
    sizes: ["XS", "S", "M", "L"],
  },
  "rosette-bias-dress": {
    arrivalRank: 1,
    availability: "in-stock",
    brand: "amour",
    categories: ["dresses"],
    colors: ["pink", "red"],
    discountPercent: 28,
    promotions: ["on-sale", "with-voucher", "free-shipping"],
    rating: 4.8,
    sales: 4720,
    sizes: ["XS", "S", "M", "L", "XL"],
  },
};

function getNumericPrice(price: string) {
  return Number(price.replace(/[^\d.]/g, ""));
}

function getOptionalPrice(value: string) {
  const normalizedValue = value.replace(/[^\d.]/g, "");

  return normalizedValue ? Number(normalizedValue) : undefined;
}

function matchesSelected<Value extends string>(
  selected: readonly Value[],
  values: readonly Value[],
) {
  return (
    selected.length === 0 ||
    selected.some((selectedValue) => values.includes(selectedValue))
  );
}

function getFacets(productId: string): CatalogProductFacets {
  return (
    PRODUCT_FACETS[productId] ?? {
      arrivalRank: 0,
      availability: "in-stock",
      brand: "stylish",
      categories: [],
      colors: [],
      discountPercent: 0,
      promotions: [],
      rating: 0,
      sales: 0,
      sizes: [],
    }
  );
}

function matchesPrice(
  price: number,
  { customMaximumPrice, customMinimumPrice, pricePreset }: CatalogFilterState,
) {
  switch (pricePreset) {
    case "under-5000":
      return price < 5000;
    case "from-5000-to-8000":
      return price >= 5000 && price <= 8000;
    case "over-8000":
      return price > 8000;
    case "custom": {
      const minimumPrice = getOptionalPrice(customMinimumPrice);
      const maximumPrice = getOptionalPrice(customMaximumPrice);

      return (
        (minimumPrice === undefined || price >= minimumPrice) &&
        (maximumPrice === undefined || price <= maximumPrice)
      );
    }
    default:
      return true;
  }
}

export function cloneCatalogFilters(
  filters: CatalogFilterState,
): CatalogFilterState {
  return {
    ...filters,
    availability: [...filters.availability],
    brands: [...filters.brands],
    categories: [...filters.categories],
    colors: [...filters.colors],
    promotions: [...filters.promotions],
    ratings: [...filters.ratings],
    sizes: [...filters.sizes],
  };
}

export function applyCatalogProductOptions<
  Product extends {
    id: string;
    price: string;
    title: string;
  },
>(
  products: readonly Product[],
  sort: CatalogSort,
  filters: CatalogFilterState,
) {
  const filteredProducts = products.filter((product) => {
    const facets = getFacets(product.id);
    const matchesRating =
      filters.ratings.length === 0 ||
      filters.ratings.some((rating) =>
        rating === "4-and-up" ? facets.rating >= 4 : facets.rating >= 3,
      );

    return (
      matchesPrice(getNumericPrice(product.price), filters) &&
      matchesSelected(filters.categories, facets.categories) &&
      matchesRating &&
      matchesSelected(filters.availability, [facets.availability]) &&
      matchesSelected(filters.promotions, facets.promotions) &&
      matchesSelected(filters.brands, [facets.brand]) &&
      matchesSelected(filters.sizes, facets.sizes) &&
      matchesSelected(filters.colors, facets.colors)
    );
  });

  return [...filteredProducts].sort((firstProduct, secondProduct) => {
    const firstFacets = getFacets(firstProduct.id);
    const secondFacets = getFacets(secondProduct.id);

    switch (sort) {
      case "latest":
        return secondFacets.arrivalRank - firstFacets.arrivalRank;
      case "best-selling":
        return secondFacets.sales - firstFacets.sales;
      case "top-rated":
        return secondFacets.rating - firstFacets.rating;
      case "price-ascending":
        return (
          getNumericPrice(firstProduct.price) -
          getNumericPrice(secondProduct.price)
        );
      case "price-descending":
        return (
          getNumericPrice(secondProduct.price) -
          getNumericPrice(firstProduct.price)
        );
      case "name-ascending":
        return firstProduct.title.localeCompare(secondProduct.title);
      case "biggest-discount":
        return secondFacets.discountPercent - firstFacets.discountPercent;
      default:
        return 0;
    }
  });
}

export function getActiveCatalogFilterCount(filters: CatalogFilterState) {
  return (
    (filters.pricePreset === "all" ? 0 : 1) +
    filters.categories.length +
    filters.ratings.length +
    filters.availability.length +
    filters.promotions.length +
    filters.brands.length +
    filters.sizes.length +
    filters.colors.length
  );
}

function getOptionLabel<Value extends string>(
  options: readonly CatalogFacetOption<Value>[],
  value: Value,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function getCatalogFilterChips(
  filters: CatalogFilterState,
): CatalogFilterChip[] {
  const chips: CatalogFilterChip[] = [];

  if (filters.pricePreset !== "all") {
    const customMinimum = getOptionalPrice(filters.customMinimumPrice);
    const customMaximum = getOptionalPrice(filters.customMaximumPrice);
    const customLabel =
      customMinimum !== undefined && customMaximum !== undefined
        ? `₱${customMinimum.toLocaleString(
            "en-PH",
          )}–₱${customMaximum.toLocaleString("en-PH")}`
        : customMinimum !== undefined
          ? `From ₱${customMinimum.toLocaleString("en-PH")}`
          : customMaximum !== undefined
            ? `Up to ₱${customMaximum.toLocaleString("en-PH")}`
            : "Custom price";

    chips.push({
      id: "price",
      label:
        filters.pricePreset === "custom"
          ? customLabel
          : getOptionLabel(CATALOG_PRICE_PRESETS, filters.pricePreset),
      section: "price",
    });
  }

  const appendChips = <Value extends string>(
    section: Exclude<CatalogFilterChip["section"], "price">,
    values: readonly Value[],
    options: readonly CatalogFacetOption<Value>[],
  ) => {
    values.forEach((value) => {
      chips.push({
        id: `${section}:${value}`,
        label: getOptionLabel(options, value),
        section,
        value,
      });
    });
  };

  appendChips("categories", filters.categories, CATALOG_CATEGORY_OPTIONS);
  appendChips("ratings", filters.ratings, CATALOG_RATING_OPTIONS);
  appendChips(
    "availability",
    filters.availability,
    CATALOG_AVAILABILITY_OPTIONS,
  );
  appendChips("promotions", filters.promotions, CATALOG_PROMOTION_OPTIONS);
  appendChips("brands", filters.brands, CATALOG_BRAND_OPTIONS);
  appendChips("sizes", filters.sizes, CATALOG_SIZE_OPTIONS);
  appendChips("colors", filters.colors, CATALOG_COLOR_OPTIONS);

  return chips;
}

export function removeCatalogFilterChip(
  filters: CatalogFilterState,
  chip: CatalogFilterChip,
): CatalogFilterState {
  const nextFilters = cloneCatalogFilters(filters);

  switch (chip.section) {
    case "price":
      nextFilters.pricePreset = "all";
      nextFilters.customMinimumPrice = "";
      nextFilters.customMaximumPrice = "";
      break;
    case "categories":
      nextFilters.categories = nextFilters.categories.filter(
        (value) => value !== chip.value,
      );
      break;
    case "ratings":
      nextFilters.ratings = nextFilters.ratings.filter(
        (value) => value !== chip.value,
      );
      break;
    case "availability":
      nextFilters.availability = nextFilters.availability.filter(
        (value) => value !== chip.value,
      );
      break;
    case "promotions":
      nextFilters.promotions = nextFilters.promotions.filter(
        (value) => value !== chip.value,
      );
      break;
    case "brands":
      nextFilters.brands = nextFilters.brands.filter(
        (value) => value !== chip.value,
      );
      break;
    case "sizes":
      nextFilters.sizes = nextFilters.sizes.filter(
        (value) => value !== chip.value,
      );
      break;
    case "colors":
      nextFilters.colors = nextFilters.colors.filter(
        (value) => value !== chip.value,
      );
      break;
  }

  return nextFilters;
}
