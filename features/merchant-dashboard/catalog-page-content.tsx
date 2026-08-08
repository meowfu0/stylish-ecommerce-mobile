import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { catalogSectionLabels } from "@/features/merchant-dashboard/catalog-data-source";
import {
  CatalogProductsSection,
  PRODUCT_CARD_HEIGHT,
  PRODUCT_PAGE_SIZE,
  PRODUCT_ROW_HEIGHT,
  type ProductLifecycleAction,
} from "@/features/merchant-dashboard/catalog-products-section";
import {
  CatalogTaxonomySection,
  catalogTaxonomyCopy,
  TAXONOMY_CARD_HEIGHT,
  TAXONOMY_ROW_HEIGHT,
} from "@/features/merchant-dashboard/catalog-taxonomy-section";
import { DashboardDialog } from "@/features/merchant-dashboard/dashboard-dialog";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  DashboardSkeleton,
} from "@/features/merchant-dashboard/dashboard-primitives";
import {
  DashboardBlockingState,
  DashboardSectionUnavailable,
  DashboardStateBanner,
} from "@/features/merchant-dashboard/dashboard-states";
import type {
  CatalogPageKey,
  DashboardDataState,
  DashboardState,
  MerchantSession,
  Permission,
} from "@/features/merchant-dashboard/dashboard-types";
import { ProductFormModal } from "@/features/merchant-dashboard/product-form-modal";
import { useMerchantCatalogData } from "@/features/merchant-dashboard/use-merchant-catalog-data";
import { AuthRequestError } from "@/services/auth/auth-error";
import {
  archiveProduct,
  deactivateProduct,
  getProduct,
  newIdempotencyKey,
  type ProductDetailsView,
  type ProductListQuery,
  type ProductSummaryView,
  publishProduct,
} from "@/services/merchant/catalog-api";

/**
 * The Catalog group's four destinations, rendered inside the existing dashboard
 * shell, with the product CRUD that hangs off the Products page.
 *
 * Catalog loading, filters, paging and mutation state all live here so there is
 * one owner: a mutation can refetch the exact query the merchant is looking at
 * instead of resetting them back to an unfiltered first page.
 */

const taxonomySingulars: Record<Exclude<CatalogPageKey, "products">, string> = {
  brands: "brand",
  categories: "category",
  collections: "collection",
};

const lifecycleCopy: Record<
  ProductLifecycleAction,
  { body: (name: string) => string; confirm: string; title: string }
> = {
  archive: {
    body: (name) =>
      `${name} will be archived and removed from your storefront. Archived products cannot be edited or reactivated, and their order history, inventory records and images are kept intact.`,
    confirm: "Archive Product",
    title: "Archive this product?",
  },
  deactivate: {
    body: (name) =>
      `${name} will stop appearing on your storefront. You can publish it again at any time.`,
    confirm: "Unpublish",
    title: "Unpublish this product?",
  },
  publish: {
    body: (name) =>
      `${name} will become visible on your storefront. It needs a description, a category and at least one active default variant with a price.`,
    confirm: "Publish",
    title: "Publish this product?",
  },
};

