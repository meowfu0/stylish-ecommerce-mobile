import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  DashboardCard,
  DashboardSkeleton,
} from "@/features/merchant-dashboard/dashboard-primitives";
import {
  DashboardBlockingState,
  DashboardStateBanner,
} from "@/features/merchant-dashboard/dashboard-states";
import type {
  DashboardDataState,
  DashboardState,
  MerchantSession,
  Permission,
  PromotionsSectionKey,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  PromotionFormModal,
  PromotionsContent,
} from "@/features/merchant-dashboard/promotions-sections";
import type {
  Promotion,
  Review,
} from "@/features/merchant-dashboard/promotions-reviews-demo-data";
import {
  ReviewReplyModal,
  ReviewsContent,
} from "@/features/merchant-dashboard/reviews-sections";
import {
  emptyPromotionFilters,
  emptyReviewFilters,
  filterPromotions,
  filterReviews,
  type PromotionFilters,
  type ReviewFilters,
  usePromotionsReviews,
} from "@/features/merchant-dashboard/use-promotions-reviews";

/**
 * The Promotions and Reviews workspaces, rendered inside the existing dashboard
 * shell.
 *
 * Loading, filters and the demo mutations all live here so there is one owner:
 * replying to a review or pausing a promotion updates the same rows the page is
 * showing, and the sidebar's Reviews badge moves with it.
 */

export const promotionsSectionLabels: Record<PromotionsSectionKey, string> = {
  promotions: "Promotions",
  reviews: "Reviews",
};

