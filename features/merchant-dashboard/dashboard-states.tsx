import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { dashboardSectionLabels } from "@/features/merchant-dashboard/dashboard-data-source";
import { useResponsiveGrid } from "@/features/merchant-dashboard/dashboard-grid";
import {
  metricGridGap,
  metricMinCardWidth,
} from "@/features/merchant-dashboard/dashboard-overview-sections";
import { plotHeightFor } from "@/features/merchant-dashboard/sales-chart-model";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  type DashboardIconName,
  DashboardSkeleton,
} from "@/features/merchant-dashboard/dashboard-primitives";
import type {
  DashboardSectionKey,
  DashboardState,
  MerchantSession,
  Permission,
} from "@/features/merchant-dashboard/dashboard-types";
import { signOutCurrentSession } from "@/services/auth/auth-session";

type StateActions = {
  onContactSupport?: () => void;
  onCreateProduct?: () => void;
  onImportCatalog?: () => void;
  onRetry?: () => void;
  onReturnToOverview?: () => void;
  onReviewMerchantProfile?: () => void;
  onSignInAgain?: () => void | Promise<void>;
};

/**
 * Section names for the banner and the unavailable card.
 *
 * The map is a prop rather than a fixed import so a surface with its own
 * vocabulary — the catalog pages name Products, Categories, Collections and
 * Brands — can report a failure through these components instead of duplicating
 * them. Without it a catalog failure read as the raw key, in lower case.
 */
export type SectionLabels = Readonly<Record<string, string>>;

function sectionLabel(section: string, labels: SectionLabels) {
  return labels[section] ?? section;
}

function listUnavailableSections(
  failedSections: readonly string[],
  labels: SectionLabels,
) {
  const named = failedSections.map((key) => sectionLabel(key, labels));
  if (named.length === 0) return "Some sections";
  if (named.length === 1) return named[0];
  return `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}`;
}

export function DashboardStateBanner({
  failedSections = [],
  onRetry,
  sectionLabels = dashboardSectionLabels,
  state,
}: {
  failedSections?: readonly string[];
  onRetry?: () => void;
  sectionLabels?: SectionLabels;
  state: DashboardState;
}) {
  if (state !== "partial" && state !== "refreshing") return null;

  const partial = state === "partial";
  const unavailable = listUnavailableSections(failedSections, sectionLabels);

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: !partial }}
      style={[
        styles.banner,
        partial ? styles.bannerWarning : styles.bannerInfo,
      ]}
      testID={`dashboard-state-${state}`}
    >
      <DashboardIcon
        color={partial ? colors.feedback.warning : colors.feedback.info}
        name={partial ? "alert-outline" : "cloud-sync-outline"}
      />
      <View style={styles.bannerCopy}>
        <StylishText
          style={[styles.bannerTitle, partial && styles.bannerTitleWarning]}
          unstyled
          variant="label"
        >
          {partial
            ? "Some dashboard information couldn’t be loaded"
            : "Refreshing your dashboard"}
        </StylishText>
        <StylishText
          style={[styles.bannerBody, partial && styles.bannerBodyWarning]}
          unstyled
          variant="caption"
        >
          {partial
            ? `${unavailable} could not be loaded right now. Everything else below is up to date, and orders and inventory actions still work normally.`
            : "Your current figures stay on screen while we bring in the latest numbers. Nothing is blocked while this finishes."}
        </StylishText>
      </View>
      {partial && onRetry ? (
        <DashboardButton icon="refresh" label="Try Again" onPress={onRetry} />
      ) : null}
    </View>
  );
}

