import { fireEvent, render } from "@testing-library/react-native";

import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import { resolvePromotionsSection } from "@/features/merchant-dashboard/merchant-navigation";
import {
  demoPromotions,
  demoReviews,
  loadPromotionsWorkspace,
  loadReviewsWorkspace,
  type Promotion,
  promotionScopeLabel,
  type Review,
  reviewBadgeCount,
} from "@/features/merchant-dashboard/promotions-reviews-demo-data";
import {
  discountLabel,
  promotionFrom,
  promotionFormValues,
  PromotionsContent,
  promotionMenuItems,
  usageLabel,
  validatePromotionForm,
} from "@/features/merchant-dashboard/promotions-sections";
import {
  reviewMenuItems,
  ReviewsContent,
} from "@/features/merchant-dashboard/reviews-sections";
import {
  applyPromotionAction,
  applyReviewReply,
  availablePromotionActions,
  availableReviewActions,
  duplicatePromotion,
  emptyPromotionFilters,
  emptyReviewFilters,
  filterPromotions,
  filterReviews,
  promotionStatusCounts,
  reviewSummary,
  validateReply,
} from "@/features/merchant-dashboard/use-promotions-reviews";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

function sessionFor(role: MerchantSession["role"]): MerchantSession {
  return {
    defaultLocation: "Makati Warehouse",
    displayName: "Althea",
    email: "althea@example.com",
    merchantHandle: "merchant:m1",
    merchantId: "m1",
    merchantName: "Lumière",
    permissions: rolePermissions[role],
    role,
    storeStatus: "active",
    verified: true,
  };
}

const owner = sessionFor("Merchant Owner");
const supportStaff = sessionFor("Support Staff");
const promotion = (overrides: Partial<Promotion> = {}): Promotion => ({
  ...demoPromotions[0],
  ...overrides,
});
const review = (overrides: Partial<Review> = {}): Review => ({
  ...demoReviews[0],
  ...overrides,
});

describe("resolvePromotionsSection", () => {
  it("resolves Promotions and Reviews and nothing else", () => {
    expect(resolvePromotionsSection("promotions")).toBe("promotions");
    expect(resolvePromotionsSection("reviews")).toBe("reviews");
    expect(resolvePromotionsSection("orders")).toBeUndefined();
    expect(resolvePromotionsSection(undefined)).toBeUndefined();
    expect(resolvePromotionsSection(" Reviews ")).toBe("reviews");
  });
});

describe("demo data", () => {
  it("covers every promotion status and type", () => {
    expect(new Set(demoPromotions.map((p) => p.status)).size).toBe(6);
    expect(new Set(demoPromotions.map((p) => p.type)).size).toBe(3);
    expect(demoPromotions.length).toBeGreaterThan(8);
  });

  it("covers every rating and both reply states", () => {
    const ratings = new Set(demoReviews.map((r) => r.rating));
    for (const rating of [1, 2, 3, 4, 5])
      expect(ratings.has(rating)).toBe(true);
    expect(demoReviews.some((r) => r.reply !== null)).toBe(true);
    expect(demoReviews.some((r) => r.reply === null)).toBe(true);
    expect(new Set(demoReviews.map((r) => r.status)).size).toBe(4);
  });

  it("never lets a scoped promotion lose its target", () => {
    for (const row of demoPromotions) {
      if (row.scope === "all") expect(row.scopeTarget).toBeNull();
      else expect(row.scopeTarget).not.toBeNull();
    }
  });

  it("exposes loaders shaped like the APIs that will replace them", async () => {
    expect((await loadPromotionsWorkspace()).promotions).toHaveLength(
      demoPromotions.length,
    );
    expect((await loadReviewsWorkspace()).reviews).toHaveLength(
      demoReviews.length,
    );
  });

  it("derives the Reviews badge from unanswered rows", () => {
    expect(reviewBadgeCount(demoReviews)).toBe(
      demoReviews.filter(
        (r) =>
          r.reply === null &&
          (r.status === "Published" || r.status === "Flagged"),
      ).length,
    );
    // A hidden review is not waiting on the merchant.
    expect(reviewBadgeCount([review({ reply: null, status: "Hidden" })])).toBe(
      0,
    );
  });
});

