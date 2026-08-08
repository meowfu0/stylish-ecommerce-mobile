import { useState, type ComponentProps, type ReactNode } from "react";
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
  RowActionsButton,
  SearchField,
  TableCell,
  TableText,
} from "@/features/merchant-dashboard/dashboard-table";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import {
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_STOCK_STATUSES,
  type InventoryLevelQuery,
  type InventoryLevelView,
  type InventoryLocationView,
  type InventoryMovementQuery,
  type InventoryMovementType,
  type InventoryMovementView,
  type InventoryStockStatus,
  movementTypeLabels,
  stockStatusLabels,
} from "@/services/merchant/inventory-api";

/**
 * The four Inventory pages.
 *
 * They share this module because they share a shape — a filtered, cursor-paged
 * table on desktop and stacked cards on mobile — and building four copies would
 * have guaranteed they drifted apart. Every column shows a field the inventory
 * API genuinely returns; nothing is derived from a placeholder.
 */

export const ALL_LOCATIONS = "All locations";
export const ALL_STOCK_STATUSES = "All stock";
export const ALL_MOVEMENT_TYPES = "All types";

export const INVENTORY_PAGE_SIZE = 25;
export const INVENTORY_ROW_HEIGHT = 52;
export const INVENTORY_TABLE_BODY_HEIGHT = 8 * INVENTORY_ROW_HEIGHT;
export const INVENTORY_CARD_HEIGHT = 152;
export const INVENTORY_CARDS_BODY_HEIGHT =
  8 * INVENTORY_CARD_HEIGHT + 7 * spacing.sm;

const DENSE_TABLE_WIDTH = 900;
const FULL_TABLE_MIN_WIDTH = 900;
const DENSE_TABLE_MIN_WIDTH = 700;

const stockTones: Record<
  InventoryStockStatus,
  ComponentProps<typeof StatusChip>["tone"]
> = {
  IN_STOCK: "green",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "danger",
};

const movementTones: Record<
  InventoryMovementType,
  ComponentProps<typeof StatusChip>["tone"]
> = {
  ADJUSTMENT: "blue",
  STOCK_IN: "green",
  STOCK_OUT: "warning",
};

const movementIcons: Record<InventoryMovementType, DashboardIconName> = {
  ADJUSTMENT: "tune-variant",
  STOCK_IN: "arrow-down-bold-outline",
  STOCK_OUT: "arrow-up-bold-outline",
};

/** ISO timestamps from the API; tables show the date, cards add the time. */
function formatDate(iso: string) {
  return iso ? formatOrderDate(iso.slice(0, 10)) : "—";
}

function formatDateTime(iso: string) {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return formatDate(iso);
  return `${formatDate(iso)} · ${parsed.toISOString().slice(11, 16)}`;
}

/**
 * A stock adjustment needs a single location's optimistic-locking token. The
 * levels endpoint only reports one when a location filter is applied, so an
 * unfiltered aggregate row cannot be adjusted directly.
 */
export function canAdjustLevel(level: InventoryLevelView) {
  return level.version !== null && level.locationId !== null;
}

export function levelRowActions({
  level,
  session,
}: {
  level: InventoryLevelView;
  session?: MerchantSession;
}): DashboardMenuItem[] {
  const allowed = session ? can(session, "inventory.adjust") : true;

  return [
    { icon: "eye-outline", key: "view-variant", label: "View variant stock" },
    {
      disabled: !allowed || !canAdjustLevel(level),
      icon: "tune-variant",
      key: "adjust",
      label: "Adjust stock",
    },
  ];
}

/** Shared page shell: heading, filter row, table/cards body and pagination. */
function InventoryPage({
  action,
  body,
  controls,
  description,
  hasNextPage,
  hasPreviousPage,
  onNextPage,
  onPreviousPage,
  page,
  testID,
  title,
}: {
  action?: ReactNode;
  body: ReactNode;
  controls?: ReactNode;
  description: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  page: number;
  testID: string;
  title: string;
}) {
  return (
    <DashboardCard testID={testID}>
      <SectionHeading action={action} description={description} title={title} />
      {controls ? <View style={styles.controls}>{controls}</View> : null}
      {body}
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
            testID={`${testID}-previous-page`}
            tone="quiet"
          />
          <DashboardButton
            disabled={!hasNextPage}
            label="Next"
            onPress={onNextPage}
            testID={`${testID}-next-page`}
            trailingIcon="chevron-right"
          />
        </View>
      </View>
    </DashboardCard>
  );
}