export function DashboardBlockingState({
  deniedSection = "This section",
  paired = true,
  requiredPermission,
  session,
  state,
  ...actions
}: StateActions & {
  deniedSection?: string;
  /** Passed through so the loading skeleton uses the content's breakpoint. */
  paired?: boolean;
  requiredPermission?: Permission;
  session: MerchantSession;
  state: DashboardState;
}) {
  const router = useRouter();

  if (state === "ready" || state === "partial" || state === "refreshing") {
    return null;
  }
  if (state === "loading") {
    return <DashboardLoadingState paired={paired} />;
  }
  if (state === "empty") {
    return <NewMerchantState actions={actions} session={session} />;
  }

  const stateConfig = {
    error: {
      body: "Something went wrong while fetching your merchant data. Your catalog and orders are safe — try again in a moment.",
      icon: "alert-outline" as DashboardIconName,
      title: "We couldn’t load your dashboard",
      tone: "danger" as const,
    },
    "permission-denied": {
      body: `${deniedSection} isn’t part of your role in this workspace. Ask the merchant owner if you need access.${
        requiredPermission ? ` Required permission: ${requiredPermission}.` : ""
      }`,
      icon: "shield-lock-outline" as DashboardIconName,
      title: "You don’t have permission to view this section.",
      tone: "warning" as const,
    },
    "session-expired": {
      body: "For your security we signed you out after a period of inactivity. Sign in again to return to this workspace.",
      icon: "timer-off-outline" as DashboardIconName,
      title: "Your session expired",
      tone: "info" as const,
    },
    inactive: {
      body: "Selling is paused for this merchant, so the storefront and new orders are unavailable. The Velori partner team can walk you through what’s needed to reactivate.",
      icon: "shield-alert-outline" as DashboardIconName,
      title: `${session.merchantName} is currently inactive`,
      tone: "danger" as const,
    },
  }[state];

  if (!stateConfig) return null;

  const signInAgain = async () => {
    if (actions.onSignInAgain) {
      await actions.onSignInAgain();
      return;
    }
    await signOutCurrentSession();
    router.replace("/sign-in");
  };

  return (
    <View style={styles.blockingContainer} testID={`dashboard-state-${state}`}>
      <DashboardCard style={styles.blockingCard}>
        <View
          style={[
            styles.stateIcon,
            stateConfig.tone === "warning" && styles.stateIconWarning,
            stateConfig.tone === "info" && styles.stateIconInfo,
          ]}
        >
          <DashboardIcon
            color={
              stateConfig.tone === "warning"
                ? colors.feedback.warning
                : stateConfig.tone === "info"
                  ? colors.feedback.info
                  : colors.feedback.danger
            }
            name={stateConfig.icon}
            size={28}
          />
        </View>
        <View style={styles.blockingCopy}>
          <StylishText
            accessibilityRole="header"
            style={styles.blockingTitle}
            unstyled
            variant="headingMedium"
          >
            {stateConfig.title}
          </StylishText>
          <StylishText style={styles.blockingBody} unstyled variant="bodySmall">
            {stateConfig.body}
          </StylishText>
        </View>
        <View style={styles.blockingActions}>
          {state === "error" ? (
            <>
              <DashboardButton
                icon="refresh"
                label="Try Again"
                large
                onPress={actions.onRetry}
                tone="primary"
              />
              <DashboardButton
                label="Contact Support"
                large
                onPress={actions.onContactSupport}
              />
            </>
          ) : null}
          {state === "session-expired" ? (
            <DashboardButton
              label="Sign In Again"
              large
              onPress={() => void signInAgain()}
              tone="primary"
            />
          ) : null}
          {state === "permission-denied" ? (
            <>
              <DashboardButton
                label="Return to Overview"
                large
                onPress={actions.onReturnToOverview}
                tone="primary"
              />
              <DashboardButton
                label="Contact Merchant Owner"
                large
                onPress={actions.onContactSupport}
              />
            </>
          ) : null}
          {state === "inactive" ? (
            <>
              <DashboardButton
                label="Contact Support"
                large
                onPress={actions.onContactSupport}
                tone="primary"
              />
              <DashboardButton
                label="Review Merchant Profile"
                large
                onPress={actions.onReviewMerchantProfile}
              />
            </>
          ) : null}
        </View>
      </DashboardCard>
    </View>
  );
}

function NewMerchantState({
  actions,
  session,
}: {
  actions: StateActions;
  session: MerchantSession;
}) {
  const setupSteps = [
    {
      body: "Create products with images, variants, and pricing in Philippine pesos.",
      icon: "tag-plus-outline" as DashboardIconName,
      title: "Build your catalog",
    },
    {
      body: "Assign inventory to a location and set reorder thresholds.",
      icon: "cube-outline" as DashboardIconName,
      title: "Set your stock",
    },
    {
      body: "Publish to the marketplace and track orders as they arrive.",
      icon: "store-check-outline" as DashboardIconName,
      title: "Publish and sell",
    },
  ];

  return (
    <View style={styles.blockingContainer} testID="dashboard-state-empty">
      <DashboardCard style={styles.emptyCard}>
        <View style={styles.stateIcon}>
          <DashboardIcon
            color={colors.feedback.danger}
            name="store-plus-outline"
            size={28}
          />
        </View>
        <View style={styles.blockingCopy}>
          <StylishText
            accessibilityRole="header"
            style={styles.blockingTitle}
            unstyled
            variant="headingMedium"
          >
            {session.merchantName} is ready for its first product
          </StylishText>
          <StylishText style={styles.blockingBody} unstyled variant="bodySmall">
            Your workspace is set up and verified. Add a product, set its stock,
            and publish it to start receiving orders.
          </StylishText>
        </View>
        <View style={styles.blockingActions}>
          <DashboardButton
            icon="plus"
            label="Add Product"
            large
            onPress={actions.onCreateProduct}
            tone="primary"
          />
          <DashboardButton
            label="Import catalog"
            large
            onPress={actions.onImportCatalog}
          />
        </View>
        <View style={styles.setupGrid}>
          {setupSteps.map((step, index) => (
            <View key={step.title} style={styles.setupCard}>
              <View style={styles.setupStepHeader}>
                <View style={styles.setupNumber}>
                  <StylishText
                    style={styles.setupNumberText}
                    unstyled
                    variant="caption"
                  >
                    {index + 1}
                  </StylishText>
                </View>
                <DashboardIcon
                  color={colors.feedback.danger}
                  name={step.icon}
                />
              </View>
              <StylishText style={styles.setupTitle} unstyled variant="label">
                {step.title}
              </StylishText>
              <StylishText style={styles.setupBody} unstyled variant="caption">
                {step.body}
              </StylishText>
            </View>
          ))}
        </View>
      </DashboardCard>
    </View>
  );
}

