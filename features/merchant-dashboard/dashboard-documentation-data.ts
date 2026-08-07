import { colors } from "@/constants/design-tokens";
import type { DashboardState } from "@/features/merchant-dashboard/dashboard-types";

type DocumentedDashboardState = Exclude<DashboardState, "ready">;

type DashboardStateFrame = {
  id: string;
  name: string;
  note: string;
  state: DocumentedDashboardState;
  trigger: string;
};

const dashboardStateDetails: Record<
  DocumentedDashboardState,
  Omit<DashboardStateFrame, "id" | "state">
> = {
  refreshing: {
    name: "Data refreshing",
    note: "Existing data remains visible behind a non-blocking refresh notice.",
    trigger:
      "Triggered when already-loaded data is being brought up to date without blocking the workspace.",
  },
  empty: {
    name: "New merchant / Empty",
    note: "A guided first-product setup replaces misleading zeroed metrics.",
    trigger:
      "Triggered after approval when the merchant has no products or orders yet.",
  },
  error: {
    name: "Service error",
    note: "The message explains impact and recovery without exposing technology.",
    trigger: "Triggered when required dashboard data cannot be loaded safely.",
  },
  loading: {
    name: "Loading",
    note: "Skeletons mirror the real layout; unlike empty, loading never suggests no data.",
    trigger:
      "Triggered while dashboard data and permissions are being resolved.",
  },
  partial: {
    name: "Partial data",
    note: "Regions that loaded stay usable while the ones that failed are named instead of faked.",
    trigger:
      "Triggered when some dashboard requests succeed and others fail.",
  },
  "permission-denied": {
    name: "Permission denied",
    note: "No restricted merchant content is rendered outside the safe recovery state.",
    trigger:
      "Triggered when the signed-in role cannot read the requested section.",
  },
  "session-expired": {
    name: "Session expired",
    note: "The user is prompted to authenticate again without exposing session details.",
    trigger: "Triggered after an access session expires or is revoked.",
  },
  inactive: {
    name: "Merchant inactive",
    note: "Selling is paused while support and merchant-profile access remain available.",
    trigger:
      "Triggered when platform review marks the merchant workspace inactive.",
  },
};

const documentedDashboardStates: DocumentedDashboardState[] = [
  "loading",
  "empty",
  "partial",
  "refreshing",
  "error",
  "permission-denied",
  "session-expired",
  "inactive",
];

export const dashboardStateFrames: DashboardStateFrame[] =
  documentedDashboardStates.map((state) => ({
    id: `dashboard-state-${state}`,
    state,
    ...dashboardStateDetails[state],
  }));

export type SidebarFrame = {
  height?: number;
  id: string;
  name: string;
  note: string;
  props?: {
    collapsed?: boolean;
    scrollDemo?: "scrolling" | "hover" | "active";
  };
  thumb: string;
};

export const sidebarFrames = [
  {
    id: "sidebar-idle",
    name: "Default (idle)",
    note: "Quiet but discoverable until the navigation region is used.",
    thumb: `${colors.brand.pinkSoft} at 45%`,
  },
  {
    id: "sidebar-scrolling",
    name: "Scrolling",
    note: "The thumb strengthens while scrolling, then returns to idle.",
    props: { scrollDemo: "scrolling" },
    thumb: `${colors.brand.pinkSoft} at 70%`,
  },
  {
    id: "sidebar-hover",
    name: "Thumb hover",
    note: "Pointer hover makes the draggable target unmistakable.",
    props: { scrollDemo: "hover" },
    thumb: colors.brand.primary,
  },
  {
    id: "sidebar-dragging",
    name: "Thumb dragging",
    note: "The active thumb darkens during a pointer drag.",
    props: { scrollDemo: "active" },
    thumb: colors.brand.primaryActive,
  },
  {
    height: 420,
    id: "sidebar-short-laptop",
    name: "Short laptop viewport (720px tall)",
    note: "Only the navigation region scrolls; utilities stay fixed.",
    thumb: `${colors.brand.pinkSoft} at 45%`,
  },
  {
    id: "sidebar-collapsed",
    name: "Collapsed icon rail",
    note: "The 84px rail keeps navigation available on compact laptops.",
    props: { collapsed: true },
    thumb: `${colors.brand.pinkSoft} at 45%`,
  },
  {
    id: "sidebar-tablet-drawer",
    name: "Tablet drawer",
    note: "The same sidebar appears inside a dismissible drawer.",
    thumb: `${colors.brand.pinkSoft} at 45%`,
  },
] as SidebarFrame[];

export const responsiveRules = [
  {
    behavior: "Full sidebar, multi-column grid, max-width content column",
    frame: "1440+",
  },
  {
    behavior: "Icon rail, tighter spacing, nothing clipped",
    frame: "1280×720",
  },
  {
    behavior: "Nav scrolls without clipping the fixed sidebar regions",
    frame: "1366×768",
  },
  {
    behavior:
      "Two-column grid, nav drawer, metric cards two-up, tables as compact lists",
    frame: "768–1024",
  },
  {
    behavior:
      "Single column, nav drawer, metric cards stacked full width, tables as stacked cards, bottom-safe padding, vertical scrolling only",
    frame: "~390",
  },
];

export const appliedSecurityRules = [
  "Permissions come from the backend.",
  "Merchant and user context comes from the backend; a merchant ID is never typed or displayed.",
  "Users can never type or invent a role.",
  "No payment credentials and no sensitive customer data.",
  "No raw audit payloads, tokens, authorization headers, internal IDs, or storage paths.",
  "Inventory movement internals stay inside the Inventory section.",
  "Integer Philippine centavos in application logic; formatted Philippine pesos in the UI.",
  "Loading is always distinguishable from empty.",
  "Errors describe impact and recovery, never technology.",
];
