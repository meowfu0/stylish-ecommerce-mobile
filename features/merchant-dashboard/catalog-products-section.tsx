import { useMemo, useState, type ComponentProps } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { can } from "@/features/merchant-dashboard/dashboard-access";
import {
  formatCount,
  formatOrderDate,
} from "@/features/merchant-dashboard/dashboard-format";
import type { DashboardMenuItem } from "@/features/merchant-dashboard/dashboard-menu";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  SectionHeading,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import {
  FilterSelect,
  RowActionsButton,
  SearchField,
  SortHeaderCell,
  TableCell,
  TableText,
} from "@/features/merchant-dashboard/dashboard-table";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import {
  allowedProductTransitions,
  PRODUCT_STATUSES,
  type ProductListQuery,
  type ProductStatus,
  type ProductSummaryView,
  STOCK_STATUSES,
  type StockStatus,
} from "@/services/merchant/catalog-api";

export const ALL_PRODUCT_STATUSES = "All statuses";
export const ALL_CATEGORIES = "All categories";
export const ALL_STOCK_STATES = "All stock";

/** The page size requested from the API; the server caps it at 100. */
export const PRODUCT_PAGE_SIZE = 25;
export const PRODUCT_ROW_HEIGHT = 52;
export const PRODUCT_TABLE_BODY_HEIGHT = 8 * PRODUCT_ROW_HEIGHT;
export const PRODUCT_CARD_HEIGHT = 148;
export const PRODUCT_CARDS_BODY_HEIGHT =
  8 * PRODUCT_CARD_HEIGHT + 7 * spacing.sm;

/**
 * Below this measured width the table drops the columns a merchant can live
 * without rather than forcing a horizontal scroll for them.
 */
const DENSE_TABLE_WIDTH = 900;
const FULL_TABLE_MIN_WIDTH = 900;
const DENSE_TABLE_MIN_WIDTH = 700;

const productStatusTones: Record<
  ProductStatus,
  ComponentProps<typeof StatusChip>["tone"]
> = {
  ACTIVE: "green",
  ARCHIVED: "neutral",
  DRAFT: "blue",
  INACTIVE: "warning",
};

const stockTones: Record<
  StockStatus,
  ComponentProps<typeof StatusChip>["tone"]
> = {
  IN_STOCK: "green",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "danger",
};

/** Server enum values are shouty; the table shows the merchant's vocabulary. */
export const productStatusLabels: Record<ProductStatus, string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archived",
  DRAFT: "Draft",
  INACTIVE: "Inactive",
};

export const stockStatusLabels: Record<StockStatus, string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
};

export type ProductSortKey = "name" | "stock" | "updated";
export type ProductLifecycleAction = "archive" | "deactivate" | "publish";

/**
 * Orders the loaded page.
 *
 * The list endpoint accepts no sort parameter, so this reorders the rows the
 * server returned rather than the whole catalog. That is a real limitation and
 * is reported as a backend gap; it is not papered over with invented rows.
 */
export function sortProductPage(
  products: readonly ProductSummaryView[],
  key: ProductSortKey,
  direction: "asc" | "desc",
) {
  const sign = direction === "desc" ? -1 : 1;

  return [...products].sort((left, right) => {
    const compared =
      key === "name"
        ? left.name.localeCompare(right.name)
        : key === "stock"
          ? left.availableStock - right.availableStock
          : left.updatedAt.localeCompare(right.updatedAt);

    if (compared !== 0) return compared * sign;
    // A stable secondary key, so equal rows never jitter between renders.
    return left.id.localeCompare(right.id);
  });
}

/**
 * The actions a product's status and the role allow.
 *
 * Transitions mirror the server's own state machine so the UI never offers a
 * call that would 409: publish and archive need DRAFT or INACTIVE, deactivate
 * needs ACTIVE, and an archived product is terminal. A permission the role does
 * not hold leaves the action visible but disabled, so staff can tell a missing
 * permission from a missing feature.
 *
 * There is no delete: the API exposes none, and `collection_products` references
 * products with `on delete restrict`, so archiving is the supported end state.
 */