function TableFrame({
  children,
  dense,
  onLayout,
  testID,
}: {
  children: ReactNode;
  dense: boolean;
  onLayout: (width: number) => void;
  testID: string;
}) {
  return (
    <ScrollView
      className="st-scroll"
      // A horizontal scroller sizes to its content, so without this the table
      // would sit at its minimum width and leave the rest of the card empty.
      contentContainerStyle={styles.tableContent}
      horizontal
      onLayout={(event) => onLayout(event.nativeEvent.layout.width)}
      showsHorizontalScrollIndicator
      style={styles.tableScroll}
    >
      <View
        accessibilityRole="list"
        style={[
          styles.table,
          { minWidth: dense ? DENSE_TABLE_MIN_WIDTH : FULL_TABLE_MIN_WIDTH },
        ]}
        testID={testID}
      >
        {children}
      </View>
    </ScrollView>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <View style={styles.emptyRow}>
      <StylishText style={styles.emptyText} unstyled variant="caption">
        {label}
      </StylishText>
    </View>
  );
}

/** Product name over variant and SKU — the identity every level row leads with. */
function LevelIdentity({ level }: { level: InventoryLevelView }) {
  return (
    <View style={styles.identityCopy}>
      <StylishText
        numberOfLines={2}
        style={styles.rowTitle}
        unstyled
        variant="caption"
      >
        {level.productName}
      </StylishText>
      <StylishText
        numberOfLines={1}
        style={styles.rowMeta}
        unstyled
        variant="caption"
      >
        {level.variantName} · {level.sku}
      </StylishText>
    </View>
  );
}

function StockDatum({
  danger = false,
  label,
  value,
}: {
  danger?: boolean;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.datum}>
      <StylishText style={styles.datumLabel} unstyled variant="caption">
        {label.toUpperCase()}
      </StylishText>
      <StylishText
        style={[styles.datumValue, danger && styles.datumValueDanger]}
        unstyled
        variant="caption"
      >
        {formatCount(value)}
      </StylishText>
    </View>
  );
}

