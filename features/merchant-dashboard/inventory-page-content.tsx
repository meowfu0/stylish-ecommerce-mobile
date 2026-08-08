import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { AdjustStockModal } from "@/features/merchant-dashboard/adjust-stock-modal";
import {
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
  DashboardDataState,
  DashboardState,
  MerchantSession,
  Permission,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  type InventoryPageKey,
  inventorySectionLabels,
} from "@/features/merchant-dashboard/inventory-data-source";
import {
  INVENTORY_CARD_HEIGHT,
  INVENTORY_PAGE_SIZE,
  INVENTORY_ROW_HEIGHT,
  LocationsSection,
  LowStockSection,
  MovementsSection,
  StockLevelsSection,
} from "@/features/merchant-dashboard/inventory-sections";
import { useMerchantInventoryData } from "@/features/merchant-dashboard/use-merchant-inventory-data";
import { AuthRequestError } from "@/services/auth/auth-error";
import {
  type InventoryLevelQuery,
  type InventoryLevelView,
  type InventoryMovementQuery,
  setDefaultLocation,
} from "@/services/merchant/inventory-api";

/**
 * The Inventory group's four destinations, rendered inside the existing
 * dashboard shell.
 *
 * Loading, filters, paging and the adjustment flow all live here so there is
 * one owner: an adjustment refetches the exact query the merchant is looking at
 * rather than resetting them to an unfiltered first page.
 */

