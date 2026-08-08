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
  type DashboardIconName,
  SectionHeading,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import {
  FilterSelect,
  paginate,
  RowActionsButton,
  SearchField,
  SortHeaderCell,
  TableCell,
  TablePagination,
  TableText,
} from "@/features/merchant-dashboard/dashboard-table";
import type {
  CatalogPageKey,
  CatalogRecordStatus,
  CatalogTaxonomyRecord,
  MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";
import { CATALOG_RECORD_STATUSES } from "@/features/merchant-dashboard/dashboard-types";

/**
 * Categories, Collections and Brands.
 *
 * All three manage the same record — a name, a handle, how many products sit
 * under it, a status and when it last changed — so they share one screen and
 * differ only in their wording and the status vocabulary they present. Building
 * three near-identical pages would have guaranteed they drifted apart.
 */

export const ALL_TAXONOMY_STATUSES = "All statuses";

const PAGE_SIZE = 8;
const TABLE_MIN_WIDTH = 720;
/**
 * A full page of rows is reserved even when the last page is short, so the
 * pagination footer stays still while a merchant pages through and the loading
 * skeleton can reserve the same box. Card heights are measured from the rendered
 * card rather than derived, because its meta line wraps at narrow widths.
 */
export const TAXONOMY_ROW_HEIGHT = 48;
export const TAXONOMY_TABLE_BODY_HEIGHT = PAGE_SIZE * TAXONOMY_ROW_HEIGHT;
export const TAXONOMY_CARD_HEIGHT = 98;
export const TAXONOMY_CARDS_BODY_HEIGHT =
  PAGE_SIZE * TAXONOMY_CARD_HEIGHT + (PAGE_SIZE - 1) * spacing.sm;

const statusTones: Record<
  CatalogRecordStatus,
  ComponentProps<typeof StatusChip>["tone"]
> = {
  Active: "green",
  Inactive: "neutral",
};

export type TaxonomySortKey = "name" | "products" | "updated";

export type CatalogTaxonomyCopy = {
  createLabel: string;
  description: string;
  emptyBody: string;
  emptyTitle: string;
  icon: DashboardIconName;
  /** Renders the stored status in this page's own vocabulary. */
  statusLabel: (status: CatalogRecordStatus) => string;
  statusColumnLabel: string;
  searchPlaceholder: string;
  title: string;
};

export const catalogTaxonomyCopy: Record<
  Exclude<CatalogPageKey, "products">,
  CatalogTaxonomyCopy
> = {
  brands: {
    createLabel: "Create Brand",
    description: "Labels a product can be attributed to.",
    emptyBody:
      "Add a brand to attribute products to a label, then assign products to it from the product editor.",
    emptyTitle: "No brands yet",
    icon: "tag-outline",
    searchPlaceholder: "Brand name or handle",
    statusColumnLabel: "Status",
    statusLabel: (status) => status,
    title: "Brands",
  },
  categories: {
    createLabel: "Create Category",
    description: "How your catalog is organised for shoppers.",
    emptyBody:
      "Add a category to group products, then assign products to it from the product editor.",
    emptyTitle: "No categories yet",
    icon: "shape-outline",
    searchPlaceholder: "Category name or handle",
    statusColumnLabel: "Status",
    statusLabel: (status) => status,
    title: "Categories",
  },
  collections: {
    createLabel: "Create Collection",
    description: "Curated groups you can merchandise and publish together.",
    emptyBody:
      "Create a collection to merchandise a group of products together, then publish it to your storefront.",
    emptyTitle: "No collections yet",
    icon: "layers-outline",
    searchPlaceholder: "Collection name or handle",
    // A collection's status is its publication state, so it is named that way
    // here without storing a second vocabulary for the same three values.
    statusColumnLabel: "Publication",
    statusLabel: (status) => (status === "Active" ? "Published" : "Hidden"),
    title: "Collections",
  },
};

/** Pure so a search term and a status filter can be tested without a table. */
export function filterTaxonomyRecords(
  records: readonly CatalogTaxonomyRecord[],
  { query, status }: { query: string; status: string },
) {
  const needle = query.trim().toLowerCase();

  return records.filter((record) => {
    if (status !== ALL_TAXONOMY_STATUSES && record.status !== status) {
      return false;
    }
    if (!needle) return true;
    return (
      record.name.toLowerCase().includes(needle) ||
      record.handle.toLowerCase().includes(needle)
    );
  });
}

/** Ties break on the handle so equal rows keep a fixed order between renders. */
export function sortTaxonomyRecords(
  records: readonly CatalogTaxonomyRecord[],
  key: TaxonomySortKey,
  direction: "asc" | "desc",
) {
  const sign = direction === "desc" ? -1 : 1;

  return [...records].sort((left, right) => {
    const compared =
      key === "name"
        ? left.name.localeCompare(right.name)
        : key === "products"
          ? // A record whose endpoint reports no count sorts last rather than
            // as if it had none.
            (left.productCount ?? -1) - (right.productCount ?? -1)
          : left.updatedAt.localeCompare(right.updatedAt);

    if (compared !== 0) return compared * sign;
    return left.handle.localeCompare(right.handle);
  });
}

/**
 * Row actions, gated by the same product permissions that govern the catalog.
 * A role without write keeps the actions visible but disabled, so staff can tell
 * a missing permission from a missing feature.
 */
export function catalogTaxonomyActions({
  record,
  session,
  singular,
}: {
  record: CatalogTaxonomyRecord;
  session?: MerchantSession;
  singular: string;
}): DashboardMenuItem[] {
  const canWrite = session ? can(session, "products.write") : true;
  const canPublish = session ? can(session, "products.publish") : true;

  return [
    {
      icon: "format-list-bulleted",
      key: "view-products",
      label: `View products in this ${singular}`,
    },
    {
      disabled: !canWrite,
      icon: "pencil-outline",
      key: "edit",
      label: `Edit ${singular}`,
    },
    {
      disabled: !canPublish,
      icon:
        record.status === "Active" ? "eye-off-outline" : "cloud-upload-outline",
      key: "publish",
      label: record.status === "Active" ? "Unpublish" : "Publish",
    },
  ];
}

export function CatalogTaxonomySection({
  compact,
  copy,
  records,
  section,
  session,
  singular,
}: {
  compact: boolean;
  copy: CatalogTaxonomyCopy;
  records: readonly CatalogTaxonomyRecord[];
  section: Exclude<CatalogPageKey, "products">;
  session?: MerchantSession;
  singular: string;
}) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(ALL_TAXONOMY_STATUSES);
  const [sortKey, setSortKey] = useState<TaxonomySortKey>("products");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(
    () =>
      sortTaxonomyRecords(
        filterTaxonomyRecords(records, { query, status }),
        sortKey,
        sortDirection,
      ),
    [query, records, sortDirection, sortKey, status],
  );

  const {
    pageCount,
    rows: pageRows,
    safePage,
  } = paginate(filtered, page, PAGE_SIZE);
  const resetPage = () => setPage(1);
  const sortBy = (key: TaxonomySortKey) => {
    setSortDirection((current) =>
      sortKey === key ? (current === "desc" ? "asc" : "desc") : "desc",
    );
    setSortKey(key);
  };

  // A library with no records at all is a different message from a filter that
  // matched nothing, and only the first one should offer the create action.
  if (records.length === 0) {
    return (
      <DashboardCard testID={`catalog-${section}`}>
        <SectionHeading description={copy.description} title={copy.title} />
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <DashboardIcon
              color={colors.feedback.danger}
              name={copy.icon}
              size={26}
            />
          </View>
          <StylishText
            accessibilityRole="header"
            style={styles.emptyTitle}
            unstyled
            variant="headingSmall"
          >
            {copy.emptyTitle}
          </StylishText>
          <StylishText style={styles.emptyBody} unstyled variant="bodySmall">
            {copy.emptyBody}
          </StylishText>
          <DashboardButton
            disabled={!session || !can(session, "products.write")}
            icon="plus"
            label={copy.createLabel}
            testID={`catalog-${section}-create`}
            title={`Your role cannot create a ${singular}.`}
            tone="primary"
          />
        </View>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard testID={`catalog-${section}`}>
      <SectionHeading
        action={
          <DashboardButton
            disabled={!session || !can(session, "products.write")}
            icon="plus"
            label={copy.createLabel}
            testID={`catalog-${section}-create`}
            title={`Your role cannot create a ${singular}.`}
            tone="primary"
          />
        }
        description={`${filtered.length} of ${records.length} ${copy.title.toLowerCase()} match your filters`}
        title={copy.title}
      />

      <View style={styles.controls}>
        <SearchField
          accessibilityLabel={`Search ${copy.title.toLowerCase()}`}
          label={`Search ${copy.title.toLowerCase()}`}
          onChangeText={(value) => {
            resetPage();
            setQuery(value);
          }}
          placeholder={copy.searchPlaceholder}
          testID={`${section}-search`}
          value={query}
        />
        <FilterSelect
          label={copy.statusColumnLabel}
          onChange={(next) => {
            resetPage();
            setStatus(next);
          }}
          options={[ALL_TAXONOMY_STATUSES, ...CATALOG_RECORD_STATUSES]}
          testID={`${section}-status-filter`}
          value={status}
        />
      </View>

      {compact ? (
        <View
          style={[styles.cards, { minHeight: TAXONOMY_CARDS_BODY_HEIGHT }]}
          testID={`catalog-${section}-body`}
        >
          {pageRows.map((record) => (
            <View
              key={record.key}
              style={styles.card}
              testID={`${section}-card-${record.key}`}
            >
              <View style={styles.cardHeading}>
                <View style={styles.cardCopy}>
                  <StylishText
                    numberOfLines={2}
                    style={styles.recordName}
                    unstyled
                    variant="caption"
                  >
                    {record.name}
                  </StylishText>
                  <StylishText
                    numberOfLines={1}
                    style={styles.recordHandle}
                    unstyled
                    variant="caption"
                  >
                    /{record.handle}
                  </StylishText>
                </View>
                <RowActionsButton
                  accessibilityLabel={`Actions for ${record.name}`}
                  items={catalogTaxonomyActions({ record, session, singular })}
                  menuLabel={`${record.name} actions`}
                  testID={`${section}-card-actions-${record.key}`}
                />
              </View>
              <View style={styles.cardFooter}>
                <StatusChip
                  label={copy.statusLabel(record.status)}
                  tone={statusTones[record.status]}
                />
                <StylishText style={styles.cardMeta} unstyled variant="caption">
                  {countLabel(record.productCount)} · Updated{" "}
                  {formatOrderDate(record.updatedAt)}
                </StylishText>
              </View>
            </View>
          ))}
          {pageRows.length === 0 ? <NoMatches title={copy.title} /> : null}
        </View>
      ) : (
        <ScrollView
          className="st-scroll"
          contentContainerStyle={styles.tableContent}
          horizontal
          showsHorizontalScrollIndicator
          style={styles.tableScroll}
        >
          <View accessibilityRole="list" style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <SortHeaderCell
                active={sortKey === "name"}
                ascendingHint="A to Z"
                descendingHint="Z to A"
                direction={sortDirection}
                label="Name"
                onPress={() => sortBy("name")}
                testID={`${section}-sort-name`}
                width={2.4}
              />
              <TableCell width={1.6}>
                <TableText header value="Handle" />
              </TableCell>
              <SortHeaderCell
                active={sortKey === "products"}
                ascendingHint="fewest first"
                descendingHint="most first"
                direction={sortDirection}
                label="Products"
                onPress={() => sortBy("products")}
                testID={`${section}-sort-products`}
                width={1}
              />
              <TableCell width={1.2}>
                <TableText header value={copy.statusColumnLabel} />
              </TableCell>
              <SortHeaderCell
                active={sortKey === "updated"}
                ascendingHint="oldest first"
                descendingHint="newest first"
                direction={sortDirection}
                label="Updated"
                onPress={() => sortBy("updated")}
                testID={`${section}-sort-updated`}
                width={1.2}
              />
              <View style={styles.actionsSpacer} />
            </View>

            <View style={styles.tableBody} testID={`catalog-${section}-body`}>
              {pageRows.map((record) => (
                <View
                  key={record.key}
                  style={styles.tableRow}
                  testID={`${section}-row-${record.key}`}
                >
                  <TableCell width={2.4}>
                    <TableText strong value={record.name} />
                  </TableCell>
                  <TableCell width={1.6}>
                    <TableText value={`/${record.handle}`} />
                  </TableCell>
                  <TableCell width={1}>
                    <TableText
                      numeric
                      strong={(record.productCount ?? 0) > 0}
                      value={
                        record.productCount === undefined
                          ? "—"
                          : formatCount(record.productCount)
                      }
                    />
                  </TableCell>
                  <TableCell width={1.2}>
                    <StatusChip
                      label={copy.statusLabel(record.status)}
                      tone={statusTones[record.status]}
                    />
                  </TableCell>
                  <TableCell width={1.2}>
                    <TableText value={formatOrderDate(record.updatedAt)} />
                  </TableCell>
                  <RowActionsButton
                    accessibilityLabel={`Actions for ${record.name}`}
                    items={catalogTaxonomyActions({
                      record,
                      session,
                      singular,
                    })}
                    menuLabel={`${record.name} actions`}
                    testID={`${section}-actions-${record.key}`}
                  />
                </View>
              ))}
              {pageRows.length === 0 ? <NoMatches title={copy.title} /> : null}
            </View>
          </View>
        </ScrollView>
      )}

      <TablePagination
        onChange={setPage}
        page={safePage}
        pageCount={pageCount}
        testIDPrefix={section}
      />
    </DashboardCard>
  );
}

/**
 * The brand and category endpoints report no product count, so the page says so
 * rather than printing a zero it cannot stand behind.
 */
function countLabel(count: number | undefined) {
  return count === undefined
    ? "Product count unavailable"
    : `${formatCount(count)} products`;
}

function NoMatches({ title }: { title: string }) {
  return (
    <View style={styles.emptyRow}>
      <StylishText style={styles.emptyRowText} unstyled variant="caption">
        No {title.toLowerCase()} match your filters.
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
    padding: spacing.md,
  },
  cardCopy: { flexBasis: 0, flexGrow: 1, flexShrink: 1, gap: 1, minWidth: 0 },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  cardHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
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
  emptyRowText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    lineHeight: 26,
    textAlign: "center",
  },
  recordHandle: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 9,
    lineHeight: 14,
  },
  recordName: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
  },
  // Fills the card when there is room and holds its columns readable when there
  // is not, scrolling horizontally past that point rather than compressing
  // them. The `st-scroll` class keeps that scrollbar thin and in the brand pink.
  table: {
    flexGrow: 1,
    minWidth: TABLE_MIN_WIDTH,
    paddingHorizontal: spacing.lg,
  },
  tableBody: { minHeight: TAXONOMY_TABLE_BODY_HEIGHT },
  tableContent: { flexGrow: 1 },
  tableHeader: { backgroundColor: colors.neutral[50] },
  tableRow: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  tableScroll: { flexGrow: 0 },
});