function LocationFilter({
  locations,
  onChange,
  testID,
  value,
}: {
  locations: readonly InventoryLocationView[];
  onChange: (locationId: string | undefined) => void;
  testID: string;
  value: string | undefined;
}) {
  return (
    <FilterSelect
      label="Location"
      onChange={(next) =>
        onChange(locations.find((location) => location.name === next)?.id)
      }
      options={[ALL_LOCATIONS, ...locations.map((location) => location.name)]}
      testID={testID}
      value={
        locations.find((location) => location.id === value)?.name ??
        ALL_LOCATIONS
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Stock Levels                                                        */
/* ------------------------------------------------------------------ */

export function StockLevelsSection({
  compact,
  hasNextPage,
  hasPreviousPage,
  levels,
  locationNames,
  locations,
  onAdjust,
  onNextPage,
  onPreviousPage,
  onQueryChange,
  page,
  query,
  session,
}: {
  compact: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  levels: readonly InventoryLevelView[];
  locationNames: ReadonlyMap<string, string>;
  locations: readonly InventoryLocationView[];
  onAdjust?: (level: InventoryLevelView) => void;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  onQueryChange: (query: InventoryLevelQuery) => void;
  page: number;
  query: InventoryLevelQuery;
  session?: MerchantSession;
}) {
  const [tableWidth, setTableWidth] = useState(0);
  const dense = tableWidth > 0 && tableWidth < DENSE_TABLE_WIDTH;
  const filtered = Boolean(
    query.search || query.stockStatus || query.locationId,
  );
  // Every filter change resets the cursor: one from the old filter set would
  // page through rows the merchant is no longer looking at.
  const setFilter = (next: Partial<InventoryLevelQuery>) =>
    onQueryChange({ ...query, ...next, cursor: undefined });

  const rowMenu = (level: InventoryLevelView) =>
    levelRowActions({ level, session }).map((item) => ({
      ...item,
      onPress:
        item.key === "adjust" && !item.disabled
          ? () => onAdjust?.(level)
          : undefined,
    }));

  return (
    <InventoryPage
      body={
        compact ? (
          <View
            style={[styles.cards, { minHeight: INVENTORY_CARDS_BODY_HEIGHT }]}
            testID="stock-levels-body"
          >
            {levels.map((level) => (
              <View
                key={`${level.variantId}-${level.locationId ?? "all"}`}
                style={styles.card}
                testID={`level-card-${level.variantId}`}
              >
                <View style={styles.cardHeading}>
                  <LevelIdentity level={level} />
                  <RowActionsButton
                    accessibilityLabel={`Actions for ${level.productName}`}
                    items={rowMenu(level)}
                    menuLabel={`${level.productName} inventory actions`}
                    testID={`level-card-actions-${level.variantId}`}
                  />
                </View>
                <View style={styles.cardChips}>
                  <StatusChip
                    label={stockStatusLabels[level.stockStatus]}
                    tone={stockTones[level.stockStatus]}
                  />
                  {level.locationId ? (
                    <StatusChip
                      label={
                        locationNames.get(level.locationId) ??
                        "Unknown location"
                      }
                      tone="neutral"
                    />
                  ) : null}
                </View>
                <View style={styles.cardMetrics}>
                  <StockDatum label="On hand" value={level.onHand} />
                  <StockDatum label="Reserved" value={level.reserved} />
                  <StockDatum
                    danger={level.available <= 0}
                    label="Available"
                    value={level.available}
                  />
                  <StockDatum
                    label="Threshold"
                    value={level.reorderThreshold}
                  />
                </View>
              </View>
            ))}
            {levels.length === 0 ? (
              <EmptyRow
                label={
                  filtered
                    ? "No stock matches your filters."
                    : "No tracked inventory yet."
                }
              />
            ) : null}
          </View>
        ) : (
          <TableFrame
            dense={dense}
            onLayout={setTableWidth}
            testID="stock-levels-table"
          >
            <View style={[styles.tableRow, styles.tableHeader]}>
              <TableCell width={2.6}>
                <TableText header value="Product / variant" />
              </TableCell>
              {dense ? null : (
                <TableCell width={1.3}>
                  <TableText header value="Location" />
                </TableCell>
              )}
              <TableCell width={0.9}>
                <TableText header value="On hand" />
              </TableCell>
              <TableCell width={0.9}>
                <TableText header value="Reserved" />
              </TableCell>
              <TableCell width={0.9}>
                <TableText header value="Available" />
              </TableCell>
              {dense ? null : (
                <TableCell width={0.9}>
                  <TableText header value="Threshold" />
                </TableCell>
              )}
              <TableCell width={1.1}>
                <TableText header value="Status" />
              </TableCell>
              <View style={styles.actionsSpacer} />
            </View>
            <View style={styles.tableBody} testID="stock-levels-body">
              {levels.map((level) => (
                <View
                  key={`${level.variantId}-${level.locationId ?? "all"}`}
                  style={styles.tableRow}
                  testID={`level-row-${level.variantId}`}
                >
                  <TableCell width={2.6}>
                    <LevelIdentity level={level} />
                  </TableCell>
                  {dense ? null : (
                    <TableCell width={1.3}>
                      <TableText
                        value={
                          level.locationId
                            ? (locationNames.get(level.locationId) ?? "—")
                            : "All locations"
                        }
                      />
                    </TableCell>
                  )}
                  <TableCell width={0.9}>
                    <TableText
                      numeric
                      strong
                      value={formatCount(level.onHand)}
                    />
                  </TableCell>
                  <TableCell width={0.9}>
                    <TableText numeric value={formatCount(level.reserved)} />
                  </TableCell>
                  <TableCell width={0.9}>
                    <TableText
                      numeric
                      strong
                      value={formatCount(level.available)}
                    />
                  </TableCell>
                  {dense ? null : (
                    <TableCell width={0.9}>
                      <TableText
                        numeric
                        value={formatCount(level.reorderThreshold)}
                      />
                    </TableCell>
                  )}
                  <TableCell width={1.1}>
                    <StatusChip
                      label={stockStatusLabels[level.stockStatus]}
                      tone={stockTones[level.stockStatus]}
                    />
                  </TableCell>
                  <RowActionsButton
                    accessibilityLabel={`Actions for ${level.productName}`}
                    items={rowMenu(level)}
                    menuLabel={`${level.productName} inventory actions`}
                    testID={`level-actions-${level.variantId}`}
                  />
                </View>
              ))}
              {levels.length === 0 ? (
                <EmptyRow
                  label={
                    filtered
                      ? "No stock matches your filters."
                      : "No tracked inventory yet."
                  }
                />
              ) : null}
            </View>
          </TableFrame>
        )
      }
      controls={
        <>
          <SearchField
            accessibilityLabel="Search stock levels"
            label="Search stock"
            onChangeText={(search) =>
              setFilter({ search: search || undefined })
            }
            placeholder="Product, variant, SKU or barcode"
            testID="levels-search"
            value={query.search ?? ""}
          />
          <LocationFilter
            locations={locations}
            onChange={(locationId) => setFilter({ locationId })}
            testID="levels-location-filter"
            value={query.locationId}
          />
          <FilterSelect
            label="Stock status"
            onChange={(next) =>
              setFilter({
                stockStatus: INVENTORY_STOCK_STATUSES.find(
                  (status) => stockStatusLabels[status] === next,
                ),
              })
            }
            options={[
              ALL_STOCK_STATUSES,
              ...INVENTORY_STOCK_STATUSES.map(
                (status) => stockStatusLabels[status],
              ),
            ]}
            testID="levels-status-filter"
            value={
              query.stockStatus
                ? stockStatusLabels[query.stockStatus]
                : ALL_STOCK_STATUSES
            }
          />
        </>
      }
      description={
        query.locationId
          ? `${levels.length} tracked variants at this location`
          : `${levels.length} tracked variants, totalled across every location`
      }
      hasNextPage={hasNextPage}
      hasPreviousPage={hasPreviousPage}
      onNextPage={onNextPage}
      onPreviousPage={onPreviousPage}
      page={page}
      testID="inventory-stock-levels"
      title="Stock levels"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Low Stock                                                           */
/* ------------------------------------------------------------------ */

export function LowStockSection({
  capped,
  compact,
  hasNextPage,
  hasPreviousPage,
  levels,
  locationNames,
  locations,
  onAdjust,
  onNextPage,
  onPreviousPage,
  onQueryChange,
  page,
  query,
  session,
}: {
  capped: boolean;
  compact: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  levels: readonly InventoryLevelView[];
  locationNames: ReadonlyMap<string, string>;
  locations: readonly InventoryLocationView[];
  onAdjust?: (level: InventoryLevelView) => void;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  onQueryChange: (query: InventoryLevelQuery) => void;
  page: number;
  query: InventoryLevelQuery;
  session?: MerchantSession;
}) {
  const canAdjust = Boolean(session && can(session, "inventory.adjust"));
  const setFilter = (next: Partial<InventoryLevelQuery>) =>
    onQueryChange({ ...query, ...next, cursor: undefined });

  return (
    <InventoryPage
      body={
        <View
          style={[styles.alertList, compact && styles.alertListCompact]}
          testID="low-stock-body"
        >
          {levels.map((level, index) => (
            <View
              key={`${level.variantId}-${level.locationId ?? "all"}`}
              style={[
                styles.alertRow,
                index < levels.length - 1 && styles.alertRowDivided,
              ]}
              testID={`low-stock-row-${level.variantId}`}
            >
              <View style={styles.alertMain}>
                <LevelIdentity level={level} />
                <View style={styles.alertNumbers}>
                  <StockDatum label="On hand" value={level.onHand} />
                  <StockDatum label="Reserved" value={level.reserved} />
                  <StockDatum
                    danger={level.available <= 0}
                    label="Available"
                    value={level.available}
                  />
                  <StockDatum
                    label="Threshold"
                    value={level.reorderThreshold}
                  />
                </View>
              </View>
              <View style={styles.alertActions}>
                <StatusChip
                  label={stockStatusLabels[level.stockStatus]}
                  tone={stockTones[level.stockStatus]}
                />
                {level.locationId ? (
                  <StylishText
                    numberOfLines={1}
                    style={styles.alertLocation}
                    unstyled
                    variant="caption"
                  >
                    {locationNames.get(level.locationId) ?? "Unknown location"}
                  </StylishText>
                ) : null}
                <DashboardButton
                  disabled={!canAdjust || !canAdjustLevel(level)}
                  label="Adjust Stock"
                  onPress={() => onAdjust?.(level)}
                  testID={`low-stock-adjust-${level.variantId}`}
                  title={
                    canAdjust
                      ? "Filter by a location to adjust this variant."
                      : "Your role cannot adjust inventory."
                  }
                />
              </View>
            </View>
          ))}
          {levels.length === 0 ? (
            <EmptyRow label="Nothing is below its reorder threshold." />
          ) : null}
        </View>
      }
      controls={
        <LocationFilter
          locations={locations}
          onChange={(locationId) => setFilter({ locationId })}
          testID="low-stock-location-filter"
          value={query.locationId}
        />
      }
      description={
        capped
          ? "Showing the first 100 variants at or below their reorder threshold."
          : `${levels.length} variants at or below their reorder threshold.`
      }
      hasNextPage={hasNextPage}
      hasPreviousPage={hasPreviousPage}
      onNextPage={onNextPage}
      onPreviousPage={onPreviousPage}
      page={page}
      testID="inventory-low-stock"
      title="Low stock"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Locations                                                           */
/* ------------------------------------------------------------------ */

export function LocationsSection({
  compact,
  locations,
  onCreate,
  onEdit,
  onSetDefault,
  session,
}: {
  compact: boolean;
  locations: readonly InventoryLocationView[];
  onCreate?: () => void;
  onEdit?: (location: InventoryLocationView) => void;
  onSetDefault?: (location: InventoryLocationView) => void;
  session?: MerchantSession;
}) {
  const [tableWidth, setTableWidth] = useState(0);
  const dense = tableWidth > 0 && tableWidth < DENSE_TABLE_WIDTH;
  const manages = Boolean(
    session && can(session, "inventory.locations.manage"),
  );

  const rowMenu = (location: InventoryLocationView): DashboardMenuItem[] => [
    {
      disabled: !manages,
      icon: "pencil-outline",
      key: "edit",
      label: "Edit location",
      onPress: manages ? () => onEdit?.(location) : undefined,
    },
    {
      disabled: !manages || location.isDefault || !location.isActive,
      icon: "star-outline",
      key: "set-default",
      label: "Make default",
      onPress:
        manages && !location.isDefault && location.isActive
          ? () => onSetDefault?.(location)
          : undefined,
    },
  ];

  const createAction = (
    <DashboardButton
      disabled={!manages}
      icon="plus"
      label="Create Location"
      onPress={onCreate}
      testID="locations-create"
      title="Your role cannot manage locations."
      tone="primary"
    />
  );

  if (locations.length === 0) {
    return (
      <DashboardCard testID="inventory-locations">
        <SectionHeading
          description="Where your stock is held."
          title="Locations"
        />
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <DashboardIcon
              color={colors.feedback.danger}
              name="map-marker-outline"
              size={26}
            />
          </View>
          <StylishText
            accessibilityRole="header"
            style={styles.emptyTitle}
            unstyled
            variant="headingSmall"
          >
            No locations yet
          </StylishText>
          <StylishText style={styles.emptyBody} unstyled variant="bodySmall">
            Create a location to hold stock. Every inventory balance and
            movement is recorded against one.
          </StylishText>
          {createAction}
        </View>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard testID="inventory-locations">
      <SectionHeading
        action={createAction}
        description={`${locations.length} locations`}
        title="Locations"
      />
      {compact ? (
        <View style={styles.cards} testID="locations-body">
          {locations.map((location) => (
            <View
              key={location.id}
              style={styles.card}
              testID={`location-card-${location.id}`}
            >
              <View style={styles.cardHeading}>
                <View style={styles.identityCopy}>
                  <StylishText
                    numberOfLines={2}
                    style={styles.rowTitle}
                    unstyled
                    variant="caption"
                  >
                    {location.name}
                  </StylishText>
                  <StylishText
                    numberOfLines={1}
                    style={styles.rowMeta}
                    unstyled
                    variant="caption"
                  >
                    {location.code}
                  </StylishText>
                </View>
                <RowActionsButton
                  accessibilityLabel={`Actions for ${location.name}`}
                  items={rowMenu(location)}
                  menuLabel={`${location.name} actions`}
                  testID={`location-card-actions-${location.id}`}
                />
              </View>
              <View style={styles.cardChips}>
                <StatusChip
                  label={location.isActive ? "Active" : "Inactive"}
                  tone={location.isActive ? "green" : "neutral"}
                />
                {location.isDefault ? (
                  <StatusChip label="Default" tone="pink" />
                ) : null}
              </View>
              {location.addressSnapshot ? (
                <StylishText
                  numberOfLines={2}
                  style={styles.rowMeta}
                  unstyled
                  variant="caption"
                >
                  {location.addressSnapshot}
                </StylishText>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <TableFrame
          dense={dense}
          onLayout={setTableWidth}
          testID="locations-table"
        >
          <View style={[styles.tableRow, styles.tableHeader]}>
            <TableCell width={2}>
              <TableText header value="Location" />
            </TableCell>
            <TableCell width={1}>
              <TableText header value="Code" />
            </TableCell>
            {dense ? null : (
              <TableCell width={2.4}>
                <TableText header value="Address" />
              </TableCell>
            )}
            <TableCell width={1}>
              <TableText header value="Status" />
            </TableCell>
            {dense ? null : (
              <TableCell width={1.1}>
                <TableText header value="Updated" />
              </TableCell>
            )}
            <View style={styles.actionsSpacer} />
          </View>
          <View style={styles.tableBody} testID="locations-body">
            {locations.map((location) => (
              <View
                key={location.id}
                style={styles.tableRow}
                testID={`location-row-${location.id}`}
              >
                <TableCell width={2}>
                  <View style={styles.identityCopy}>
                    <StylishText
                      numberOfLines={2}
                      style={styles.rowTitle}
                      unstyled
                      variant="caption"
                    >
                      {location.name}
                    </StylishText>
                    {location.isDefault ? (
                      <StylishText
                        style={styles.defaultTag}
                        unstyled
                        variant="caption"
                      >
                        Default location
                      </StylishText>
                    ) : null}
                  </View>
                </TableCell>
                <TableCell width={1}>
                  <TableText value={location.code} />
                </TableCell>
                {dense ? null : (
                  <TableCell width={2.4}>
                    <TableText value={location.addressSnapshot ?? "—"} />
                  </TableCell>
                )}
                <TableCell width={1}>
                  <StatusChip
                    label={location.isActive ? "Active" : "Inactive"}
                    tone={location.isActive ? "green" : "neutral"}
                  />
                </TableCell>
                {dense ? null : (
                  <TableCell width={1.1}>
                    <TableText value={formatDate(location.updatedAt)} />
                  </TableCell>
                )}
                <RowActionsButton
                  accessibilityLabel={`Actions for ${location.name}`}
                  items={rowMenu(location)}
                  menuLabel={`${location.name} actions`}
                  testID={`location-actions-${location.id}`}
                />
              </View>
            ))}
          </View>
        </TableFrame>
      )}
      {/* The locations endpoint returns no per-location aggregates, so this
          page reports what it genuinely has rather than a fabricated count. */}
      <View style={styles.note}>
        <DashboardIcon name="information-outline" size={14} />
        <StylishText style={styles.noteText} unstyled variant="caption">
          Per-location variant and stock totals are not reported by the
          inventory API yet. Filter Stock levels by a location to see its
          balances.
        </StylishText>
      </View>
    </DashboardCard>
  );
}

/* ------------------------------------------------------------------ */
/* Movements                                                           */
/* ------------------------------------------------------------------ */

export function MovementsSection({
  compact,
  hasNextPage,
  hasPreviousPage,
  locationNames,
  locations,
  movements,
  onNextPage,
  onPreviousPage,
  onQueryChange,
  page,
  query,
}: {
  compact: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  locationNames: ReadonlyMap<string, string>;
  locations: readonly InventoryLocationView[];
  movements: readonly InventoryMovementView[];
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  onQueryChange: (query: InventoryMovementQuery) => void;
  page: number;
  query: InventoryMovementQuery;
}) {
  const [tableWidth, setTableWidth] = useState(0);
  const dense = tableWidth > 0 && tableWidth < DENSE_TABLE_WIDTH;
  const setFilter = (next: Partial<InventoryMovementQuery>) =>
    onQueryChange({ ...query, ...next, cursor: undefined });

  return (
    <InventoryPage
      body={
        compact ? (
          <View style={styles.cards} testID="movements-body">
            {movements.map((movement) => (
              <View
                key={movement.id}
                style={styles.card}
                testID={`movement-card-${movement.id}`}
              >
                <View style={styles.cardHeading}>
                  <View style={styles.identityCopy}>
                    <StylishText
                      numberOfLines={2}
                      style={styles.rowTitle}
                      unstyled
                      variant="caption"
                    >
                      {movement.productName}
                    </StylishText>
                    <StylishText
                      numberOfLines={1}
                      style={styles.rowMeta}
                      unstyled
                      variant="caption"
                    >
                      {movement.variantName} · {movement.sku}
                    </StylishText>
                  </View>
                  <DeltaBadge movement={movement} />
                </View>
                <View style={styles.cardChips}>
                  <StatusChip
                    icon={movementIcons[movement.movementType]}
                    label={movementTypeLabels[movement.movementType]}
                    tone={movementTones[movement.movementType]}
                  />
                  <StatusChip label={movement.locationCode} tone="neutral" />
                </View>
                <StylishText
                  numberOfLines={2}
                  style={styles.rowMeta}
                  unstyled
                  variant="caption"
                >
                  {movement.beforeOnHand} → {movement.afterOnHand} ·{" "}
                  {formatDateTime(movement.createdAt)}
                </StylishText>
                <StylishText
                  numberOfLines={2}
                  style={styles.reason}
                  unstyled
                  variant="caption"
                >
                  {movement.reason}
                </StylishText>
              </View>
            ))}
            {movements.length === 0 ? (
              <EmptyRow label="No movements match your filters." />
            ) : null}
          </View>
        ) : (
          <TableFrame
            dense={dense}
            onLayout={setTableWidth}
            testID="movements-table"
          >
            <View style={[styles.tableRow, styles.tableHeader]}>
              <TableCell width={1.2}>
                <TableText header value="When" />
              </TableCell>
              <TableCell width={2.4}>
                <TableText header value="Product / variant" />
              </TableCell>
              {dense ? null : (
                <TableCell width={0.9}>
                  <TableText header value="Location" />
                </TableCell>
              )}
              <TableCell width={1.1}>
                <TableText header value="Type" />
              </TableCell>
              <TableCell width={0.8}>
                <TableText header value="Change" />
              </TableCell>
              <TableCell width={1}>
                <TableText header value="On hand" />
              </TableCell>
              {dense ? null : (
                <TableCell width={2}>
                  <TableText header value="Reason" />
                </TableCell>
              )}
            </View>
            <View style={styles.tableBody} testID="movements-body">
              {movements.map((movement) => (
                <View
                  key={movement.id}
                  style={styles.tableRow}
                  testID={`movement-row-${movement.id}`}
                >
                  <TableCell width={1.2}>
                    <TableText value={formatDate(movement.createdAt)} />
                  </TableCell>
                  <TableCell width={2.4}>
                    <View style={styles.identityCopy}>
                      <StylishText
                        numberOfLines={2}
                        style={styles.rowTitle}
                        unstyled
                        variant="caption"
                      >
                        {movement.productName}
                      </StylishText>
                      <StylishText
                        numberOfLines={1}
                        style={styles.rowMeta}
                        unstyled
                        variant="caption"
                      >
                        {movement.variantName} · {movement.sku}
                      </StylishText>
                    </View>
                  </TableCell>
                  {dense ? null : (
                    <TableCell width={0.9}>
                      <TableText
                        value={
                          locationNames.get(movement.locationId) ??
                          movement.locationCode
                        }
                      />
                    </TableCell>
                  )}
                  <TableCell width={1.1}>
                    <StatusChip
                      label={movementTypeLabels[movement.movementType]}
                      tone={movementTones[movement.movementType]}
                    />
                  </TableCell>
                  <TableCell width={0.8}>
                    <DeltaBadge movement={movement} />
                  </TableCell>
                  <TableCell width={1}>
                    <TableText
                      numeric
                      value={`${formatCount(movement.beforeOnHand)} → ${formatCount(
                        movement.afterOnHand,
                      )}`}
                    />
                  </TableCell>
                  {dense ? null : (
                    <TableCell width={2}>
                      <TableText value={movement.reason} />
                    </TableCell>
                  )}
                </View>
              ))}
              {movements.length === 0 ? (
                <EmptyRow label="No movements match your filters." />
              ) : null}
            </View>
          </TableFrame>
        )
      }
      controls={
        <>
          <LocationFilter
            locations={locations}
            onChange={(locationId) => setFilter({ locationId })}
            testID="movements-location-filter"
            value={query.locationId}
          />
          <FilterSelect
            label="Movement type"
            onChange={(next) =>
              setFilter({
                movementType: INVENTORY_MOVEMENT_TYPES.find(
                  (type) => movementTypeLabels[type] === next,
                ),
              })
            }
            options={[
              ALL_MOVEMENT_TYPES,
              ...INVENTORY_MOVEMENT_TYPES.map(
                (type) => movementTypeLabels[type],
              ),
            ]}
            testID="movements-type-filter"
            value={
              query.movementType
                ? movementTypeLabels[query.movementType]
                : ALL_MOVEMENT_TYPES
            }
          />
          <SearchField
            accessibilityLabel="Movements from date"
            label="From (YYYY-MM-DD)"
            onChangeText={(value) =>
              setFilter({
                createdFrom: isIsoDate(value)
                  ? `${value}T00:00:00.000Z`
                  : undefined,
              })
            }
            placeholder="2026-08-01"
            testID="movements-from"
            value={query.createdFrom?.slice(0, 10) ?? ""}
          />
          <SearchField
            accessibilityLabel="Movements to date"
            label="To (YYYY-MM-DD)"
            onChangeText={(value) =>
              setFilter({
                createdTo: isIsoDate(value)
                  ? `${value}T23:59:59.999Z`
                  : undefined,
              })
            }
            placeholder="2026-08-31"
            testID="movements-to"
            value={query.createdTo?.slice(0, 10) ?? ""}
          />
        </>
      }
      description={`${movements.length} movements on this page · history is read-only`}
      hasNextPage={hasNextPage}
      hasPreviousPage={hasPreviousPage}
      onNextPage={onNextPage}
      onPreviousPage={onPreviousPage}
      page={page}
      testID="inventory-movements"
      title="Movements"
    />
  );
}

/** Only a complete date is sent; a half-typed one must not filter the table. */
export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}

function DeltaBadge({ movement }: { movement: InventoryMovementView }) {
  const positive = movement.deltaOnHand > 0;

  return (
    <View style={styles.deltaRow}>
      <DashboardIcon
        color={positive ? colors.feedback.success : colors.feedback.danger}
        name={positive ? "arrow-top-right" : "arrow-bottom-right"}
        size={12}
      />
      <StylishText
        style={[styles.delta, positive ? styles.deltaUp : styles.deltaDown]}
        unstyled
        variant="caption"
      >
        {positive ? "+" : ""}
        {formatCount(movement.deltaOnHand)}
      </StylishText>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsSpacer: { flexBasis: 40, flexGrow: 0, flexShrink: 0 },
  alertActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  alertList: { paddingHorizontal: spacing.lg },
  alertListCompact: { paddingHorizontal: spacing.md },
  alertLocation: {
    color: colors.brand.blue,
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 15,
  },
  alertMain: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  alertNumbers: { flexDirection: "row", flexShrink: 0, gap: spacing.xs },
  alertRow: { gap: spacing.xs, paddingVertical: spacing.sm },
  alertRowDivided: {
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
  },
  card: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderStyle: "solid",
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: INVENTORY_CARD_HEIGHT,
    padding: spacing.md,
  },
  cardChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  cardHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
    minHeight: 45,
  },
  cardMetrics: { flexDirection: "row", gap: spacing.sm },
  cards: { gap: spacing.sm, paddingHorizontal: spacing.md },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  datum: { flexBasis: 0, flexGrow: 1, gap: 1, minWidth: 0 },
  datumLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 9,
    letterSpacing: 0.3,
    lineHeight: 13,
  },
  datumValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    lineHeight: 16,
  },
  datumValueDanger: { color: colors.feedback.danger },
  defaultTag: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_500Medium",
    fontSize: 9,
    lineHeight: 14,
  },
  delta: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    lineHeight: 16,
  },
  deltaDown: { color: colors.feedback.danger },
  deltaRow: { alignItems: "center", flexDirection: "row", gap: 2 },
  deltaUp: { color: colors.feedback.success },
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
  // instead, a long product name would push the numeric columns out of line.
  identityCopy: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    gap: 1,
    minWidth: 0,
  },
  note: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  noteText: {
    color: colors.neutral[550],
    flexShrink: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
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
  reason: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 15,
  },
  rowMeta: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 9,
    lineHeight: 14,
  },
  rowTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
  },
  table: { flexGrow: 1, paddingHorizontal: spacing.lg },
  // Holds a full page even when the last one is short, so the footer stays put
  // and the loading skeleton can reserve the same box.
  tableBody: { minHeight: INVENTORY_TABLE_BODY_HEIGHT },
  tableContent: { flexGrow: 1 },
  tableHeader: { backgroundColor: colors.neutral[50] },
  tableRow: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: INVENTORY_ROW_HEIGHT,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  tableScroll: { flexGrow: 0 },
});
