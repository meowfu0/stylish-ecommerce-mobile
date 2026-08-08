/**
 * Demo data for the Promotions and Reviews workspaces.
 *
 * This is the only place either page gets its rows from, and it exists purely so
 * the screens can be visualised before those APIs land. `loadPromotionsWorkspace`
 * and `loadReviewsWorkspace` have the signatures real loaders would, so swapping
 * them for `apiRequest` later is a one-file change and no component has to be
 * redesigned.
 *
 * Nothing here is imported by a production data path.
 */

export const PROMOTION_TYPES = [
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "FREE_SHIPPING",
] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

export const PROMOTION_STATUSES = [
  "Active",
  "Scheduled",
  "Draft",
  "Paused",
  "Expired",
  "Archived",
] as const;
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

export const PROMOTION_SCOPES = ["all", "category", "product"] as const;
export type PromotionScope = (typeof PROMOTION_SCOPES)[number];

export const promotionTypeLabels: Record<PromotionType, string> = {
  FIXED_AMOUNT: "Fixed amount",
  FREE_SHIPPING: "Free shipping",
  PERCENTAGE: "Percentage",
};

export type Promotion = {
  /** Percent for PERCENTAGE, centavos for FIXED_AMOUNT, unused for shipping. */
  discountValue: number;
  /** ISO date. */
  endsAt: string;
  id: string;
  minimumPurchaseCentavos: number;
  name: string;
  scope: PromotionScope;
  /** The category or product a scoped promotion applies to. */
  scopeTarget: string | null;
  startsAt: string;
  status: PromotionStatus;
  type: PromotionType;
  usageCount: number;
  /** Null for an unlimited promotion. */
  usageLimit: number | null;
};