export function CatalogPageContent({
  compact,
  deniedSection,
  onContactSupport,
  onImportCatalog,
  onReturnToOverview,
  onReviewMerchantProfile,
  onSignInAgain,
  paired,
  requiredPermission,
  resolveState,
  section,
  session,
}: {
  compact: boolean;
  deniedSection?: string;
  onContactSupport?: () => void;
  onImportCatalog?: () => void;
  onReturnToOverview?: () => void;
  onReviewMerchantProfile?: () => void;
  onSignInAgain?: () => void | Promise<void>;
  paired: boolean;
  requiredPermission?: Permission;
  /** Folds the catalog's data state into the shell's auth/store/role rules. */
  resolveState: (dataState: DashboardDataState) => DashboardState;
  section: CatalogPageKey;
  session: MerchantSession;
}) {
  const merchantId = session.merchantId;
  // Cursors already walked, so Previous can step back through a cursor API that
  // only ever hands out the next one.
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ProductListQuery>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDetailsView | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [pending, setPending] = useState<{
    action: ProductLifecycleAction;
    product: ProductSummaryView;
  } | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const productQuery = useMemo<ProductListQuery>(
    () => ({
      ...filters,
      cursor: cursors[page - 1],
      limit: PRODUCT_PAGE_SIZE,
    }),
    [cursors, filters, page],
  );

  const catalog = useMerchantCatalogData({
    enabled: Boolean(merchantId),
    merchantId,
    productQuery: section === "products" ? productQuery : undefined,
  });

  const state = resolveState(
    catalog.permissionDenied ? "ready" : catalog.dataState,
  );
  const effectiveState: DashboardState = catalog.permissionDenied
    ? "permission-denied"
    : state;

  const changeFilters = useCallback((next: ProductListQuery) => {
    const { cursor: _cursor, limit: _limit, ...rest } = next;
    setFilters(rest);
    setCursors([undefined]);
    setPage(1);
  }, []);

  const nextPage = () => {
    if (!catalog.nextCursor) return;
    setCursors((current) => {
      const copy = [...current];
      copy[page] = catalog.nextCursor ?? undefined;
      return copy;
    });
    setPage((current) => current + 1);
  };

  const openCreate = () => {
    setEditing(null);
    setActionError(null);
    setFormOpen(true);
  };

  const openEdit = async (product: ProductSummaryView) => {
    if (!merchantId) return;
    setActionError(null);
    setLoadingProduct(true);
    setBusyProductId(product.id);
    try {
      // The list returns a summary; the form needs categories, descriptions and
      // the primary category, which only the detail endpoint reports.
      setEditing(await getProduct(merchantId, product.id));
      setFormOpen(true);
    } catch (error) {
      setActionError(messageFor(error, "That product could not be opened."));
    } finally {
      setLoadingProduct(false);
      setBusyProductId(null);
    }
  };

  const runLifecycle = async () => {
    if (!merchantId || !pending) return;
    const { action, product } = pending;
    setBusyProductId(product.id);
    setActionError(null);
    try {
      const key = newIdempotencyKey(action);
      if (action === "publish")
        await publishProduct(merchantId, product.id, key);
      else if (action === "deactivate") {
        await deactivateProduct(merchantId, product.id, key);
      } else await archiveProduct(merchantId, product.id, key);
      setPending(null);
      catalog.refresh();
    } catch (error) {
      setActionError(messageFor(error, "That action could not be completed."));
      setPending(null);
    } finally {
      setBusyProductId(null);
    }
  };

  if (!merchantId) {
    return (
      <View style={styles.column}>
        <DashboardSectionUnavailable
          body="This workspace has no merchant ID, so the catalog cannot be loaded. Switch workspace and try again."
          section={section}
          sectionLabels={catalogSectionLabels}
          tall
        />
      </View>
    );
  }

  if (effectiveState === "loading") {
    return <CatalogLoadingState compact={compact} section={section} />;
  }

  const renderPage = ["ready", "partial", "refreshing"].includes(
    effectiveState,
  );
  const unavailable = catalog.failedSections.includes(section);

  return (
    <View style={styles.column}>
      <DashboardStateBanner
        failedSections={catalog.failedSections}
        onRetry={catalog.retry}
        sectionLabels={catalogSectionLabels}
        state={effectiveState}
      />
      <DashboardBlockingState
        deniedSection={deniedSection}
        onContactSupport={onContactSupport}
        onCreateProduct={openCreate}
        onImportCatalog={onImportCatalog}
        onRetry={catalog.retry}
        onReturnToOverview={onReturnToOverview}
        onReviewMerchantProfile={onReviewMerchantProfile}
        onSignInAgain={onSignInAgain}
        paired={paired}
        requiredPermission={requiredPermission}
        session={session}
        state={effectiveState}
      />

      {actionError ? (
        <View style={styles.actionError} testID="catalog-action-error">
          <DashboardIcon
            color={colors.feedback.danger}
            name="alert-circle-outline"
            size={16}
          />
          <StylishText
            style={styles.actionErrorText}
            unstyled
            variant="caption"
          >
            {actionError}
          </StylishText>
        </View>
      ) : null}

      {renderPage ? (
        unavailable ? (
          <DashboardSectionUnavailable
            body="The rest of your catalog is unaffected. Try loading this page again in a moment."
            onRetry={catalog.retry}
            section={section}
            sectionLabels={catalogSectionLabels}
            tall
          />
        ) : section === "products" ? (
          <CatalogProductsSection
            brandNames={catalog.brandNames}
            busyProductId={busyProductId}
            categories={catalog.categoryOptions}
            compact={compact}
            hasNextPage={Boolean(catalog.nextCursor)}
            hasPreviousPage={page > 1}
            onCreateProduct={openCreate}
            onEditProduct={(product) => void openEdit(product)}
            onLifecycle={(action, product) => setPending({ action, product })}
            onNextPage={nextPage}
            onPreviousPage={() =>
              setPage((current) => Math.max(1, current - 1))
            }
            onQueryChange={changeFilters}
            onViewProduct={(product) => void openEdit(product)}
            page={page}
            products={catalog.products}
            query={productQuery}
            session={session}
          />
        ) : (
          <CatalogTaxonomySection
            compact={compact}
            copy={catalogTaxonomyCopy[section]}
            records={
              section === "categories"
                ? catalog.categories
                : section === "collections"
                  ? catalog.collections
                  : catalog.brands
            }
            section={section}
            session={session}
            singular={taxonomySingulars[section]}
          />
        )
      ) : null}

      <ProductFormModal
        brands={catalog.brandOptions}
        categories={catalog.categoryOptions}
        merchantId={merchantId}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          // Refetch the query the merchant is actually looking at, so a create
          // or an edit never silently resets their filters or their page.
          catalog.refresh();
        }}
        product={editing}
        visible={formOpen && !loadingProduct}
      />

      <DashboardDialog
        busy={busyProductId !== null}
        footer={
          <>
            <DashboardButton
              disabled={busyProductId !== null}
              label="Cancel"
              onPress={() => setPending(null)}
              testID="lifecycle-cancel"
              tone="quiet"
            />
            <DashboardButton
              disabled={busyProductId !== null}
              label={
                pending ? lifecycleCopy[pending.action].confirm : "Confirm"
              }
              onPress={() => void runLifecycle()}
              testID="lifecycle-confirm"
              tone="primary"
            />
          </>
        }
        onClose={() => setPending(null)}
        testID="lifecycle-dialog"
        title={pending ? lifecycleCopy[pending.action].title : ""}
        visible={pending !== null}
        width={520}
      >
        <StylishText style={styles.dialogBody} unstyled variant="bodySmall">
          {pending
            ? lifecycleCopy[pending.action].body(pending.product.name)
            : ""}
        </StylishText>
        {pending?.action === "archive" ? (
          <StylishText style={styles.dialogNote} unstyled variant="caption">
            Nothing is deleted. Velori has no hard delete for products because
            orders, inventory and collections reference them.
          </StylishText>
        ) : null}
      </DashboardDialog>
    </View>
  );
}

