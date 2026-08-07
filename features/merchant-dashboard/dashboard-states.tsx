import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  type DashboardIconName,
  DashboardSkeleton,
} from "@/features/merchant-dashboard/dashboard-primitives";
import type {
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

export function DashboardStateBanner({ state }: { state: DashboardState }) {
  if (state !== "partial" && state !== "refreshing") return null;

  const partial = state === "partial";
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        partial ? styles.bannerInfo : styles.bannerWarning,
      ]}
      testID={`dashboard-state-${state}`}
    >
      <DashboardIcon
        color={partial ? colors.feedback.info : colors.feedback.warning}
        name={partial ? "information-outline" : "cloud-sync-outline"}
      />
      <View style={styles.bannerCopy}>
        <StylishText
          style={[styles.bannerTitle, !partial && styles.bannerTitleWarning]}
          unstyled
          variant="label"
        >
          {partial
            ? "12 variants need restocking before your next campaign"
            : "Some figures may be a few minutes behind"}
        </StylishText>
        <StylishText
          style={[styles.bannerBody, !partial && styles.bannerBodyWarning]}
          unstyled
          variant="caption"
        >
          {partial
            ? "Sales history is still building, so trends will sharpen as more orders come in."
            : "We’re refreshing your performance data in the background. Orders and inventory actions still work normally."}
        </StylishText>
      </View>
    </View>
  );
}

export function DashboardBlockingState({
  deniedSection = "This section",
  requiredPermission,
  session,
  state,
  ...actions
}: StateActions & {
  deniedSection?: string;
  requiredPermission?: Permission;
  session: MerchantSession;
  state: DashboardState;
}) {
  const router = useRouter();

  if (state === "ready" || state === "partial" || state === "refreshing") {
    return null;
  }
  if (state === "loading") return <DashboardLoadingState />;
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
      body: "Selling is paused for this merchant, so the storefront and new orders are unavailable. The Stylish partner team can walk you through what’s needed to reactivate.",
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

function SkeletonLines({ widths }: { widths: (number | `${number}%`)[] }) {
  return (
    <View style={styles.skeletonLines}>
      {widths.map((width, index) => (
        <DashboardSkeleton key={`${width}-${index}`} style={{ width }} />
      ))}
    </View>
  );
}

export function DashboardLoadingState() {
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
      <DashboardCard style={styles.skeletonHeroCard}>
        <SkeletonLines widths={[160, 260, 320]} />
      </DashboardCard>
      <View style={styles.skeletonRow}>
        {[0, 1, 2, 3].map((item) => (
          <DashboardCard key={item} style={styles.skeletonMetricCard}>
            <SkeletonLines widths={[90, 140, "100%"]} />
          </DashboardCard>
        ))}
      </View>
      <View style={styles.skeletonPair}>
        {[0, 1].map((item) => (
          <DashboardCard key={item} style={styles.skeletonLargeCard}>
            <SkeletonLines widths={[item === 0 ? 150 : 130, "100%"]} />
          </DashboardCard>
        ))}
      </View>
      <DashboardCard style={styles.skeletonTableCard}>
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
  bannerCopy: { flex: 1, gap: spacing.xxs, minWidth: 0 },
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
  loadingLayout: { gap: spacing.md, width: "100%" },
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
  skeletonHeroCard: {
    height: 144,
    justifyContent: "center",
    padding: spacing.lg,
  },
  skeletonLargeCard: {
    flex: 1,
    height: 358,
    minWidth: 260,
    padding: spacing.lg,
  },
  skeletonLines: { gap: spacing.sm, width: "100%" },
  skeletonMetricCard: {
    flex: 1,
    height: 156,
    minWidth: 180,
    padding: spacing.lg,
  },
  skeletonPair: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  skeletonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  skeletonTableCard: { height: 392, padding: spacing.lg },
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
});
