import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { can } from "@/features/merchant-dashboard/dashboard-access";
import { DashboardDialog } from "@/features/merchant-dashboard/dashboard-dialog";
import {
  formatCount,
  formatOrderDate,
} from "@/features/merchant-dashboard/dashboard-format";
import { useResponsiveGrid } from "@/features/merchant-dashboard/dashboard-grid";
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
  TablePagination,
} from "@/features/merchant-dashboard/dashboard-table";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import {
  REVIEW_STATUSES,
  type Review,
  type ReviewStatus,
} from "@/features/merchant-dashboard/promotions-reviews-demo-data";
import {
  ALL_RATINGS,
  ALL_REPLIES,
  ALL_STATUSES,
  availableReviewActions,
  isIsoDate,
  paginate,
  type ReplyFilter,
  type ReviewAction,
  type ReviewFilters,
  reviewSummary,
  validateReply,
  WORKSPACE_PAGE_SIZE,
} from "@/features/merchant-dashboard/use-promotions-reviews";

/**
 * The Reviews workspace and its reply dialog.
 *
 * A review is prose, not a row of figures, so this uses the dashboard's list
 * layout rather than a column table: the same card surfaces, chips, menus and
 * pagination, arranged so the comment and any merchant response stay readable at
 * every width. That is also why it needs no horizontal scroll.
 */

const TILE_MIN_WIDTH = 150;
const RATINGS = [5, 4, 3, 2, 1];

const statusTones: Record<
  ReviewStatus,
  ComponentProps<typeof StatusChip>["tone"]
> = {
  Flagged: "danger",
  Hidden: "neutral",
  Published: "green",
  Resolved: "blue",
};

const actionLabels: Record<ReviewAction, string> = {
  flag: "Flag for moderation",
  reply: "Reply",
  resolve: "Mark as resolved",
  view: "View review",
};

const actionIcons: Record<
  ReviewAction,
  ComponentProps<typeof DashboardIcon>["name"]
> = {
  flag: "flag-outline",
  reply: "reply-outline",
  resolve: "check-circle-outline",
  view: "eye-outline",
};

/** Filled and empty stars, so rating is never signalled by colour alone. */
export function Stars({ rating }: { rating: number }) {
  return (
    <View
      accessibilityLabel={`${rating} out of 5 stars`}
      accessibilityRole="image"
      style={styles.stars}
    >
      {[1, 2, 3, 4, 5].map((position) => (
        <DashboardIcon
          color={
            position <= rating ? colors.feedback.rating : colors.neutral[300]
          }
          key={position}
          name={position <= rating ? "star" : "star-outline"}
          size={14}
        />
      ))}
    </View>
  );
}

export function reviewMenuItems({
  onAction,
  onReply,
  onView,
  review,
  session,
}: {
  onAction?: (review: Review, action: ReviewAction) => void;
  onReply?: (review: Review) => void;
  onView?: (review: Review) => void;
  review: Review;
  session?: MerchantSession;
}): DashboardMenuItem[] {
  const moderates = session ? can(session, "reviews.moderate") : true;

  return availableReviewActions(review).map((action) => ({
    disabled: action !== "view" && !moderates,
    icon: actionIcons[action],
    key: action,
    label:
      action === "reply" && review.reply !== null
        ? "Edit reply"
        : actionLabels[action],
    onPress:
      action === "view"
        ? () => onView?.(review)
        : !moderates
          ? undefined
          : action === "reply"
            ? () => onReply?.(review)
            : () => onAction?.(review, action),
  }));
}

function SummaryTiles({
  tiles,
}: {
  tiles: { key: string; label: string; tone: string; value: string }[];
}) {
  const grid = useResponsiveGrid({
    count: tiles.length,
    gap: spacing.sm,
    minItemWidth: TILE_MIN_WIDTH,
  });

  return (
    <View
      onLayout={grid.onLayout}
      style={styles.tileGrid}
      testID="review-tiles"
    >
      {tiles.map((tile) => (
        <View key={tile.key} style={[styles.tile, grid.itemStyle]}>
          <View style={styles.tileHeader}>
            <View style={[styles.tileDot, { backgroundColor: tile.tone }]} />
            <StylishText
              numberOfLines={1}
              style={styles.tileLabel}
              unstyled
              variant="caption"
            >
              {tile.label}
            </StylishText>
          </View>
          <StylishText style={styles.tileValue} unstyled variant="price">
            {tile.value}
          </StylishText>
        </View>
      ))}
    </View>
  );
}