export function catalogProductActions({
  product,
  session,
}: {
  product: ProductSummaryView;
  session?: MerchantSession;
}): DashboardMenuItem[] {
  const allows = allowedProductTransitions(product.status);
  const canWrite = session ? can(session, "products.write") : true;
  const canPublish = session ? can(session, "products.publish") : true;

  return [
    { icon: "eye-outline", key: "view", label: "View product" },
    {
      disabled: !canWrite || !allows.edit,
      icon: "pencil-outline",
      key: "edit",
      label: "Edit product",
    },
    {
      disabled: !canPublish || !allows.publish,
      icon: "cloud-upload-outline",
      key: "publish",
      label: "Publish",
    },
    {
      disabled: !canPublish || !allows.deactivate,
      icon: "eye-off-outline",
      key: "deactivate",
      label: "Unpublish",
    },
    {
      disabled: !canPublish || !allows.archive,
      icon: "archive-arrow-down-outline",
      key: "archive",
      label: "Archive product",
    },
  ];
}

function rowMenuItems({
  onEdit,
  onLifecycle,
  onView,
  product,
  session,
}: {
  onEdit?: (product: ProductSummaryView) => void;
  onLifecycle?: (
    action: ProductLifecycleAction,
    product: ProductSummaryView,
  ) => void;
  onView?: (product: ProductSummaryView) => void;
  product: ProductSummaryView;
  session?: MerchantSession;
}): DashboardMenuItem[] {
  const handlers: Record<string, (() => void) | undefined> = {
    archive: () => onLifecycle?.("archive", product),
    deactivate: () => onLifecycle?.("deactivate", product),
    edit: () => onEdit?.(product),
    publish: () => onLifecycle?.("publish", product),
    view: () => onView?.(product),
  };

  return catalogProductActions({ product, session }).map((item) => ({
    ...item,
    onPress: item.disabled ? undefined : handlers[item.key],
  }));
}

/** `updatedAt` is a full ISO timestamp; the table shows only its date. */
function formatUpdated(iso: string) {
  return iso ? formatOrderDate(iso.slice(0, 10)) : "—";
}