export const REVIEW_STATUSES = [
  "Published",
  "Flagged",
  "Resolved",
  "Hidden",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type ReviewReply = {
  /** ISO date. */
  repliedAt: string;
  text: string;
};

export type Review = {
  comment: string;
  /** ISO date. */
  createdAt: string;
  customer: string;
  id: string;
  productName: string;
  productSku: string;
  /** 1 to 5. */
  rating: number;
  reply: ReviewReply | null;
  status: ReviewStatus;
  title: string;
};

/* ------------------------------------------------------------------ */
/* Promotions                                                          */
/* ------------------------------------------------------------------ */

export const demoPromotions: Promotion[] = [
  {
    discountValue: 20,
    endsAt: "2026-08-31",
    id: "promo-01",
    minimumPurchaseCentavos: 150_000,
    name: "Amihan Season Launch",
    scope: "category",
    scopeTarget: "Dresses",
    startsAt: "2026-08-01",
    status: "Active",
    type: "PERCENTAGE",
    usageCount: 184,
    usageLimit: 500,
  },
  {
    discountValue: 50_000,
    endsAt: "2026-08-20",
    id: "promo-02",
    minimumPurchaseCentavos: 300_000,
    name: "₱500 Off Outerwear",
    scope: "category",
    scopeTarget: "Outerwear",
    startsAt: "2026-08-05",
    status: "Active",
    type: "FIXED_AMOUNT",
    usageCount: 62,
    usageLimit: 200,
  },
  {
    discountValue: 0,
    endsAt: "2026-08-15",
    id: "promo-03",
    minimumPurchaseCentavos: 200_000,
    name: "Free Shipping Over ₱2,000",
    scope: "all",
    scopeTarget: null,
    startsAt: "2026-07-25",
    status: "Active",
    type: "FREE_SHIPPING",
    usageCount: 471,
    usageLimit: null,
  },
  {
    discountValue: 15,
    endsAt: "2026-09-30",
    id: "promo-04",
    minimumPurchaseCentavos: 0,
    name: "Ber Months Preview",
    scope: "all",
    scopeTarget: null,
    startsAt: "2026-09-01",
    status: "Scheduled",
    type: "PERCENTAGE",
    usageCount: 0,
    usageLimit: 1_000,
  },
  {
    discountValue: 25,
    endsAt: "2026-12-26",
    id: "promo-05",
    minimumPurchaseCentavos: 250_000,
    name: "Holiday Capsule Early Access",
    scope: "category",
    scopeTarget: "Holiday Capsule",
    startsAt: "2026-12-01",
    status: "Scheduled",
    type: "PERCENTAGE",
    usageCount: 0,
    usageLimit: 800,
  },
  {
    discountValue: 30_000,
    endsAt: "2026-10-15",
    id: "promo-06",
    minimumPurchaseCentavos: 100_000,
    name: "Habi Weave Tote Bundle",
    scope: "product",
    scopeTarget: "Habi Weave Tote",
    startsAt: "2026-10-01",
    status: "Draft",
    type: "FIXED_AMOUNT",
    usageCount: 0,
    usageLimit: 150,
  },
  {
    discountValue: 10,
    endsAt: "2026-11-30",
    id: "promo-07",
    minimumPurchaseCentavos: 0,
    name: "Loyalty Members 10%",
    scope: "all",
    scopeTarget: null,
    startsAt: "2026-11-01",
    status: "Draft",
    type: "PERCENTAGE",
    usageCount: 0,
    usageLimit: null,
  },
  {
    discountValue: 35,
    endsAt: "2026-07-31",
    id: "promo-08",
    minimumPurchaseCentavos: 150_000,
    name: "Mid-Year Clearance",
    scope: "all",
    scopeTarget: null,
    startsAt: "2026-07-01",
    status: "Expired",
    type: "PERCENTAGE",
    usageCount: 1_204,
    usageLimit: 1_500,
  },
  {
    discountValue: 0,
    endsAt: "2026-06-30",
    id: "promo-09",
    minimumPurchaseCentavos: 120_000,
    name: "Free Shipping Weekend",
    scope: "all",
    scopeTarget: null,
    startsAt: "2026-06-27",
    status: "Expired",
    type: "FREE_SHIPPING",
    usageCount: 318,
    usageLimit: null,
  },
  {
    discountValue: 12,
    endsAt: "2026-08-25",
    id: "promo-10",
    minimumPurchaseCentavos: 80_000,
    name: "Sampaguita Silk Feature",
    scope: "product",
    scopeTarget: "Sampaguita Silk Blouse",
    startsAt: "2026-08-02",
    status: "Paused",
    type: "PERCENTAGE",
    usageCount: 27,
    usageLimit: 300,
  },
  {
    discountValue: 75_000,
    endsAt: "2026-05-31",
    id: "promo-11",
    minimumPurchaseCentavos: 400_000,
    name: "Anniversary ₱750 Off",
    scope: "all",
    scopeTarget: null,
    startsAt: "2026-05-01",
    status: "Archived",
    type: "FIXED_AMOUNT",
    usageCount: 89,
    usageLimit: 100,
  },
  {
    discountValue: 18,
    endsAt: "2026-09-14",
    id: "promo-12",
    minimumPurchaseCentavos: 180_000,
    name: "Bags & Accessories Refresh",
    scope: "category",
    scopeTarget: "Bags & Accessories",
    startsAt: "2026-09-05",
    status: "Scheduled",
    type: "PERCENTAGE",
    usageCount: 0,
    usageLimit: 400,
  },
];

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export const demoReviews: Review[] = [
  {
    comment:
      "The linen is beautifully soft and the wrap sits exactly where I hoped. I sized down and it still drapes well. Shipping took three days to Quezon City.",
    createdAt: "2026-08-07",
    customer: "Maria Santos",
    id: "review-01",
    productName: "Amihan Linen Wrap Dress",
    productSku: "LUM-DRS-016",
    rating: 5,
    reply: null,
    status: "Published",
    title: "Worth every peso",
  },
  {
    comment: "Colour is slightly darker than the photos but I still like it.",
    createdAt: "2026-08-07",
    customer: "Jonas Reyes",
    id: "review-02",
    productName: "Sampaguita Silk Blouse",
    productSku: "LUM-TOP-071",
    rating: 4,
    reply: null,
    status: "Published",
    title: "Good, minor colour difference",
  },
  {
    comment:
      "Arrived with a loose seam on the left strap. Support replaced it quickly, but the first one should not have shipped.",
    createdAt: "2026-08-06",
    customer: "Althea Cruz",
    id: "review-03",
    productName: "Habi Weave Tote",
    productSku: "LUM-BAG-032",
    rating: 2,
    reply: {
      repliedAt: "2026-08-06",
      text: "Thank you for flagging this, Althea. We have pulled that batch for inspection and your replacement is on the way.",
    },
    status: "Resolved",
    title: "Quality slip, good recovery",
  },
  {
    comment: "Perfect weight for Manila weather. Ordering a second one.",
    createdAt: "2026-08-05",
    customer: "Rafael Mendoza",
    id: "review-04",
    productName: "Baybayin Knit Cardigan",
    productSku: "LUM-KNT-008",
    rating: 5,
    reply: {
      repliedAt: "2026-08-05",
      text: "So glad it works for you, Rafael. Thank you for shopping with Velori.",
    },
    status: "Published",
    title: "Exactly right",
  },
  {
    comment: "Runs small. Order one size up.",
    createdAt: "2026-08-04",
    customer: "Bea Villanueva",
    id: "review-05",
    productName: "Tala Slip Skirt",
    productSku: "LUM-SKT-045",
    rating: 3,
    reply: null,
    status: "Published",
    title: "Sizing runs small",
  },
  {
    comment:
      "This is spam content posted repeatedly across several listings and should be removed.",
    createdAt: "2026-08-04",
    customer: "Unknown Buyer",
    id: "review-06",
    productName: "Marikit Tailored Blazer",
    productSku: "LUM-OUT-023",
    rating: 1,
    reply: null,
    status: "Flagged",
    title: "Reported by the team",
  },
  {
    comment:
      "Tailoring is genuinely excellent — the shoulders sit properly without alteration, which almost never happens for me off the rack. The lining is a nice weight too, not the papery stuff you usually get at this price. My only note is that the buttons feel a little plain against the fabric.",
    createdAt: "2026-08-03",
    customer: "Miguel Torres",
    id: "review-07",
    productName: "Marikit Tailored Blazer",
    productSku: "LUM-OUT-023",
    rating: 5,
    reply: null,
    status: "Published",
    title: "Best blazer fit I have found locally",
  },
  {
    comment: "Never arrived. Tracking stopped updating after a week.",
    createdAt: "2026-08-02",
    customer: "Kristine Lim",
    id: "review-08",
    productName: "Dalisay Bias Midi Dress",
    productSku: "LUM-DRS-029",
    rating: 1,
    reply: {
      repliedAt: "2026-08-03",
      text: "We are very sorry, Kristine. We have opened a case with the courier and issued a full refund today.",
    },
    status: "Resolved",
    title: "Delivery failed",
  },
  {
    comment: "Lovely fabric, arrived early.",
    createdAt: "2026-08-01",
    customer: "Paolo Aquino",
    id: "review-09",
    productName: "Liwayway Wide-Leg Trouser",
    productSku: "LUM-BOT-054",
    rating: 5,
    reply: null,
    status: "Published",
    title: "Fast and lovely",
  },
  {
    comment: "Fine, nothing special for the price.",
    createdAt: "2026-07-31",
    customer: "Danica Ocampo",
    id: "review-10",
    productName: "Panganay Heritage Scarf",
    productSku: "LUM-ACC-067",
    rating: 3,
    reply: null,
    status: "Published",
    title: "It is okay",
  },
  {
    comment:
      "Second purchase from Velori and the consistency is what keeps me here. Packaging was plastic-free again, which I appreciate.",
    createdAt: "2026-07-30",
    customer: "Enrico Bautista",
    id: "review-11",
    productName: "Amihan Linen Wrap Dress",
    productSku: "LUM-DRS-016",
    rating: 4,
    reply: {
      repliedAt: "2026-07-31",
      text: "Thank you Enrico — plastic-free packaging is here to stay.",
    },
    status: "Published",
    title: "Consistent quality",
  },
  {
    comment: "Hidden pending a moderation review after a customer dispute.",
    createdAt: "2026-07-29",
    customer: "Sofia Ramos",
    id: "review-12",
    productName: "Mutya Occasion Gown",
    productSku: "LUM-DRS-041",
    rating: 2,
    reply: null,
    status: "Hidden",
    title: "Under moderation",
  },
];

export type PromotionsWorkspaceSnapshot = { promotions: Promotion[] };
export type ReviewsWorkspaceSnapshot = { reviews: Review[] };

/** Stands in for the promotions API. */
export async function loadPromotionsWorkspace(): Promise<PromotionsWorkspaceSnapshot> {
  return { promotions: demoPromotions };
}

/** Stands in for the reviews API. */
export async function loadReviewsWorkspace(): Promise<ReviewsWorkspaceSnapshot> {
  return { reviews: demoReviews };
}

/**
 * The sidebar's Reviews badge: reviews still waiting on the merchant. Counted
 * from the same rows the page shows rather than written into the navigation.
 */
export function reviewBadgeCount(reviews: readonly Review[]) {
  return reviews.filter(
    (review) =>
      review.reply === null &&
      (review.status === "Published" || review.status === "Flagged"),
  ).length;
}

/** The label the Applies-to column shows for a promotion's scope. */
export function promotionScopeLabel(promotion: Promotion) {
  if (promotion.scope === "all") return "All products";
  return promotion.scopeTarget ?? "—";
}
