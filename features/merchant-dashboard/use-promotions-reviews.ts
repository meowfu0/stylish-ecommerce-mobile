import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resolveDashboardDataState } from "@/features/merchant-dashboard/dashboard-state-model";
import type { DashboardDataState } from "@/features/merchant-dashboard/dashboard-types";
import {
  loadPromotionsWorkspace,
  loadReviewsWorkspace,
  type Promotion,
  type PromotionStatus,
  type PromotionType,
  type Review,
  type ReviewStatus,
} from "@/features/merchant-dashboard/promotions-reviews-demo-data";

/**
 * Filtering, paging and the demo mutations for the Promotions and Reviews
 * workspaces.
 *
 * Every filter runs client-side against the loaded snapshot, which is what a
 * fixture allows. When the real endpoints arrive, the pure functions below
 * become their query parameters and this hook keeps its shape — nothing above it
 * changes.
 */

export const ALL_STATUSES = "All statuses";
export const ALL_TYPES = "All types";
export const ALL_RATINGS = "All ratings";
export const ALL_REPLIES = "All replies";

export const WORKSPACE_PAGE_SIZE = 8;

/** Only a complete date filters; a half-typed one must not hide every row. */
export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

export function paginate<Row>(
  rows: readonly Row[],
  page: number,
  pageSize: number,
) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  return {
    pageCount,
    rows: rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    safePage,
  };
}

/* ------------------------------------------------------------------ */
/* Promotions                                                          */
/* ------------------------------------------------------------------ */

export type PromotionFilters = {
  from?: string;
  query: string;
  status?: PromotionStatus;
  to?: string;
  type?: PromotionType;
};

export const emptyPromotionFilters: PromotionFilters = { query: "" };

export function filterPromotions(
  promotions: readonly Promotion[],
  filters: PromotionFilters,
) {
  const needle = filters.query.trim().toLowerCase();

  return promotions.filter((promotion) => {
    if (filters.status && promotion.status !== filters.status) return false;
    if (filters.type && promotion.type !== filters.type) return false;
    // A promotion overlaps the range when it has not ended before it starts
    // and has not started after it ends.
    if (filters.from && promotion.endsAt < filters.from) return false;
    if (filters.to && promotion.startsAt > filters.to) return false;
    if (!needle) return true;
    return (
      promotion.name.toLowerCase().includes(needle) ||
      (promotion.scopeTarget?.toLowerCase().includes(needle) ?? false)
    );
  });
}

export function promotionStatusCounts(promotions: readonly Promotion[]) {
  return {
    active: promotions.filter((p) => p.status === "Active").length,
    draft: promotions.filter((p) => p.status === "Draft").length,
    expired: promotions.filter((p) => p.status === "Expired").length,
    scheduled: promotions.filter((p) => p.status === "Scheduled").length,
  };
}

export type PromotionAction = "activate" | "archive" | "duplicate" | "pause";

/**
 * Which demo actions a promotion's current status allows. Archived is terminal,
 * mirroring how the catalog treats an archived product.
 */
export function availablePromotionActions(
  promotion: Promotion,
): PromotionAction[] {
  if (promotion.status === "Archived") return ["duplicate"];

  const actions: PromotionAction[] = ["duplicate"];
  if (promotion.status === "Paused" || promotion.status === "Draft") {
    actions.push("activate");
  }
  if (promotion.status === "Active") actions.push("pause");
  actions.push("archive");
  return actions;
}

export function applyPromotionAction(
  promotion: Promotion,
  action: PromotionAction,
): Promotion {
  switch (action) {
    case "activate":
      return { ...promotion, status: "Active" };
    case "pause":
      return { ...promotion, status: "Paused" };
    case "archive":
      return { ...promotion, status: "Archived" };
    default:
      return promotion;
  }
}