export function ReviewsContent({
  compact,
  filters,
  onAction,
  onFiltersChange,
  onReply,
  onView,
  reviews,
  session,
}: {
  compact: boolean;
  filters: ReviewFilters;
  onAction?: (review: Review, action: ReviewAction) => void;
  onFiltersChange: (filters: ReviewFilters) => void;
  onReply?: (review: Review) => void;
  onView?: (review: Review) => void;
  reviews: readonly Review[];
  session?: MerchantSession;
}) {
  const [page, setPage] = useState(1);

  const summary = useMemo(() => reviewSummary(reviews), [reviews]);
  const { pageCount, rows, safePage } = paginate(
    reviews,
    page,
    WORKSPACE_PAGE_SIZE,
  );
  const moderates = Boolean(session && can(session, "reviews.moderate"));

  const setFilter = (next: Partial<ReviewFilters>) => {
    setPage(1);
    onFiltersChange({ ...filters, ...next });
  };

  return (
    <>
      <DashboardCard testID="reviews-summary">
        <SectionHeading
          description="How shoppers are rating this workspace."
          title="Review summary"
        />
        <View style={styles.tileWrap}>
          <SummaryTiles
            tiles={[
              {
                key: "average",
                label: "Average rating",
                tone: colors.feedback.rating,
                // One decimal, and 0.0 rather than NaN on an empty list.
                value: summary.averageRating.toFixed(1),
              },
              {
                key: "total",
                label: "Total reviews",
                tone: colors.feedback.info,
                value: formatCount(summary.total),
              },
              {
                key: "awaiting",
                label: "Awaiting reply",
                tone: colors.brand.primary,
                value: formatCount(summary.awaitingReply),
              },
              {
                key: "flagged",
                label: "Flagged",
                tone: colors.feedback.danger,
                value: formatCount(summary.flagged),
              },
            ]}
          />
        </View>
      </DashboardCard>

      <DashboardCard testID="reviews-list-card">
        <SectionHeading
          description={`${reviews.length} reviews match your filters`}
          title="Reviews"
        />
        <View style={styles.notice}>
          <DashboardIcon
            color={colors.feedback.info}
            name="flask-outline"
            size={14}
          />
          <StylishText style={styles.noticeText} unstyled variant="caption">
            Replies and moderation update the demo data only — nothing is
            published or reported yet.
          </StylishText>
        </View>

        <View style={styles.controls}>
          <SearchField
            accessibilityLabel="Search reviews"
            label="Search reviews"
            onChangeText={(query) => setFilter({ query })}
            placeholder="Customer, product, SKU or text"
            testID="reviews-search"
            value={filters.query}
          />
          <FilterSelect
            label="Rating"
            onChange={(next) =>
              setFilter({
                rating: RATINGS.find((rating) => `${rating} stars` === next),
              })
            }
            options={[ALL_RATINGS, ...RATINGS.map((r) => `${r} stars`)]}
            testID="reviews-rating-filter"
            value={filters.rating ? `${filters.rating} stars` : ALL_RATINGS}
          />
          <FilterSelect
            label="Reply status"
            onChange={(next) =>
              setFilter({
                reply:
                  next === "Awaiting reply"
                    ? ("unreplied" as ReplyFilter)
                    : next === "Replied"
                      ? ("replied" as ReplyFilter)
                      : undefined,
              })
            }
            options={[ALL_REPLIES, "Awaiting reply", "Replied"]}
            testID="reviews-reply-filter"
            value={
              filters.reply === "unreplied"
                ? "Awaiting reply"
                : filters.reply === "replied"
                  ? "Replied"
                  : ALL_REPLIES
            }
          />
          <FilterSelect
            label="Review status"
            onChange={(next) =>
              setFilter({
                status: REVIEW_STATUSES.find((status) => status === next),
              })
            }
            options={[ALL_STATUSES, ...REVIEW_STATUSES]}
            testID="reviews-status-filter"
            value={filters.status ?? ALL_STATUSES}
          />
          <SearchField
            accessibilityLabel="Reviews from date"
            label="From (YYYY-MM-DD)"
            onChangeText={(value) =>
              setFilter({ from: isIsoDate(value) ? value : undefined })
            }
            placeholder="2026-08-01"
            testID="reviews-from"
            value={filters.from ?? ""}
          />
          <SearchField
            accessibilityLabel="Reviews to date"
            label="To (YYYY-MM-DD)"
            onChangeText={(value) =>
              setFilter({ to: isIsoDate(value) ? value : undefined })
            }
            placeholder="2026-08-31"
            testID="reviews-to"
            value={filters.to ?? ""}
          />
        </View>

        <View
          style={[styles.list, compact && styles.listCompact]}
          testID="reviews-body"
        >
          {rows.map((review) => (
            <View
              key={review.id}
              style={styles.review}
              testID={`review-row-${review.id}`}
            >
              <View style={styles.reviewHeading}>
                <View style={styles.reviewCopy}>
                  <View style={styles.reviewTitleRow}>
                    <Stars rating={review.rating} />
                    <StylishText
                      numberOfLines={1}
                      style={styles.reviewTitle}
                      unstyled
                      variant="caption"
                    >
                      {review.title}
                    </StylishText>
                  </View>
                  <StylishText
                    numberOfLines={1}
                    style={styles.reviewMeta}
                    unstyled
                    variant="caption"
                  >
                    {review.customer} · {review.productName} ·{" "}
                    {formatOrderDate(review.createdAt)}
                  </StylishText>
                </View>
                <RowActionsButton
                  accessibilityLabel={`Actions for the review by ${review.customer}`}
                  items={reviewMenuItems({
                    onAction,
                    onReply,
                    onView,
                    review,
                    session,
                  })}
                  menuLabel={`Review by ${review.customer} actions`}
                  testID={`review-actions-${review.id}`}
                />
              </View>

              <StylishText
                numberOfLines={compact ? 4 : 3}
                style={styles.reviewComment}
                unstyled
                variant="caption"
              >
                {review.comment}
              </StylishText>

              {review.reply ? (
                <View style={styles.reply}>
                  <View style={styles.replyHeader}>
                    <DashboardIcon
                      color={colors.feedback.info}
                      name="reply-outline"
                      size={14}
                    />
                    <StylishText
                      style={styles.replyLabel}
                      unstyled
                      variant="caption"
                    >
                      Your reply · {formatOrderDate(review.reply.repliedAt)}
                    </StylishText>
                  </View>
                  <StylishText
                    numberOfLines={3}
                    style={styles.replyText}
                    unstyled
                    variant="caption"
                  >
                    {review.reply.text}
                  </StylishText>
                </View>
              ) : null}

              <View style={styles.reviewFooter}>
                <View style={styles.reviewChips}>
                  <StatusChip
                    label={review.status}
                    tone={statusTones[review.status]}
                  />
                  <StatusChip
                    label={review.reply ? "Replied" : "Awaiting reply"}
                    tone={review.reply ? "green" : "warning"}
                  />
                </View>
                <DashboardButton
                  disabled={!moderates}
                  label={review.reply ? "Edit Reply" : "Reply"}
                  onPress={() => onReply?.(review)}
                  testID={`review-reply-${review.id}`}
                  title="Your role cannot moderate reviews."
                />
              </View>
            </View>
          ))}

          {rows.length === 0 ? (
            <View style={styles.emptyRow}>
              <StylishText style={styles.emptyText} unstyled variant="caption">
                No reviews match your filters.
              </StylishText>
            </View>
          ) : null}
        </View>

        <TablePagination
          onChange={setPage}
          page={safePage}
          pageCount={pageCount}
          testIDPrefix="reviews"
        />
      </DashboardCard>
    </>
  );
}

