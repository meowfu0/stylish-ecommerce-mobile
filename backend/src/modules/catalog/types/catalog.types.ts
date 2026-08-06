export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

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
