import type { Href } from "expo-router";

import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import type { DashboardIconName } from "@/features/merchant-dashboard/dashboard-primitives";

/**
 * One description of what a merchant's store status means.
 *
 * Before this, three surfaces each decided independently how to label and tint
 * the status, so the sidebar said "Store suspended" in amber while the profile
 * said the same thing in red. Everything that shows the status now reads it from
 * here, which is also what makes the sidebar's chip data-driven rather than a
 * string built at the call site.
 */

export type StoreStatus = MerchantSession["storeStatus"];

export type StoreStatusPresentation = {
  /** Whether the public storefront can be opened in this state. */
  canViewStorefront: boolean;
  /** Why the storefront is unavailable, for a tooltip and an accessibility hint. */
  disabledReason?: string;
  icon: DashboardIconName;
  /** The full chip label, e.g. "Store suspended". */
  label: string;
  /** The status on its own, for callers that supply their own "Store status:" prefix. */
  shortLabel: string;
  /** The longer sentence, for cards that have room for it. */
  summary: string;
  tone: "danger" | "green" | "neutral" | "warning";
};

const STOREFRONT_CLOSED =
  "Your storefront is offline while the store is not active.";

export const storeStatusPresentation: Record<
  StoreStatus,
  StoreStatusPresentation
> = {
  active: {
    canViewStorefront: true,
    icon: "storefront-outline",
    label: "Store active",
    shortLabel: "Active",
    summary: "Your storefront is live and accepting orders.",
    tone: "green",
  },
  inactive: {
    canViewStorefront: false,
    disabledReason: STOREFRONT_CLOSED,
    icon: "pause-circle-outline",
    label: "Store inactive",
    shortLabel: "Inactive",
    summary: "Selling is paused, so your storefront is hidden from shoppers.",
    tone: "neutral",
  },
  suspended: {
    canViewStorefront: false,
    disabledReason: STOREFRONT_CLOSED,
    icon: "alert-outline",
    label: "Store suspended",
    shortLabel: "Suspended",
    summary:
      "Selling is suspended. The Velori partner team can walk you through reactivating.",
    tone: "danger",
  },
  under_review: {
    canViewStorefront: false,
    disabledReason:
      "Your storefront goes live once this merchant passes review.",
    icon: "clock-outline",
    label: "Under review",
    shortLabel: "Under review",
    summary:
      "This merchant is being reviewed. Your storefront goes live once it is approved.",
    tone: "warning",
  },
};

export function presentStoreStatus(session: MerchantSession) {
  return storeStatusPresentation[session.storeStatus];
}

/**
 * The app's existing shopper-facing storefront.
 *
 * There is no per-merchant storefront route in this app yet — the backend has
 * slug-based storefront endpoints, but nothing in `app/` renders one — so this
 * points at the storefront the frontend actually has rather than inventing a
 * route that would 404. It is declared once so the sidebar, the header menu and
 * the welcome card cannot drift apart.
 */
export const STOREFRONT_ROUTE = "/(tabs)/home" as Href;
