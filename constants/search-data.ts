import { SIMILAR_PRODUCTS } from "@/constants/product-details-data";
import {
  TRENDING_CATALOG_PRODUCTS,
  type TrendingCatalogProduct,
} from "@/constants/trending-products-data";

export const SEARCHABLE_PRODUCTS = [
  ...TRENDING_CATALOG_PRODUCTS,
  ...SIMILAR_PRODUCTS,
] as const satisfies readonly TrendingCatalogProduct[];

export function filterSearchableProducts(query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return SEARCHABLE_PRODUCTS;
  }

  return SEARCHABLE_PRODUCTS.filter((product) =>
    `${product.title} ${product.description}`
      .toLocaleLowerCase()
      .includes(normalizedQuery),
  );
}
