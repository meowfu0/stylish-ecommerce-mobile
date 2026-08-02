export const STOREFRONT_CATALOG_REVISION_KEY = 'storefront:catalog:revision';
export const STOREFRONT_STOCK_REVISION_KEY = 'storefront:stock:revision';

export const STOREFRONT_PRODUCT_LIST_TTL_SECONDS = 30;
export const STOREFRONT_PRODUCT_DETAILS_TTL_SECONDS = 60;
export const STOREFRONT_DIRECTORY_TTL_SECONDS = 120;
export const STOREFRONT_MERCHANT_TTL_SECONDS = 60;

export const STOREFRONT_SORT_VALUES = [
  'recommended',
  'latest',
  'price_asc',
  'price_desc',
  'name',
] as const;

export type StorefrontSort = (typeof STOREFRONT_SORT_VALUES)[number];