/**
 * Stands in for one region that failed while the rest of the dashboard keeps
 * working. It holds the region's footprint so recovering does not shift the
 * layout, and it never falls back to stale or invented figures.
 */
export function DashboardSectionUnavailable({
  body = "The rest of your dashboard is unaffected. Try loading this section again in a moment.",
  onRetry,
  section,
  sectionLabels = dashboardSectionLabels,
  tall = false,
}: {
  /** Overridden by surfaces whose neighbours are not the overview's sections. */
  body?: string;
  onRetry?: () => void;
  section: DashboardSectionKey | string;
  sectionLabels?: SectionLabels;
  tall?: boolean;
}) {
  return (
    <DashboardCard
      style={[styles.unavailableCard, tall && styles.unavailableCardTall]}
      testID={`dashboard-section-unavailable-${section}`}
    >
      <DashboardIcon
        color={colors.feedback.warning}
        name="cloud-off-outline"
        size={24}
      />
      <StylishText style={styles.unavailableTitle} unstyled variant="label">
        {sectionLabel(section, sectionLabels)} couldn’t be loaded
      </StylishText>
      <StylishText style={styles.unavailableBody} unstyled variant="caption">
        {body}
      </StylishText>
      {onRetry ? (
        <DashboardButton icon="refresh" label="Try Again" onPress={onRetry} />
      ) : null}
    </DashboardCard>
  );
}

function SkeletonLines({ widths }: { widths: (number | `${number}%`)[] }) {
  return (
    <View style={styles.skeletonLines}>
      {widths.map((width, index) => (
        <DashboardSkeleton key={`${width}-${index}`} style={{ width }} />
      ))}
    </View>
  );
}

/** Placeholder count matches the four metrics the dashboard always renders. */
const SKELETON_METRIC_COUNT = 4;

/**
 * Heights measured from the real sections at each width class rather than
 * chosen by eye — the welcome banner and metric cards grow as their copy stops
 * wrapping, so a single constant would shift the page at two breakpoints out of
 * three. Keyed off the same measured row width the metric grid already uses.
 */
function skeletonHeights(rowWidth: number) {
  if (rowWidth > 0 && rowWidth < 420) {
    return { hero: 296, metricCard: 160, side: 1259, table: 789 };
  }
  if (rowWidth > 0 && rowWidth < 900) {
    return { hero: 204, metricCard: 160, side: 716, table: 637 };
  }
  // Narrower cards wrap their comparison line, so they stand taller than the
  // widest layout does.
  if (rowWidth > 0 && rowWidth < 1150) {
    return { hero: 166, metricCard: 192, side: 567, table: 637 };
  }
  return { hero: 166, metricCard: 176, side: 516, table: 637 };
}

/**
 * Loading placeholder for the merchant overview.
 *
 * Every dimension here is borrowed from the real sections rather than invented:
 * the metric placeholders run through the same `useResponsiveGrid` with the same
 * gap and minimum card width, the paired row uses the same `paired` breakpoint
 * the content does, and the chart block takes its height from the chart's own
 * `plotHeightFor`. That is what keeps the layout from shifting when the data
 * lands. The shimmer is CSS-driven and the global reduced-motion rule already
 * stills it.
 */