export function InventoryPageContent({
  compact,
  deniedSection,
  onContactSupport,
  onCreateLocation,
  onLowStockCount,
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
  /** Location create/edit needs its own dialog; not built in this pass. */
  onCreateLocation?: () => void;
  /** Reports the real low-stock count up so the sidebar badge is data-driven. */
  onLowStockCount?: (count: number) => void;
  onReturnToOverview?: () => void;
  onReviewMerchantProfile?: () => void;
  onSignInAgain?: () => void | Promise<void>;
  paired: boolean;
  requiredPermission?: Permission;
  resolveState: (dataState: DashboardDataState) => DashboardState;
  section: InventoryPageKey;
  session: MerchantSession;
}) {
  const merchantId = session.merchantId;
  const [levelCursors, setLevelCursors] = useState<(string | undefined)[]>([
    undefined,
  ]);
  const [levelPage, setLevelPage] = useState(1);
  const [levelFilters, setLevelFilters] = useState<InventoryLevelQuery>({});
  const [lowStockFilters, setLowStockFilters] = useState<InventoryLevelQuery>(
    {},
  );
  const [movementCursors, setMovementCursors] = useState<
    (string | undefined)[]
  >([undefined]);
  const [movementPage, setMovementPage] = useState(1);
  const [movementFilters, setMovementFilters] =
    useState<InventoryMovementQuery>({});
  const [adjusting, setAdjusting] = useState<InventoryLevelView | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const levelQuery = useMemo<InventoryLevelQuery>(
    () => ({
      ...levelFilters,
      cursor: levelCursors[levelPage - 1],
      limit: INVENTORY_PAGE_SIZE,
    }),
    [levelCursors, levelFilters, levelPage],
  );
  const movementQuery = useMemo<InventoryMovementQuery>(
    () => ({
      ...movementFilters,
      cursor: movementCursors[movementPage - 1],
      limit: INVENTORY_PAGE_SIZE,
    }),
    [movementCursors, movementFilters, movementPage],
  );

  const inventory = useMerchantInventoryData({
    enabled: Boolean(merchantId),
    levelQuery,
    lowStockQuery: lowStockFilters,
    merchantId,
    movementQuery,
  });

  // Hand the real figure up on every load, so the sidebar badge tracks the
  // database instead of the hardcoded 12 it used to show. This is a side
  // effect on the parent, so it belongs in an effect rather than in render.
  const reportedCount = inventory.lowStockCount;
  useEffect(() => {
    onLowStockCount?.(reportedCount);
  }, [onLowStockCount, reportedCount]);

  const effectiveState: DashboardState = inventory.permissionDenied
    ? "permission-denied"
    : resolveState(inventory.dataState);

  const changeLevelFilters = useCallback((next: InventoryLevelQuery) => {
    const { cursor: _cursor, limit: _limit, ...rest } = next;
    setLevelFilters(rest);
    setLevelCursors([undefined]);
    setLevelPage(1);
  }, []);

  const changeMovementFilters = useCallback((next: InventoryMovementQuery) => {
    const { cursor: _cursor, limit: _limit, ...rest } = next;
    setMovementFilters(rest);
    setMovementCursors([undefined]);
    setMovementPage(1);
  }, []);

  const advance = (
    cursor: string | null,
    setCursors: typeof setLevelCursors,
    setPage: typeof setLevelPage,
    page: number,
  ) => {
    if (!cursor) return;
    setCursors((current) => {
      const copy = [...current];
      copy[page] = cursor;
      return copy;
    });
    setPage((current) => current + 1);
  };

  const makeDefault = async (locationId: string) => {
    if (!merchantId) return;
    setActionError(null);
    try {
      await setDefaultLocation(merchantId, locationId);
      inventory.refresh();
    } catch (error) {
      setActionError(
        error instanceof AuthRequestError && error.kind === "permission-denied"
          ? "Your role cannot manage locations."
          : "That location could not be updated.",
      );
    }
  };

  if (!merchantId) {
    return (
      <View style={styles.column}>
        <DashboardSectionUnavailable
          body="This workspace has no merchant ID, so inventory cannot be loaded. Switch workspace and try again."
          section={section}
          sectionLabels={inventorySectionLabels}
          tall
        />
      </View>
    );
  }

  if (effectiveState === "loading") {
    return <InventoryLoadingState compact={compact} section={section} />;
  }

  const renderPage = ["ready", "partial", "refreshing"].includes(
    effectiveState,
  );
  const unavailable = inventory.failedSections.includes(section);
  const adjustingLocation = adjusting?.locationId
    ? inventory.locationNames.get(adjusting.locationId)
    : undefined;

  return (
    <View style={styles.column}>
      <DashboardStateBanner
        failedSections={inventory.failedSections}
        onRetry={inventory.retry}
        sectionLabels={inventorySectionLabels}
        state={effectiveState}
      />
      <DashboardBlockingState
        deniedSection={deniedSection}
        onContactSupport={onContactSupport}
        onRetry={inventory.retry}
        onReturnToOverview={onReturnToOverview}
        onReviewMerchantProfile={onReviewMerchantProfile}
        onSignInAgain={onSignInAgain}
        paired={paired}
        requiredPermission={requiredPermission}
        session={session}
        state={effectiveState}
      />

      {actionError ? (
        <View style={styles.actionError} testID="inventory-action-error">
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
            body="The rest of your inventory is unaffected. Try loading this page again in a moment."
            onRetry={inventory.retry}
            section={section}
            sectionLabels={inventorySectionLabels}
            tall
          />
        ) : section === "stock-levels" ? (
          <StockLevelsSection
            compact={compact}
            hasNextPage={Boolean(inventory.levelsCursor)}
            hasPreviousPage={levelPage > 1}
            levels={inventory.levels}
            locationNames={inventory.locationNames}
            locations={inventory.locations}
            onAdjust={setAdjusting}
            onNextPage={() =>
              advance(
                inventory.levelsCursor,
                setLevelCursors,
                setLevelPage,
                levelPage,
              )
            }
            onPreviousPage={() =>
              setLevelPage((current) => Math.max(1, current - 1))
            }
            onQueryChange={changeLevelFilters}
            page={levelPage}
            query={levelQuery}
            session={session}
          />
        ) : section === "low-stock" ? (
          <LowStockSection
            capped={inventory.lowStockCapped}
            compact={compact}
            hasNextPage={Boolean(inventory.lowStockCursor)}
            hasPreviousPage={false}
            levels={inventory.lowStock}
            locationNames={inventory.locationNames}
            locations={inventory.locations}
            onAdjust={setAdjusting}
            onQueryChange={(next) => setLowStockFilters(next)}
            page={1}
            query={lowStockFilters}
            session={session}
          />
        ) : section === "locations" ? (
          <LocationsSection
            compact={compact}
            locations={inventory.locations}
            onCreate={onCreateLocation}
            onSetDefault={(location) => void makeDefault(location.id)}
            session={session}
          />
        ) : (
          <MovementsSection
            compact={compact}
            hasNextPage={Boolean(inventory.movementsCursor)}
            hasPreviousPage={movementPage > 1}
            locationNames={inventory.locationNames}
            locations={inventory.locations}
            movements={inventory.movements}
            onNextPage={() =>
              advance(
                inventory.movementsCursor,
                setMovementCursors,
                setMovementPage,
                movementPage,
              )
            }
            onPreviousPage={() =>
              setMovementPage((current) => Math.max(1, current - 1))
            }
            onQueryChange={changeMovementFilters}
            page={movementPage}
            query={movementQuery}
          />
        )
      ) : null}

      <AdjustStockModal
        level={adjusting}
        locationName={adjustingLocation}
        merchantId={merchantId}
        onAdjusted={() => {
          // Refetch the query on screen, so filters and page survive the write.
          inventory.refresh();
        }}
        onClose={() => setAdjusting(null)}
        visible={adjusting !== null}
      />
    </View>
  );
}