describe("discountLabel", () => {
  it("shows each type in the unit it actually uses", () => {
    expect(
      discountLabel(promotion({ discountValue: 20, type: "PERCENTAGE" })),
    ).toBe("20%");
    // Fixed amounts are centavos, formatted by the shared peso formatter.
    expect(
      discountLabel(promotion({ discountValue: 50_000, type: "FIXED_AMOUNT" })),
    ).toBe("₱500");
    expect(discountLabel(promotion({ type: "FREE_SHIPPING" }))).toBe(
      "Free shipping",
    );
  });
});

describe("usageLabel", () => {
  it("distinguishes a capped promotion from an unlimited one", () => {
    expect(usageLabel(promotion({ usageCount: 184, usageLimit: 500 }))).toBe(
      "184 / 500",
    );
    expect(usageLabel(promotion({ usageCount: 471, usageLimit: null }))).toBe(
      "471 used",
    );
  });
});

describe("promotionScopeLabel", () => {
  it("names the target, or all products", () => {
    expect(
      promotionScopeLabel(promotion({ scope: "all", scopeTarget: null })),
    ).toBe("All products");
    expect(
      promotionScopeLabel(
        promotion({ scope: "category", scopeTarget: "Dresses" }),
      ),
    ).toBe("Dresses");
  });
});

describe("filterPromotions", () => {
  it("matches the name and the scope target", () => {
    expect(
      filterPromotions(demoPromotions, {
        ...emptyPromotionFilters,
        query: "outerwear",
      }).length,
    ).toBeGreaterThan(0);
  });

  it("keeps promotions that overlap the range rather than only those inside it", () => {
    const filtered = filterPromotions(demoPromotions, {
      ...emptyPromotionFilters,
      from: "2026-08-10",
      to: "2026-08-12",
    });

    expect(filtered.length).toBeGreaterThan(0);
    for (const row of filtered) {
      expect(row.endsAt >= "2026-08-10").toBe(true);
      expect(row.startsAt <= "2026-08-12").toBe(true);
    }
  });

  it("returns nothing rather than everything when no row matches", () => {
    expect(
      filterPromotions(demoPromotions, {
        ...emptyPromotionFilters,
        query: "no-such-promotion",
      }),
    ).toEqual([]);
  });
});

describe("promotion actions", () => {
  it("offers only what a status allows", () => {
    expect(
      availablePromotionActions(promotion({ status: "Active" })),
    ).toContain("pause");
    expect(
      availablePromotionActions(promotion({ status: "Paused" })),
    ).toContain("activate");
    // Archived is terminal apart from taking a copy.
    expect(
      availablePromotionActions(promotion({ status: "Archived" })),
    ).toEqual(["duplicate"]);
  });

  it("moves status without mutating the original", () => {
    const source = promotion({ status: "Active" });
    const snapshot = { ...source };
    expect(applyPromotionAction(source, "pause").status).toBe("Paused");
    expect(source).toEqual(snapshot);
  });

  it("makes a duplicate a fresh draft with its own id", () => {
    const copy = duplicatePromotion(promotion({ usageCount: 184 }));

    expect(copy.id).not.toBe(demoPromotions[0].id);
    expect(copy.status).toBe("Draft");
    expect(copy.usageCount).toBe(0);
    expect(copy.name).toContain("(copy)");
  });

  it("counts each status exactly once", () => {
    const counts = promotionStatusCounts(demoPromotions);
    expect(counts.active).toBe(
      demoPromotions.filter((p) => p.status === "Active").length,
    );
    expect(counts.expired).toBe(
      demoPromotions.filter((p) => p.status === "Expired").length,
    );
  });
});

describe("validatePromotionForm", () => {
  const base = promotionFormValues(demoPromotions[0]);

  it("requires a name and valid dates", () => {
    expect(validatePromotionForm({ ...base, name: "  " }).name).toBeDefined();
    expect(
      validatePromotionForm({ ...base, startsAt: "2026-08" }).startsAt,
    ).toBeDefined();
  });

  it("rejects an end date before the start", () => {
    expect(
      validatePromotionForm({
        ...base,
        endsAt: "2026-08-01",
        startsAt: "2026-08-20",
      }).endsAt,
    ).toBeDefined();
  });

  it("bounds a percentage to 1-100", () => {
    for (const value of ["0", "101", "abc"]) {
      expect(
        validatePromotionForm({
          ...base,
          discountValue: value,
          type: "PERCENTAGE",
        }).discountValue,
      ).toBeDefined();
    }
    expect(
      validatePromotionForm({
        ...base,
        discountValue: "20",
        type: "PERCENTAGE",
      }).discountValue,
    ).toBeUndefined();
  });

  it("does not ask for a discount value on free shipping", () => {
    expect(
      validatePromotionForm({
        ...base,
        discountValue: "",
        type: "FREE_SHIPPING",
      }).discountValue,
    ).toBeUndefined();
  });

  it("requires a target once the scope is not all products", () => {
    expect(
      validatePromotionForm({ ...base, scope: "category", scopeTarget: "" })
        .scopeTarget,
    ).toBeDefined();
  });
});

