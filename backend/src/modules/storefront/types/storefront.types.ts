export type StorefrontStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type StorefrontImageView = {
  altText: string | null;
  expiresAt: string;
  id: string;
  signedUrl: string;
};

export type StorefrontMerchantSummaryView = {
  displayName: string;
  id: string;
  slug: string;
};

export type StorefrontBrandView = {
  description: string | null;
  id: string;
  merchant: StorefrontMerchantSummaryView;
  name: string;
  slug: string;
};

export type StorefrontCategoryView = {
  description: string | null;
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
};

export type StorefrontCollectionView = {
  description: string | null;
  endsAt: string | null;
  id: string;
  merchant: StorefrontMerchantSummaryView;
  name: string;
  slug: string;
  startsAt: string | null;
};

export type StorefrontProductSummaryView = {
  brand: Omit<StorefrontBrandView, 'merchant'> | null;
  currency: 'PHP';
  isFeatured: boolean;
  maxPriceCentavos: number;
  merchant: StorefrontMerchantSummaryView;
  minPriceCentavos: number;
  name: string;
  primaryImage: StorefrontImageView | null;
  productId: string;
  publishedAt: string;
  shortDescription: string | null;
  slug: string;
  stockStatus: StorefrontStockStatus;
};

export type StorefrontOptionValueView = {
  displayLabel: string;
  id: string;
  swatchHex: string | null;
  value: string;
};

export type StorefrontOptionView = {
  id: string;
  name: string;
  values: StorefrontOptionValueView[];
};

export type StorefrontVariantView = {
  compareAtPriceCentavos: number | null;
  id: string;
  isDefault: boolean;
  name: string;
  optionValueIds: string[];
  priceCentavos: number;
  stockStatus: StorefrontStockStatus;
};

export type StorefrontProductDetailsView = StorefrontProductSummaryView & {
  categories: StorefrontCategoryView[];
  collections: StorefrontCollectionView[];
  description: string | null;
  options: StorefrontOptionView[];
  variants: StorefrontVariantView[];
};

export type StorefrontProductListView = {
  items: StorefrontProductSummaryView[];
  nextCursor: string | null;
};

export type StorefrontCollectionDetailsView = StorefrontCollectionView & {
  products: StorefrontProductListView;
};

export type StorefrontMerchantView = StorefrontMerchantSummaryView & {
  currency: 'PHP';
  description: string | null;
  websiteUrl: string | null;
};