/** Reply dialog, on the shared dashboard dialog rather than a new primitive. */
export function ReviewReplyModal({
  onClose,
  onSubmit,
  review,
  visible,
}: {
  onClose: () => void;
  onSubmit: (review: Review, text: string) => void;
  review: Review | null;
  visible: boolean;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!visible) return;
    setText(review?.reply?.text ?? "");
    setError(undefined);
  }, [review, visible]);

  const submit = () => {
    if (!review) return;
    const found = validateReply(text);
    if (found) {
      setError(found);
      return;
    }
    onSubmit(review, text);
    onClose();
  };

  return (
    <DashboardDialog
      description={
        review
          ? `${review.customer} · ${review.productName} · ${review.productSku}`
          : ""
      }
      footer={
        <>
          <DashboardButton
            label="Cancel"
            onPress={onClose}
            testID="review-reply-cancel"
            tone="quiet"
          />
          <DashboardButton
            label={review?.reply ? "Update Reply" : "Submit Reply"}
            onPress={submit}
            testID="review-reply-submit"
            tone="primary"
          />
        </>
      }
      onClose={onClose}
      testID="review-reply-modal"
      title={review?.reply ? "Edit your reply" : "Reply to review"}
      visible={visible}
      width={560}
    >
      {review ? (
        <>
          <View style={styles.context}>
            <View style={styles.reviewTitleRow}>
              <Stars rating={review.rating} />
              <StylishText
                numberOfLines={2}
                style={styles.reviewTitle}
                unstyled
                variant="caption"
              >
                {review.title}
              </StylishText>
            </View>
            <StylishText
              style={styles.reviewComment}
              unstyled
              variant="caption"
            >
              {review.comment}
            </StylishText>
            <StylishText style={styles.reviewMeta} unstyled variant="caption">
              Left on {formatOrderDate(review.createdAt)}
            </StylishText>
          </View>

          <View style={styles.field}>
            <StylishText style={styles.fieldLabel} unstyled variant="caption">
              Your reply *
            </StylishText>
            <StylishTextInput
              accessibilityLabel="Your reply"
              maxLength={1_000}
              multiline
              numberOfLines={5}
              onChangeText={(value) => {
                setText(value);
                setError(undefined);
              }}
              placeholder="Thank the customer, answer their question, or explain what you have changed."
              placeholderTextColor={colors.neutral[450]}
              style={[styles.input, styles.textarea]}
              testID="review-reply-text"
              value={text}
            />
            {error ? (
              <StylishText style={styles.fieldError} unstyled variant="caption">
                {error}
              </StylishText>
            ) : (
              <StylishText style={styles.fieldHint} unstyled variant="caption">
                {text.trim().length}/1000 · shown publicly beneath the review.
              </StylishText>
            )}
          </View>
        </>
      ) : (
        <View />
      )}
    </DashboardDialog>
  );
}