describe("promotionFrom", () => {
  it("converts pesos to centavos for a fixed amount", () => {
    const built = promotionFrom(
      {
        ...promotionFormValues(demoPromotions[0]),
        discountValue: "500",
        minimumPurchase: "1500",
        type: "FIXED_AMOUNT",
      },
      null,
    );

    expect(built.discountValue).toBe(50_000);
    expect(built.minimumPurchaseCentavos).toBe(150_000);
  });

  it("keeps a percentage as a percentage", () => {
    const built = promotionFrom(
      { ...promotionFormValues(demoPromotions[0]), discountValue: "20" },
      null,
    );
    expect(built.discountValue).toBe(20);
  });

  it("preserves the id and usage history on an edit", () => {
    const existing = promotion({ usageCount: 184 });
    const built = promotionFrom(promotionFormValues(existing), existing);

    expect(built.id).toBe(existing.id);
    expect(built.usageCount).toBe(184);
  });

  it("clears the target when the scope becomes all products", () => {
    const built = promotionFrom(
      { ...promotionFormValues(demoPromotions[0]), scope: "all" },
      null,
    );
    expect(built.scopeTarget).toBeNull();
  });

  it("treats a blank usage limit as unlimited", () => {
    expect(
      promotionFrom(
        { ...promotionFormValues(demoPromotions[0]), usageLimit: "" },
        null,
      ).usageLimit,
    ).toBeNull();
  });
});

describe("promotionMenuItems", () => {
  it("disables management for a role without promotions.manage", () => {
    expect(supportStaff.permissions).not.toContain("promotions.manage");

    const items = promotionMenuItems({
      promotion: promotion({ status: "Active" }),
      session: supportStaff,
    });

    expect(items.find((i) => i.key === "edit")?.disabled).toBe(true);
    expect(items.find((i) => i.key === "pause")?.disabled).toBe(true);
    // Viewing is not management.
    expect(items.find((i) => i.key === "view")?.disabled).toBeUndefined();
  });

  it("blocks editing an archived promotion even for an owner", () => {
    expect(
      promotionMenuItems({
        promotion: promotion({ status: "Archived" }),
        session: owner,
      }).find((i) => i.key === "edit")?.disabled,
    ).toBe(true);
  });
});

describe("reviews", () => {
  it("summarises rating, awaiting and flagged counts", () => {
    const summary = reviewSummary(demoReviews);

    expect(summary.total).toBe(demoReviews.length);
    expect(summary.averageRating).toBeGreaterThan(0);
    expect(summary.flagged).toBe(
      demoReviews.filter((r) => r.status === "Flagged").length,
    );
  });

  it("reads 0.0 rather than NaN with no reviews", () => {
    expect(reviewSummary([]).averageRating).toBe(0);
  });

  it("excludes hidden reviews from the average", () => {
    const withHidden = [
      review({ id: "a", rating: 5, status: "Published" }),
      review({ id: "b", rating: 1, status: "Hidden" }),
    ];
    expect(reviewSummary(withHidden).averageRating).toBe(5);
  });

  it("filters by rating, reply state and text", () => {
    expect(
      filterReviews(demoReviews, { ...emptyReviewFilters, rating: 5 }).every(
        (r) => r.rating === 5,
      ),
    ).toBe(true);
    expect(
      filterReviews(demoReviews, {
        ...emptyReviewFilters,
        reply: "unreplied",
      }).every((r) => r.reply === null),
    ).toBe(true);
    expect(
      filterReviews(demoReviews, { ...emptyReviewFilters, query: "linen" })
        .length,
    ).toBeGreaterThan(0);
  });

  it("offers resolve and flag only where they would change something", () => {
    expect(
      availableReviewActions(review({ status: "Resolved" })),
    ).not.toContain("resolve");
    expect(availableReviewActions(review({ status: "Flagged" }))).not.toContain(
      "flag",
    );
  });

  it("attaches a reply without mutating the review", () => {
    const source = review({ reply: null });
    const snapshot = { ...source };
    const replied = applyReviewReply(source, "  Thank you!  ");

    expect(replied.reply?.text).toBe("Thank you!");
    expect(source).toEqual(snapshot);
  });

  it("refuses an empty reply", () => {
    expect(validateReply("   ")).toBeDefined();
    expect(validateReply("a".repeat(1_001))).toBeDefined();
    expect(validateReply("Thanks!")).toBeUndefined();
  });

  it("disables moderation for a role without reviews.moderate", () => {
    expect(supportStaff.permissions).not.toContain("reviews.moderate");

    const items = reviewMenuItems({ review: review(), session: supportStaff });

    expect(items.find((i) => i.key === "reply")?.disabled).toBe(true);
    expect(items.find((i) => i.key === "view")?.disabled).toBe(false);
  });

  it("renames Reply to Edit reply once a reply exists", () => {
    const items = reviewMenuItems({
      review: review({ reply: { repliedAt: "2026-08-01", text: "Hi" } }),
      session: owner,
    });
    expect(items.find((i) => i.key === "reply")?.label).toBe("Edit reply");
  });
});