/** A safe sentence for the merchant; never a raw server payload or stack. */
function messageFor(error: unknown, fallback: string) {
  if (!(error instanceof AuthRequestError)) return fallback;
  if (error.kind === "permission-denied") {
    return "Your role does not allow that action.";
  }
  if (error.status === 404) return "That product no longer exists.";
  if (error.status === 409) {
    return error.message || "That action conflicts with the product's status.";
  }
  return error.message || fallback;
}

/**
 * Loading placeholder for a catalog page. Every block is built from the
 * dimensions the real page uses — the section heading's padding and divider, the
 * 44px filter controls, the table's own row height and the pagination footer —
 * so the layout does not move when the rows arrive.
 */
export function CatalogLoadingState({
  compact,
  section,
}: {
  compact: boolean;
  section: CatalogPageKey;
}) {
  const products = section === "products";
  const rowHeight = products ? PRODUCT_ROW_HEIGHT : TAXONOMY_ROW_HEIGHT;
  const cardHeight = products ? PRODUCT_CARD_HEIGHT : TAXONOMY_CARD_HEIGHT;

  return (
    <View
      accessibilityLabel={`Loading ${section}.`}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      style={styles.column}
      testID={`catalog-state-loading-${section}`}
    >
      <DashboardCard>
        <View style={styles.skeletonHeading}>
          <View style={styles.skeletonHeadingCopy}>
            <DashboardSkeleton style={styles.skeletonTitle} />
            <DashboardSkeleton style={styles.skeletonDescription} />
          </View>
          <DashboardSkeleton style={styles.skeletonAction} />
        </View>
        <View style={styles.skeletonControls}>
          <View style={styles.skeletonSearchField}>
            <DashboardSkeleton style={styles.skeletonFieldLabel} />
            <DashboardSkeleton style={styles.skeletonControl} />
          </View>
          {Array.from({ length: products ? 3 : 1 }, (_value, index) => (
            <View key={index} style={styles.skeletonSelectField}>
              <DashboardSkeleton style={styles.skeletonFieldLabel} />
              <DashboardSkeleton style={styles.skeletonControl} />
            </View>
          ))}
        </View>
        <View style={compact ? styles.skeletonCards : styles.skeletonRows}>
          {/* The table's own header row; leaving it out was a constant
              shortfall of one row height on every page. */}
          {compact ? null : (
            <View
              style={[
                styles.skeletonRow,
                styles.skeletonHeaderRow,
                { height: rowHeight },
              ]}
            />
          )}
          {Array.from({ length: SKELETON_ROW_COUNT }, (_value, index) =>
            compact ? (
              <DashboardSkeleton
                key={index}
                style={[styles.skeletonCardBlock, { height: cardHeight }]}
              />
            ) : (
              <View
                key={index}
                style={[styles.skeletonRow, { height: rowHeight }]}
              >
                <DashboardSkeleton style={styles.skeletonRowLine} />
              </View>
            ),
          )}
        </View>
        <View style={styles.skeletonPagination}>
          <DashboardSkeleton style={styles.skeletonPageLabel} />
          <DashboardSkeleton style={styles.skeletonPageButtons} />
        </View>
      </DashboardCard>
    </View>
  );
}