const styles = StyleSheet.create({
  context: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  emptyRow: { paddingVertical: spacing.xl },
  emptyText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  field: { gap: spacing.xxs },
  fieldError: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  fieldHint: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  fieldLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    color: colors.ink.primary,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  list: { paddingHorizontal: spacing.lg },
  listCompact: { paddingHorizontal: spacing.md },
  notice: {
    alignItems: "center",
    backgroundColor: colors.feedback.infoSoft,
    borderColor: colors.brand.blueSoft,
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  noticeText: {
    color: colors.feedback.info,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  reply: {
    backgroundColor: colors.feedback.infoSoft,
    borderColor: colors.brand.blueSoft,
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    gap: 2,
    padding: spacing.sm,
  },
  replyHeader: { alignItems: "center", flexDirection: "row", gap: spacing.xxs },
  replyLabel: {
    color: colors.feedback.info,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 10,
    lineHeight: 15,
  },
  replyText: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 17,
  },
  review: {
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  reviewChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  reviewComment: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  // `flexBasis: 0` so the copy claims only leftover space rather than sizing to
  // its own text and pushing the actions off the row.
  reviewCopy: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    gap: 2,
    minWidth: 0,
  },
  reviewFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  reviewHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  reviewMeta: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 15,
  },
  reviewTitle: {
    color: colors.ink.primary,
    flexShrink: 1,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  reviewTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  stars: { flexDirection: "row", flexShrink: 0, gap: 1 },
  textarea: { minHeight: 108, textAlignVertical: "top" },
  tile: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    gap: spacing.xxs,
    padding: spacing.sm,
  },
  tileDot: {
    borderRadius: borderRadius.pill,
    flexShrink: 0,
    height: 8,
    width: 8,
  },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tileHeader: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  tileLabel: {
    color: colors.neutral[550],
    flexShrink: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  tileValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  tileWrap: { padding: spacing.lg },
});
