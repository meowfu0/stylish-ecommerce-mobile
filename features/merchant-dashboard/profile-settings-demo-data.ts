/**
 * Demo data for the Merchant Profile and Settings workspaces.
 *
 * This is the only place either page gets its values from, and it exists purely
 * so the screens can be visualised before those APIs land. The loaders below
 * have the signatures real ones would, so swapping them for `apiRequest` later
 * is a one-file change and no component has to be redesigned.
 *
 * Everything the session already knows — store name, role, verification, store
 * status, default location, email — is read from `MerchantSession` at render
 * time instead. Only the fields the session does not model live here.
 */

/**
 * Business details the merchant session does not carry. They are fixture-only
 * for now; a profile endpoint would own them.
 */
export type MerchantProfile = {
  addressLine: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  description: string;
  postalCode: string;
  /** Display name for the business, editable independently of the workspace. */
  storeName: string;
  /** ISO date the merchant account was created. */
  memberSince: string;
};

export const demoProfile: MerchantProfile = {
  addressLine: "Unit 12, 8 Amorsolo Street, Legazpi Village",
  city: "Makati City",
  contactEmail: "hello@postmanfashion.ph",
  contactPhone: "+63 917 555 0142",
  country: "Philippines",
  description:
    "A Manila-based label making everyday linen and silk pieces in small batches, with a focus on Filipino craft and plastic-free packaging.",
  memberSince: "2025-11-02",
  postalCode: "1229",
  storeName: "Postman Fashion",
};

export const NOTIFICATION_KEYS = [
  "orders",
  "lowStock",
  "fulfillment",
  "reviews",
  "promotions",
] as const;
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

export type NotificationPreferences = Record<NotificationKey, boolean>;

export const notificationCopy: Record<
  NotificationKey,
  { description: string; label: string }
> = {
  fulfillment: {
    description: "Packing, shipping and delivery updates on your orders.",
    label: "Fulfilment updates",
  },
  lowStock: {
    description: "When a variant falls to or below its reorder threshold.",
    label: "Low-stock alerts",
  },
  orders: {
    description: "A new order is placed, cancelled or refunded.",
    label: "Order notifications",
  },
  promotions: {
    description: "A promotion starts, ends or reaches its usage limit.",
    label: "Promotion updates",
  },
  reviews: {
    description: "A shopper leaves a review that is waiting on your reply.",
    label: "Review notifications",
  },
};

export const demoNotifications: NotificationPreferences = {
  fulfillment: true,
  lowStock: true,
  orders: true,
  promotions: false,
  reviews: true,
};

/**
 * Store preferences the dashboard can genuinely act on today. Currency is fixed
 * because every figure in the app is Philippine centavos, so it is shown as
 * read-only rather than offered as a choice the UI cannot honour.
 */
export const TIMEZONES = [
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "UTC",
] as const;
export type Timezone = (typeof TIMEZONES)[number];

export const DATE_FORMATS = [
  "MMM D, YYYY",
  "DD/MM/YYYY",
  "YYYY-MM-DD",
] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const WEEK_STARTS = ["Monday", "Sunday"] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

export type StorePreferences = {
  dateFormat: DateFormat;
  defaultLocation: string;
  timezone: Timezone;
  weekStart: WeekStart;
};

export const demoStorePreferences: StorePreferences = {
  dateFormat: "MMM D, YYYY",
  defaultLocation: "Makati Warehouse",
  timezone: "Asia/Manila",
  weekStart: "Monday",
};

export const PREFERENCE_LOCATIONS = [
  "Makati Warehouse",
  "Cebu Hub",
  "Davao Pop-up",
] as const;

/** Display-only session information; the app has no session-listing endpoint. */
export type SecuritySession = {
  browser: string;
  current: boolean;
  id: string;
  /** ISO date of the most recent activity on that session. */
  lastActiveAt: string;
  location: string;
  platform: string;
};

export type SecurityInfo = {
  /** ISO date the password was last changed. */
  passwordChangedAt: string;
  sessions: SecuritySession[];
  twoFactorEnabled: boolean;
};

export const demoSecurity: SecurityInfo = {
  passwordChangedAt: "2026-05-18",
  sessions: [
    {
      browser: "Chrome 141",
      current: true,
      id: "session-01",
      lastActiveAt: "2026-08-08",
      location: "Makati City, PH",
      platform: "Windows",
    },
    {
      browser: "Safari 19",
      current: false,
      id: "session-02",
      lastActiveAt: "2026-08-06",
      location: "Makati City, PH",
      platform: "iPhone",
    },
    {
      browser: "Chrome 140",
      current: false,
      id: "session-03",
      lastActiveAt: "2026-07-29",
      location: "Cebu City, PH",
      platform: "macOS",
    },
  ],
  twoFactorEnabled: false,
};

export type ProfileWorkspaceSnapshot = {
  notifications: NotificationPreferences;
  preferences: StorePreferences;
  profile: MerchantProfile;
  security: SecurityInfo;
};

/** Stands in for the merchant profile and settings APIs. */
export async function loadProfileWorkspace(): Promise<ProfileWorkspaceSnapshot> {
  return {
    notifications: demoNotifications,
    preferences: demoStorePreferences,
    profile: demoProfile,
    security: demoSecurity,
  };
}

/** The address as one line, for the overview card and the profile summary. */
export function formattedAddress(profile: MerchantProfile) {
  return [
    profile.addressLine,
    profile.city,
    profile.postalCode,
    profile.country,
  ]
    .filter((part) => part.trim().length > 0)
    .join(", ");
}