/** One filled page, matching the height both tables reserve. */
const SKELETON_ROW_COUNT = 8;

const styles = StyleSheet.create({
  actionError: {
    alignItems: "flex-start",
    backgroundColor: colors.feedback.dangerSoft,
    borderColor: colors.feedback.dangerBorder,
    borderRadius: borderRadius.md,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  actionErrorText: {
    color: colors.feedback.danger,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  column: { gap: 20, minWidth: 0, width: "100%" },
  dialogBody: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  dialogNote: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  skeletonAction: { borderRadius: borderRadius.input, height: 44, width: 148 },
  skeletonCardBlock: { borderRadius: borderRadius.md },
  skeletonCards: { gap: spacing.sm, paddingHorizontal: spacing.md },
  skeletonControl: { borderRadius: borderRadius.input, height: 44 },
  skeletonControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  skeletonDescription: { height: 18, maxWidth: 260, width: "70%" },
  skeletonFieldLabel: { height: 16, width: 72 },
  skeletonHeaderRow: { backgroundColor: colors.neutral[50] },
  skeletonHeading: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  skeletonHeadingCopy: { flex: 1, gap: spacing.xxs, minWidth: 220 },
  skeletonPageButtons: {
    borderRadius: borderRadius.input,
    height: 44,
    width: 210,
  },
  skeletonPageLabel: { height: 12, width: 96 },
  skeletonPagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  skeletonRow: {
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    justifyContent: "center",
  },
  skeletonRowLine: { height: 12, width: "100%" },
  skeletonRows: { paddingHorizontal: spacing.lg },
  skeletonSearchField: {
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing.xxs,
    minWidth: 220,
  },
  skeletonSelectField: {
    flexGrow: 0,
    flexShrink: 0,
    gap: spacing.xxs,
    width: 168,
  },
  skeletonTitle: { height: 24, maxWidth: 180, width: "45%" },
});