export function DashboardLoadingState({
  paired = true,
}: {
  /** Mirrors the content's two-column breakpoint. */
  paired?: boolean;
}) {
  const grid = useResponsiveGrid({
    count: SKELETON_METRIC_COUNT,
    gap: metricGridGap,
    minItemWidth: metricMinCardWidth,
  });
  const heights = skeletonHeights(grid.rowWidth);

  return (
    <View
      accessibilityLabel="Loading your merchant dashboard."
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      style={styles.loadingLayout}
      testID="dashboard-state-loading"
    >
      <StylishText style={styles.srOnly} unstyled variant="caption">
        Loading your merchant dashboard.
      </StylishText>

      <DashboardCard
        style={[styles.skeletonHeroCard, { height: heights.hero }]}
      >
        <SkeletonLines widths={[160, 260, 320]} />
      </DashboardCard>

      <View
        onLayout={grid.onLayout}
        style={styles.skeletonMetricGrid}
        testID="dashboard-skeleton-metrics"
      >
        {Array.from({ length: SKELETON_METRIC_COUNT }, (_value, index) => (
          <DashboardCard
            key={index}
            style={[
              styles.skeletonMetricCard,
              grid.itemStyle,
              { height: heights.metricCard },
            ]}
          >
            <SkeletonLines widths={[90, 140, "100%"]} />
          </DashboardCard>
        ))}
      </View>

      <View style={[styles.skeletonPair, !paired && styles.skeletonStacked]}>
        <DashboardCard style={styles.skeletonChartCard}>
          <SkeletonLines widths={[150, 220]} />
          <DashboardSkeleton
            style={{ height: plotHeightFor(grid.rowWidth), width: "100%" }}
          />
        </DashboardCard>
        <DashboardCard
          style={[styles.skeletonSideCard, { height: heights.side }]}
        >
          <SkeletonLines widths={[130, "100%", "100%", "100%", "100%"]} />
        </DashboardCard>
      </View>

      <DashboardCard
        style={[styles.skeletonTableCard, { height: heights.table }]}
      >
        <SkeletonLines
          widths={[160, "100%", "100%", "100%", "100%", "100%", "100%"]}
        />
      </DashboardCard>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "flex-start",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  bannerBody: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  bannerBodyWarning: { color: "rgba(138,90,0,0.85)" },
  bannerCopy: { flex: 1, gap: spacing.xxs, minWidth: 200 },
  bannerInfo: {
    backgroundColor: "rgba(207,226,252,0.35)",
    borderColor: colors.brand.blueSoft,
  },
  bannerTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  bannerTitleWarning: { color: colors.feedback.warning },
  bannerWarning: {
    backgroundColor: colors.feedback.warningSoft,
    borderColor: "#F3DFB5",
  },
  blockingActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  blockingBody: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
  blockingCard: {
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "center",
    minHeight: 342,
    padding: spacing.xl,
    width: "100%",
  },
  blockingContainer: { alignItems: "center", width: "100%" },
  blockingCopy: { alignItems: "center", gap: spacing.xs, maxWidth: 520 },
  blockingTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 22,
    letterSpacing: -0.22,
    lineHeight: 30,
    textAlign: "center",
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.lg,
    minHeight: 500,
    padding: spacing.xl,
    width: "100%",
  },
  // The content column's own gap, so sections land where the skeleton left them.
  loadingLayout: { gap: 20, width: "100%" },
  setupBody: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  setupCard: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexBasis: 220,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 0,
    padding: spacing.md,
  },
  setupGrid: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    width: "100%",
  },
  setupNumber: {
    alignItems: "center",
    backgroundColor: colors.brand.socialSurface,
    borderRadius: borderRadius.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  setupNumberText: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_700Bold",
    fontSize: 11,
    lineHeight: 16,
  },
  setupStepHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  setupTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  // Matches the welcome banner's own padding and compact form.
  // Height is supplied per width class; only padding is fixed here.
  skeletonHeroCard: { justifyContent: "center", padding: spacing.lg },
  // Height comes from the chart at render time, so only padding is fixed here.
  skeletonChartCard: {
    flex: 1,
    gap: spacing.md,
    minWidth: 0,
    padding: spacing.lg,
  },
  skeletonSideCard: {
    flex: 1,
    gap: spacing.md,
    minWidth: 0,
    padding: spacing.lg,
  },
  skeletonLines: { gap: spacing.sm, width: "100%" },
  // Width is supplied by the shared metric grid; only the card's own box is set.
  skeletonMetricCard: { padding: spacing.lg },
  skeletonMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: metricGridGap,
  },
  // The same row and gap the real paired sections use.
  skeletonPair: { flexDirection: "row", gap: spacing.lg },
  skeletonStacked: { flexDirection: "column" },
  skeletonTableCard: { padding: spacing.lg },
  srOnly: {
    height: 1,
    left: -10000,
    overflow: "hidden",
    position: "absolute",
    width: 1,
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: colors.feedback.dangerSoft,
    borderColor: colors.brand.pinkSoft,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  stateIconInfo: {
    backgroundColor: "rgba(207,226,252,0.6)",
    borderColor: colors.brand.blueSoft,
  },
  stateIconWarning: {
    backgroundColor: colors.feedback.warningSoft,
    borderColor: "#F3DFB5",
  },
  unavailableBody: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 320,
    textAlign: "center",
  },
  unavailableCard: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 156,
    minWidth: 260,
    padding: spacing.lg,
  },
  unavailableCardTall: { minHeight: 358 },
  unavailableTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