export function PromotionsPageContent({
  compact,
  deniedSection,
  onContactSupport,
  onReturnToOverview,
  onReviewCountChange,
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
  onReturnToOverview?: () => void;
  /** Reports the fixture-derived unanswered count for the sidebar badge. */
  onReviewCountChange?: (count: number) => void;
  onReviewMerchantProfile?: () => void;
  onSignInAgain?: () => void | Promise<void>;
  paired: boolean;
  requiredPermission?: Permission;
  resolveState: (dataState: DashboardDataState) => DashboardState;
  section: PromotionsSectionKey;
  session: MerchantSession;
}) {
  const [promotionFilters, setPromotionFilters] = useState<PromotionFilters>(
    emptyPromotionFilters,
  );
  const [reviewFilters, setReviewFilters] =
    useState<ReviewFilters>(emptyReviewFilters);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [replying, setReplying] = useState<Review | null>(null);

  const workspace = usePromotionsReviews({ enabled: true });
  const state = resolveState(workspace.dataState);

  const unanswered = useMemo(
    () =>
      workspace.reviews.filter(
        (review) =>
          review.reply === null &&
          (review.status === "Published" || review.status === "Flagged"),
      ).length,
    [workspace.reviews],
  );

  useEffect(() => {
    onReviewCountChange?.(unanswered);
  }, [onReviewCountChange, unanswered]);

  const visiblePromotions = useMemo(
    () => filterPromotions(workspace.promotions, promotionFilters),
    [promotionFilters, workspace.promotions],
  );
  const visibleReviews = useMemo(
    () => filterReviews(workspace.reviews, reviewFilters),
    [reviewFilters, workspace.reviews],
  );

  if (state === "loading") {
    return <PromotionsLoadingState compact={compact} section={section} />;
  }

  const renderPage = ["ready", "partial", "refreshing"].includes(state);

  return (
    <View style={styles.column}>
      <DashboardStateBanner
        failedSections={[]}
        onRetry={workspace.retry}
        state={state}
      />
      <DashboardBlockingState
        deniedSection={deniedSection}
        onContactSupport={onContactSupport}
        onRetry={workspace.retry}
        onReturnToOverview={onReturnToOverview}
        onReviewMerchantProfile={onReviewMerchantProfile}
        onSignInAgain={onSignInAgain}
        paired={paired}
        requiredPermission={requiredPermission}
        session={session}
        state={state}
      />

      {renderPage ? (
        section === "promotions" ? (
          <PromotionsContent
            compact={compact}
            filters={promotionFilters}
            onAction={(promotion, action) =>
              workspace.promotionAction(promotion.id, action)
            }
            onCreate={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            onEdit={(promotion) => {
              setEditing(promotion);
              setFormOpen(true);
            }}
            onFiltersChange={setPromotionFilters}
            onView={(promotion) => {
              setEditing(promotion);
              setFormOpen(true);
            }}
            promotions={visiblePromotions}
            session={session}
          />
        ) : (
          <ReviewsContent
            compact={compact}
            filters={reviewFilters}
            onAction={(review, action) =>
              workspace.reviewAction(review.id, action)
            }
            onFiltersChange={setReviewFilters}
            onReply={setReplying}
            onView={setReplying}
            reviews={visibleReviews}
            session={session}
          />
        )
      ) : null}

      <PromotionFormModal
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={workspace.applyPromotion}
        promotion={editing}
        visible={formOpen}
      />

      <ReviewReplyModal
        onClose={() => setReplying(null)}
        onSubmit={(review, text) => workspace.replyToReview(review.id, text)}
        review={replying}
        visible={replying !== null}
      />
    </View>
  );
}

/**
 * Loading placeholder. Built from the dimensions the real pages use — the
 * heading's padding and divider, the tile grid, the demo notice, the 44px filter
 * controls and the pagination footer — so the layout does not move when the rows
 * arrive.
 */
export function PromotionsLoadingState({
  compact,
  section,
}: {
  compact: boolean;
  section: PromotionsSectionKey;
}) {
  const promotions = section === "promotions";
  const filters = promotions ? 5 : 6;
  // A review is prose, so its rows stand taller than a promotion's table row.
  const rowHeight = promotions ? 48 : 132;

  return (
    <View
      accessibilityLabel={`Loading ${promotionsSectionLabels[section]}.`}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      style={styles.column}
      testID={`promotions-state-loading-${section}`}
    >
      <DashboardCard>
        <SkeletonHeading />
        <View style={styles.skeletonTileGrid}>
          {Array.from({ length: 4 }, (_value, index) => (
            <View key={index} style={styles.skeletonTile}>
              <DashboardSkeleton style={styles.skeletonTileLabel} />
              <DashboardSkeleton style={styles.skeletonTileValue} />
            </View>
          ))}
        </View>
      </DashboardCard>

      <DashboardCard>
        <SkeletonHeading action={promotions} />
        <View style={styles.skeletonNotice} />
        <View style={styles.skeletonControls}>
          {Array.from({ length: filters }, (_value, index) => (
            <View key={index} style={styles.skeletonField}>
              <DashboardSkeleton style={styles.skeletonFieldLabel} />
              <DashboardSkeleton style={styles.skeletonControl} />
            </View>
          ))}
        </View>
        <View style={compact ? styles.skeletonCards : styles.skeletonRows}>
          {/* Promotions draw a table header above their rows; the review list
              has none, so the placeholder must not reserve one. */}
          {!compact && promotions ? (
            <View style={[styles.skeletonRow, styles.skeletonHeaderRow]} />
          ) : null}
          {Array.from({ length: 8 }, (_value, index) =>
            compact ? (
              <DashboardSkeleton key={index} style={styles.skeletonCardBlock} />
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

function SkeletonHeading({ action = false }: { action?: boolean }) {
  return (
    <View style={styles.skeletonHeading}>
      <View style={styles.skeletonHeadingCopy}>
        <DashboardSkeleton style={styles.skeletonTitle} />
        <DashboardSkeleton style={styles.skeletonDescription} />
      </View>
      {action ? <DashboardSkeleton style={styles.skeletonAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: 20, minWidth: 0, width: "100%" },
  skeletonAction: { borderRadius: borderRadius.input, height: 44, width: 168 },
  skeletonCardBlock: { borderRadius: borderRadius.md, height: 148 },
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
  skeletonHeaderRow: { backgroundColor: colors.neutral[50], height: 48 },
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
  // Mirrors the demo notice the real pages render above their filters.
  skeletonNotice: {
    backgroundColor: colors.neutral[150],
    borderRadius: borderRadius.input,
    height: 42,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
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
  skeletonTile: {
    borderColor: "transparent",
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexBasis: 150,
    flexGrow: 1,
    gap: spacing.xxs,
    minWidth: 150,
    padding: spacing.sm,
  },
  skeletonTileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  skeletonTileLabel: { height: 16, width: "70%" },
  skeletonTileValue: { height: 24, width: "45%" },
  skeletonTitle: { height: 24, maxWidth: 180, width: "45%" },
});