describe("PromotionsContent", () => {
  const renderPromotions = (overrides: Record<string, unknown> = {}) =>
    render(
      <PromotionsContent
        compact={false}
        filters={emptyPromotionFilters}
        onFiltersChange={jest.fn()}
        promotions={demoPromotions}
        session={owner}
        {...overrides}
      />,
    );

  it("renders tiles and a page of rows", () => {
    const screen = renderPromotions();

    expect(screen.getByTestId("promotion-tiles")).toBeTruthy();
    expect(
      screen.getByTestId(`promotion-row-${demoPromotions[0].id}`),
    ).toBeTruthy();
  });

  it("says plainly that changes are demo-only", () => {
    expect(
      renderPromotions().getByText(/update the demo data only/),
    ).toBeTruthy();
  });

  it("gates Create Promotion on promotions.manage", () => {
    expect(
      renderPromotions({ session: supportStaff }).getByTestId(
        "promotions-create",
      ).props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      renderPromotions().getByTestId("promotions-create").props
        .accessibilityState.disabled,
    ).toBe(false);
  });

  it("reports a filter change up rather than filtering locally", () => {
    const onFiltersChange = jest.fn();
    const screen = renderPromotions({ onFiltersChange });

    fireEvent.changeText(screen.getByLabelText("Search promotions"), "amihan");

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ query: "amihan" }),
    );
  });

  it("stacks cards instead of the table when compact", () => {
    const screen = renderPromotions({ compact: true });

    expect(
      screen.getByTestId(`promotion-card-${demoPromotions[0].id}`),
    ).toBeTruthy();
  });

  it("shows the no-match message rather than an empty table", () => {
    expect(
      renderPromotions({ promotions: [] }).getByText(
        "No promotions match your filters.",
      ),
    ).toBeTruthy();
  });
});

describe("ReviewsContent", () => {
  const renderReviews = (overrides: Record<string, unknown> = {}) =>
    render(
      <ReviewsContent
        compact={false}
        filters={emptyReviewFilters}
        onFiltersChange={jest.fn()}
        reviews={demoReviews}
        session={owner}
        {...overrides}
      />,
    );

  it("renders tiles and the review list", () => {
    const screen = renderReviews();

    expect(screen.getByTestId("review-tiles")).toBeTruthy();
    expect(screen.getByTestId(`review-row-${demoReviews[0].id}`)).toBeTruthy();
    expect(screen.getByText(demoReviews[0].title)).toBeTruthy();
  });

  it("shows an existing merchant reply inline", () => {
    const replied = demoReviews.find((r) => r.reply !== null)!;
    const screen = renderReviews({ reviews: [replied] });

    expect(screen.getByText(replied.reply!.text)).toBeTruthy();
  });

  it("labels each review as replied or awaiting", () => {
    const screen = renderReviews();

    expect(screen.getAllByText("Awaiting reply").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Replied").length).toBeGreaterThan(0);
  });

  it("gates the Reply button on reviews.moderate", () => {
    expect(
      renderReviews({ session: supportStaff }).getByTestId(
        `review-reply-${demoReviews[0].id}`,
      ).props.accessibilityState.disabled,
    ).toBe(true);
  });

  it("shows the no-match message rather than an empty list", () => {
    expect(
      renderReviews({ reviews: [] }).getByText(
        "No reviews match your filters.",
      ),
    ).toBeTruthy();
  });
});