export function CatalogProductsSection({
  brandNames,
  busyProductId,
  categories,
  compact,
  hasNextPage,
  hasPreviousPage,
  onCreateProduct,
  onEditProduct,
  onLifecycle,
  onNextPage,
  onPreviousPage,
  onQueryChange,
  onViewProduct,
  page,
  products,
  query,
  session,
}: {
  brandNames: ReadonlyMap<string, string>;
  /** The row waiting on a lifecycle call, so its card can show as busy. */
  busyProductId?: string | null;
  categories: readonly { id: string; name: string }[];
  compact: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onCreateProduct?: () => void;
  onEditProduct?: (product: ProductSummaryView) => void;
  onLifecycle?: (
    action: ProductLifecycleAction,
    product: ProductSummaryView,
  ) => void;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  onQueryChange: (query: ProductListQuery) => void;
  onViewProduct?: (product: ProductSummaryView) => void;
  page: number;
  products: readonly ProductSummaryView[];
  query: ProductListQuery;
  session?: MerchantSession;
}) {
  const [sortKey, setSortKey] = useState<ProductSortKey>("updated");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [tableWidth, setTableWidth] = useState(0);

  const rows = useMemo(
    () => sortProductPage(products, sortKey, sortDirection),
    [products, sortDirection, sortKey],
  );
  const categoryName = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const sortBy = (key: ProductSortKey) => {
    setSortDirection((current) =>
      sortKey === key ? (current === "desc" ? "asc" : "desc") : "desc",
    );
    setSortKey(key);
  };
  // Every filter change resets to the first page: a cursor from the old filter
  // set would page through rows the merchant is no longer looking at.
  const setFilter = (next: Partial<ProductListQuery>) => {
    onQueryChange({ ...query, ...next, cursor: undefined });
  };

  const dense = tableWidth > 0 && tableWidth < DENSE_TABLE_WIDTH;
  const writable = Boolean(session && can(session, "products.write"));
  const filtered = Boolean(
    query.search || query.status || query.categoryId || query.stockStatus,
  );

  const createAction = (
    <DashboardButton
      disabled={!writable}
      icon="plus"
      label="Create Product"
      onPress={onCreateProduct}
      testID="catalog-create-product"
      title="Your role cannot create products."
      tone="primary"
    />
  );

  // A library with nothing in it is a different message from a filter that
  // matched nothing, and only the first one should offer to create a product.
  if (products.length === 0 && !filtered && page === 1) {
    return (
      <DashboardCard testID="catalog-products">
        <SectionHeading
          description="Everything you sell, in one place."
          title="Products"
        />
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <DashboardIcon
              color={colors.feedback.danger}
              name="tag-plus-outline"
              size={26}
            />
          </View>
          <StylishText
            accessibilityRole="header"
            style={styles.emptyTitle}
            unstyled
            variant="headingSmall"
          >
            No products yet
          </StylishText>
          <StylishText style={styles.emptyBody} unstyled variant="bodySmall">
            Create your first product as a draft, add its variants and pricing,
            then publish it to start receiving orders.
          </StylishText>
          {createAction}
        </View>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard testID="catalog-products">
      <SectionHeading
        action={createAction}
        description={
          filtered
            ? `${products.length} products match your filters`
            : `${products.length} products on this page`
        }
        title="Products"
      />

      <View style={styles.controls}>
        <SearchField
          accessibilityLabel="Search products"
          label="Search products"
          onChangeText={(search) => setFilter({ search: search || undefined })}
          placeholder="Product name"
          testID="product-search"
          value={query.search ?? ""}
        />
        <FilterSelect
          label="Status"
          onChange={(next) =>
            setFilter({
              status: PRODUCT_STATUSES.find(
                (status) => productStatusLabels[status] === next,
              ),
            })
          }
          options={[
            ALL_PRODUCT_STATUSES,
            ...PRODUCT_STATUSES.map((status) => productStatusLabels[status]),
          ]}
          testID="product-status-filter"
          value={
            query.status
              ? productStatusLabels[query.status]
              : ALL_PRODUCT_STATUSES
          }
        />
        <FilterSelect
          label="Category"
          onChange={(next) =>
            setFilter({
              categoryId: categories.find((category) => category.name === next)
                ?.id,
            })
          }
          options={[
            ALL_CATEGORIES,
            ...categories.map((category) => category.name),
          ]}
          testID="product-category-filter"
          value={
            query.categoryId
              ? (categoryName.get(query.categoryId) ?? ALL_CATEGORIES)
              : ALL_CATEGORIES
          }
        />
        <FilterSelect
          label="Stock"
          onChange={(next) =>
            setFilter({
              stockStatus: STOCK_STATUSES.find(
                (status) => stockStatusLabels[status] === next,
              ),
            })
          }
          options={[
            ALL_STOCK_STATES,
            ...STOCK_STATUSES.map((status) => stockStatusLabels[status]),
          ]}
          testID="product-stock-filter"
          value={
            query.stockStatus
              ? stockStatusLabels[query.stockStatus]
              : ALL_STOCK_STATES
          }
        />
      </View>

      {compact ? (
        <View
          style={[styles.cards, { minHeight: PRODUCT_CARDS_BODY_HEIGHT }]}
          testID="catalog-products-body"
        >
          {rows.map((product) => (
            <ProductCard
              brandName={
                product.brandId ? brandNames.get(product.brandId) : undefined
              }
              busy={busyProductId === product.id}
              key={product.id}
              onEdit={onEditProduct}
              onLifecycle={onLifecycle}
              onView={onViewProduct}
              product={product}
              session={session}
            />
          ))}
          {rows.length === 0 ? <NoMatches /> : null}
        </View>
      ) : (
        <ScrollView
          className="st-scroll"
          contentContainerStyle={styles.tableContent}
          horizontal
          onLayout={(event) => setTableWidth(event.nativeEvent.layout.width)}
          showsHorizontalScrollIndicator
          style={styles.tableScroll}
        >
          <View
            accessibilityRole="list"
            style={[
              styles.table,
              {
                minWidth: dense ? DENSE_TABLE_MIN_WIDTH : FULL_TABLE_MIN_WIDTH,
              },
            ]}
          >
            <View style={[styles.tableRow, styles.tableHeader]}>
              <SortHeaderCell
                active={sortKey === "name"}
                ascendingHint="A to Z"
                descendingHint="Z to A"
                direction={sortDirection}
                label="Product"
                onPress={() => sortBy("name")}
                testID="products-sort-name"
                width={2.6}
              />
              <TableCell width={1}>
                <TableText header value="Status" />
              </TableCell>
              {dense ? null : (
                <TableCell width={1.2}>
                  <TableText header value="Brand" />
                </TableCell>
              )}
              <SortHeaderCell
                active={sortKey === "stock"}
                ascendingHint="lowest first"
                descendingHint="highest first"
                direction={sortDirection}
                label="Stock"
                onPress={() => sortBy("stock")}
                testID="products-sort-stock"
                width={1.1}
              />
              {dense ? null : (
                <TableCell width={0.8}>
                  <TableText header value="Featured" />
                </TableCell>
              )}
              <SortHeaderCell
                active={sortKey === "updated"}
                ascendingHint="oldest first"
                descendingHint="newest first"
                direction={sortDirection}
                label="Updated"
                onPress={() => sortBy("updated")}
                testID="products-sort-updated"
                width={1.1}
              />
              <View style={styles.actionsSpacer} />
            </View>

            <View style={styles.tableBody} testID="catalog-products-body">
              {rows.map((product) => (
                <View
                  key={product.id}
                  style={styles.tableRow}
                  testID={`product-row-${product.id}`}
                >
                  <TableCell width={2.6}>
                    <ProductIdentity product={product} />
                  </TableCell>
                  <TableCell width={1}>
                    <StatusChip
                      label={productStatusLabels[product.status]}
                      tone={productStatusTones[product.status]}
                    />
                  </TableCell>
                  {dense ? null : (
                    <TableCell width={1.2}>
                      <TableText
                        value={
                          (product.brandId
                            ? brandNames.get(product.brandId)
                            : undefined) ?? "—"
                        }
                      />
                    </TableCell>
                  )}
                  <TableCell width={1.1}>
                    <StockCell product={product} />
                  </TableCell>
                  {dense ? null : (
                    <TableCell width={0.8}>
                      {product.isFeatured ? (
                        <DashboardIcon
                          color={colors.feedback.rating}
                          name="star"
                          size={16}
                        />
                      ) : (
                        <TableText value="—" />
                      )}
                    </TableCell>
                  )}
                  <TableCell width={1.1}>
                    <TableText value={formatUpdated(product.updatedAt)} />
                  </TableCell>
                  <RowActionsButton
                    accessibilityLabel={`Actions for ${product.name}`}
                    items={rowMenuItems({
                      onEdit: onEditProduct,
                      onLifecycle,
                      onView: onViewProduct,
                      product,
                      session,
                    })}
                    menuLabel={`${product.name} actions`}
                    testID={`product-actions-${product.id}`}
                  />
                </View>
              ))}
              {rows.length === 0 ? <NoMatches /> : null}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Cursor pagination: the API reports whether another page exists but no
          total, so the footer counts pages walked rather than claiming a total. */}
      <View style={styles.pagination}>
        <StylishText
          accessibilityLiveRegion="polite"
          style={styles.pageLabel}
          unstyled
          variant="caption"
        >
          Page {page}
        </StylishText>
        <View style={styles.paginationButtons}>
          <DashboardButton
            disabled={!hasPreviousPage}
            icon="chevron-left"
            label="Previous"
            onPress={onPreviousPage}
            testID="products-previous-page"
            tone="quiet"
          />
          <DashboardButton
            disabled={!hasNextPage}
            label="Next"
            onPress={onNextPage}
            testID="products-next-page"
            trailingIcon="chevron-right"
          />
        </View>
      </View>
    </DashboardCard>
  );
}

function ProductIdentity({ product }: { product: ProductSummaryView }) {
  return (
    <View style={styles.identityCopy}>
      <StylishText
        numberOfLines={2}
        style={styles.productName}
        unstyled
        variant="caption"
      >
        {product.name}
      </StylishText>
      <StylishText
        numberOfLines={1}
        style={styles.productSlug}
        unstyled
        variant="caption"
      >
        /{product.slug}
      </StylishText>
    </View>
  );
}

/** On-hand count over its stock state, so the number carries its meaning. */
function StockCell({ product }: { product: ProductSummaryView }) {
  return (
    <View style={styles.stockCell}>
      <TableText numeric strong value={formatCount(product.availableStock)} />
      <StylishText
        numberOfLines={1}
        style={[
          styles.stockState,
          product.stockStatus === "LOW_STOCK" && styles.stockStateWarning,
          product.stockStatus === "OUT_OF_STOCK" && styles.stockStateDanger,
        ]}
        unstyled
        variant="caption"
      >
        {stockStatusLabels[product.stockStatus]}
      </StylishText>
    </View>
  );
}

function NoMatches() {
  return (
    <View style={styles.emptyRow}>
      <StylishText style={styles.emptyText} unstyled variant="caption">
        No products match your filters.
      </StylishText>
    </View>
  );
}

/** The mobile row: the table's columns restacked rather than squeezed. */
function ProductCard({
  brandName,
  busy,
  onEdit,
  onLifecycle,
  onView,
  product,
  session,
}: {
  brandName?: string;
  busy: boolean;
  onEdit?: (product: ProductSummaryView) => void;
  onLifecycle?: (
    action: ProductLifecycleAction,
    product: ProductSummaryView,
  ) => void;
  onView?: (product: ProductSummaryView) => void;
  product: ProductSummaryView;
  session?: MerchantSession;
}) {
  return (
    <View
      style={[styles.card, busy && styles.cardBusy]}
      testID={`product-card-${product.id}`}
    >
      <View style={styles.cardHeading}>
        <ProductIdentity product={product} />
        <RowActionsButton
          accessibilityLabel={`Actions for ${product.name}`}
          items={rowMenuItems({
            onEdit,
            onLifecycle,
            onView,
            product,
            session,
          })}
          menuLabel={`${product.name} actions`}
          testID={`product-card-actions-${product.id}`}
        />
      </View>
      <View style={styles.cardChips}>
        <StatusChip
          label={productStatusLabels[product.status]}
          tone={productStatusTones[product.status]}
        />
        <StatusChip
          label={stockStatusLabels[product.stockStatus]}
          tone={stockTones[product.stockStatus]}
        />
      </View>
      <StylishText
        numberOfLines={1}
        style={styles.cardMeta}
        unstyled
        variant="caption"
      >
        {brandName ?? "No brand"} · {formatCount(product.availableStock)} in
        stock · Updated {formatUpdated(product.updatedAt)}
      </StylishText>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsSpacer: { flexBasis: 40, flexGrow: 0, flexShrink: 0 },
  card: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderStyle: "solid",
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: PRODUCT_CARD_HEIGHT,
    padding: spacing.md,
  },
  cardBusy: { opacity: 0.6 },
  cardChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  cardHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
    // Two lines of product name are always reserved, so stacked cards keep a
    // uniform height and the loading placeholder can mirror them.
    minHeight: 49,
  },
  cardMeta: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 16,
  },
  cards: { gap: spacing.sm, paddingHorizontal: spacing.md },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  emptyBody: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 420,
    textAlign: "center",
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.feedback.dangerSoft,
    borderColor: colors.brand.pinkSoft,
    borderRadius: borderRadius.md,
    borderStyle: "solid",
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  emptyRow: { paddingVertical: spacing.xl },
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  emptyTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    lineHeight: 26,
    textAlign: "center",
  },
  // `flexBasis: 0` so the copy claims only leftover space: sized from its text
  // instead, a long product name would push the metric columns out of line.
  identityCopy: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    gap: 1,
    minWidth: 0,
  },
  pageLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  paginationButtons: { flexDirection: "row", gap: spacing.xs },
  productName: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
  },
  productSlug: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 9,
    lineHeight: 14,
  },
  stockCell: { gap: 1 },
  stockState: {
    color: colors.feedback.success,
    fontFamily: "Montserrat_500Medium",
    fontSize: 9,
    lineHeight: 13,
  },
  stockStateDanger: { color: colors.feedback.danger },
  stockStateWarning: { color: colors.feedback.warning },
  table: { flexGrow: 1, paddingHorizontal: spacing.lg },
  // Holds a full page even when the last one is short, so the footer stays put
  // and the loading skeleton can reserve the same box.
  tableBody: { minHeight: PRODUCT_TABLE_BODY_HEIGHT },
  tableContent: { flexGrow: 1 },
  tableHeader: { backgroundColor: colors.neutral[50] },
  tableRow: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: PRODUCT_ROW_HEIGHT,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  tableScroll: { flexGrow: 0 },
});