/** A duplicate always starts as a draft with its usage reset. */
export function duplicatePromotion(promotion: Promotion): Promotion {
  return {
    ...promotion,
    id: `${promotion.id}-copy-${Math.random().toString(36).slice(2, 8)}`,
    name: `${promotion.name} (copy)`,
    status: "Draft",
    usageCount: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export type ReplyFilter = "replied" | "unreplied";

export type ReviewFilters = {
  from?: string;
  query: string;
  rating?: number;
  reply?: ReplyFilter;
  status?: ReviewStatus;
  to?: string;
};

export const emptyReviewFilters: ReviewFilters = { query: "" };

export function filterReviews(
  reviews: readonly Review[],
  filters: ReviewFilters,
) {
  const needle = filters.query.trim().toLowerCase();

  return reviews.filter((review) => {
    if (filters.rating && review.rating !== filters.rating) return false;
    if (filters.status && review.status !== filters.status) return false;
    if (filters.reply === "replied" && review.reply === null) return false;
    if (filters.reply === "unreplied" && review.reply !== null) return false;
    if (filters.from && review.createdAt < filters.from) return false;
    if (filters.to && review.createdAt > filters.to) return false;
    if (!needle) return true;
    return (
      review.customer.toLowerCase().includes(needle) ||
      review.productName.toLowerCase().includes(needle) ||
      review.productSku.toLowerCase().includes(needle) ||
      review.title.toLowerCase().includes(needle) ||
      review.comment.toLowerCase().includes(needle)
    );
  });
}

export function reviewSummary(reviews: readonly Review[]) {
  const rated = reviews.filter((review) => review.status !== "Hidden");
  const total = rated.reduce((running, review) => running + review.rating, 0);

  return {
    // Guarded so an empty list reads as 0.0 rather than NaN.
    averageRating: rated.length > 0 ? total / rated.length : 0,
    awaitingReply: reviews.filter(
      (review) =>
        review.reply === null &&
        (review.status === "Published" || review.status === "Flagged"),
    ).length,
    flagged: reviews.filter((review) => review.status === "Flagged").length,
    total: reviews.length,
  };
}

export type ReviewAction = "flag" | "reply" | "resolve" | "view";

export function availableReviewActions(review: Review): ReviewAction[] {
  const actions: ReviewAction[] = ["view", "reply"];
  if (review.status !== "Resolved") actions.push("resolve");
  if (review.status !== "Flagged") actions.push("flag");
  return actions;
}

export function applyReviewReply(review: Review, text: string): Review {
  const trimmed = text.trim();
  if (trimmed.length === 0) return review;
  return {
    ...review,
    reply: {
      // Fixed rather than `new Date()` so a demo reply is deterministic in
      // tests; a real API would stamp this server-side anyway.
      repliedAt: review.createdAt,
      text: trimmed,
    },
  };
}

export function validateReply(text: string) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "Write a reply before submitting";
  if (trimmed.length > 1_000) return "Use at most 1,000 characters";
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export type PromotionsReviewsWorkspace = {
  applyPromotion: (promotion: Promotion) => void;
  dataState: DashboardDataState;
  promotionAction: (id: string, action: PromotionAction) => void;
  promotions: Promotion[];
  refresh: () => void;
  replyToReview: (id: string, text: string) => void;
  retry: () => void;
  reviewAction: (id: string, action: ReviewAction) => void;
  reviews: Review[];
};

export function usePromotionsReviews({
  enabled,
  loadPromotions = loadPromotionsWorkspace,
  loadReviews = loadReviewsWorkspace,
}: {
  enabled: boolean;
  loadPromotions?: () => Promise<{ promotions: Promotion[] }>;
  loadReviews?: () => Promise<{ reviews: Review[] }>;
}): PromotionsReviewsWorkspace {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const promotionsRef = useRef(loadPromotions);
  const reviewsRef = useRef(loadReviews);
  promotionsRef.current = loadPromotions;
  reviewsRef.current = loadReviews;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([promotionsRef.current(), reviewsRef.current()])
      .then(([promotionResult, reviewResult]) => {
        if (cancelled) return;
        setFailed(false);
        setPromotions(promotionResult.promotions);
        setReviews(reviewResult.reviews);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, enabled]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  /** Creates or replaces one promotion, so the form serves Create and Edit. */
  const applyPromotion = useCallback((promotion: Promotion) => {
    setPromotions((current) => {
      if (!current) return current;
      const existing = current.findIndex((row) => row.id === promotion.id);
      if (existing < 0) return [promotion, ...current];
      const next = [...current];
      next[existing] = promotion;
      return next;
    });
  }, []);

  const promotionAction = useCallback((id: string, action: PromotionAction) => {
    setPromotions((current) => {
      if (!current) return current;
      const target = current.find((row) => row.id === id);
      if (!target) return current;
      if (action === "duplicate")
        return [duplicatePromotion(target), ...current];
      return current.map((row) =>
        row.id === id ? applyPromotionAction(row, action) : row,
      );
    });
  }, []);

  const replyToReview = useCallback((id: string, text: string) => {
    setReviews((current) =>
      current
        ? current.map((review) =>
            review.id === id ? applyReviewReply(review, text) : review,
          )
        : current,
    );
  }, []);

  const reviewAction = useCallback((id: string, action: ReviewAction) => {
    if (action !== "resolve" && action !== "flag") return;
    setReviews((current) =>
      current
        ? current.map((review) =>
            review.id === id
              ? {
                  ...review,
                  status: action === "flag" ? "Flagged" : "Resolved",
                }
              : review,
          )
        : current,
    );
  }, []);

  return useMemo(
    () => ({
      applyPromotion,
      dataState: resolveDashboardDataState({
        failedSectionCount: failed ? 1 : 0,
        hasCatalog: (promotions?.length ?? 0) + (reviews?.length ?? 0) > 0,
        hasSnapshot: promotions !== null,
        loading,
        sectionCount: 1,
      }),
      promotionAction,
      promotions: promotions ?? [],
      refresh: reload,
      replyToReview,
      retry: reload,
      reviewAction,
      reviews: reviews ?? [],
    }),
    [
      applyPromotion,
      failed,
      loading,
      promotionAction,
      promotions,
      reload,
      replyToReview,
      reviewAction,
      reviews,
    ],
  );
}