/**
 * Loading placeholder. Every block is built from the dimensions the real page
 * uses — the heading's padding and divider, the 44px filter controls, the
 * table's own row height and the pagination footer — so the layout does not
 * move when the rows arrive.
 */
export function InventoryLoadingState({
  compact,
  section,
}: {
  compact: boolean;
  section: InventoryPageKey;
}) {
  const rowHeight = INVENTORY_ROW_HEIGHT;
  const filterCount =
    section === "stock-levels" ? 3 : section === "movements" ? 4 : 1;

  return (
    <View
      accessibilityLabel={`Loading ${inventorySectionLabels[section]}.`}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      style={styles.column}
      testID={`inventory-state-loading-${section}`}
    >
      <DashboardCard>
        <View style={styles.skeletonHeading}>
          <View style={styles.skeletonHeadingCopy}>
            <DashboardSkeleton style={styles.skeletonTitle} />
            <DashboardSkeleton style={styles.skeletonDescription} />
          </View>
          {section === "locations" ? (
            <DashboardSkeleton style={styles.skeletonAction} />
          ) : null}
        </View>
        {section === "locations" ? null : (
          <View style={styles.skeletonControls}>
            {Array.from({ length: filterCount }, (_value, index) => (
              <View key={index} style={styles.skeletonField}>
                <DashboardSkeleton style={styles.skeletonFieldLabel} />
                <DashboardSkeleton style={styles.skeletonControl} />
              </View>
            ))}
          </View>
        )}
        <View style={compact ? styles.skeletonCards : styles.skeletonRows}>
          {/* The table's own header row; leaving it out is a constant
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
                style={[
                  styles.skeletonCardBlock,
                  { height: INVENTORY_CARD_HEIGHT },
                ]}
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
        {section === "locations" ? null : (
          <View style={styles.skeletonPagination}>
            <DashboardSkeleton style={styles.skeletonPageLabel} />
            <DashboardSkeleton style={styles.skeletonPageButtons} />
          </View>
        )}
      </DashboardCard>
    </View>
  );
}

/** One filled page, matching the height every table reserves. */
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
  skeletonField: {
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing.xxs,
    minWidth: 168,
  },
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
  skeletonTitle: { height: 24, maxWidth: 180, width: "45%" },
});
