import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  type DashboardIconName,
} from "@/features/merchant-dashboard/dashboard-primitives";
import type { DashboardState } from "@/features/merchant-dashboard/dashboard-types";
import { signOutCurrentSession } from "@/services/auth/auth-session";

export function DashboardStateBanner({ state }: { state: DashboardState }) {
  if (state !== "degraded" && state !== "partial") return null;

  const partial = state === "partial";
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        partial ? styles.bannerWarning : styles.bannerInfo,
      ]}
    >
      <DashboardIcon
        color={partial ? colors.feedback.warning : colors.feedback.info}
        name={partial ? "alert-outline" : "clock-outline"}
      />
      <View style={styles.bannerCopy}>
        <StylishText style={styles.bannerTitle} unstyled variant="label">
          {partial
            ? "Some items need attention"
            : "Recent data is still catching up"}
        </StylishText>
        <StylishText style={styles.bannerBody} unstyled variant="caption">
          {partial
            ? "Low-stock warnings are available, while sales history is not ready for this range."
            : "Some figures may be a few minutes behind. You can continue working safely."}
        </StylishText>
      </View>
    </View>
  );
}

export function DashboardBlockingState({
  onRetry,
  state,
}: {
  onRetry?: () => void;
  state: DashboardState;
}) {
  const router = useRouter();

  if (state === "ready" || state === "partial" || state === "degraded") {
    return null;
  }
  if (state === "loading") return <DashboardLoadingState />;

  const config = {
    empty: {
      body: "Start with your merchant profile, first product, and opening stock. Live performance appears after your first orders.",
      icon: "store-plus-outline" as DashboardIconName,
      title: "Let’s get your store ready",
    },
    error: {
      body: "We couldn’t load the merchant overview. Your data is safe. Check your connection and try again.",
      icon: "cloud-alert-outline" as DashboardIconName,
      title: "Dashboard unavailable",
    },
    "permission-denied": {
      body: "You don’t have permission to view this section. Ask the merchant owner if your responsibilities have changed.",
      icon: "shield-lock-outline" as DashboardIconName,
      title: "Access restricted",
    },
    "session-expired": {
      body: "Your secure session ended. Sign in again to continue to this workspace.",
      icon: "timer-lock-outline" as DashboardIconName,
      title: "Session expired",
    },
    suspended: {
      body: "This merchant workspace is currently suspended. Storefront publishing and commerce actions are unavailable until the account review is complete.",
      icon: "store-alert-outline" as DashboardIconName,
      title: "Merchant workspace suspended",
    },
  }[state];

  if (!config) return null;

  const signInAgain = async () => {
    await signOutCurrentSession();
    router.replace("/sign-in");
  };

  return (
    <View style={styles.blockingContainer} testID={`dashboard-state-${state}`}>
      <DashboardCard style={styles.blockingCard}>
        <View
          style={[
            styles.stateIcon,
            state === "suspended" && styles.stateIconWarning,
          ]}
        >
          <DashboardIcon
            color={
              state === "suspended"
                ? colors.feedback.warning
                : colors.feedback.danger
            }
            name={config.icon}
            size={30}
          />
        </View>
        <View style={styles.blockingCopy}>
          <StylishText
            accessibilityRole="header"
            style={styles.blockingTitle}
            unstyled
            variant="headingMedium"
          >
            {config.title}
          </StylishText>
          <StylishText style={styles.blockingBody} unstyled variant="bodySmall">
            {config.body}
          </StylishText>
        </View>

        {state === "empty" ? (
          <View style={styles.setupList}>
            <SetupStep
              icon="store-cog-outline"
              label="Complete merchant profile"
              step="1"
            />
            <SetupStep
              icon="tag-plus-outline"
              label="Create your first product"
              step="2"
            />
            <SetupStep
              icon="cube-outline"
              label="Add opening inventory"
              step="3"
            />
          </View>
        ) : null}

        <View style={styles.blockingActions}>
          {state === "error" ? (
            <DashboardButton
              icon="refresh"
              label="Try Again"
              onPress={onRetry}
              tone="primary"
            />
          ) : null}
          {state === "session-expired" ? (
            <DashboardButton
              icon="login"
              label="Sign In Again"
              onPress={() => void signInAgain()}
              tone="primary"
            />
          ) : null}
          {state === "permission-denied" ? (
            <>
              <DashboardButton label="Return to Overview" tone="primary" />
              <DashboardButton label="Contact Merchant Owner" />
            </>
          ) : null}
          {state === "empty" ? (
            <>
              <DashboardButton
                icon="plus"
                label="Create Product"
                tone="primary"
              />
              <DashboardButton label="Complete Merchant Profile" />
            </>
          ) : null}
          {state === "suspended" ? (
            <DashboardButton icon="lifebuoy" label="Contact Support" />
          ) : null}
        </View>
      </DashboardCard>
    </View>
  );
}

function SetupStep({
  icon,
  label,
  step,
}: {
  icon: DashboardIconName;
  label: string;
  step: string;
}) {
  return (
    <Pressable accessibilityRole="button" style={styles.setupStep}>
      <View style={styles.setupNumber}>
        <StylishText style={styles.setupNumberText} unstyled variant="caption">
          {step}
        </StylishText>
      </View>
      <DashboardIcon name={icon} />
      <StylishText style={styles.setupLabel} unstyled variant="label">
        {label}
      </StylishText>
      <DashboardIcon name="arrow-right" size={16} />
    </Pressable>
  );
}

function DashboardLoadingState() {
  return (
    <View
      accessibilityLabel="Loading your merchant dashboard."
      accessibilityLiveRegion="polite"
      style={styles.loadingLayout}
      testID="dashboard-state-loading"
    >
      <View style={[styles.skeleton, styles.skeletonHero]} />
      <View style={styles.skeletonRow}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={[styles.skeleton, styles.skeletonMetric]} />
        ))}
      </View>
      <View style={styles.skeletonPair}>
        <View style={[styles.skeleton, styles.skeletonLarge]} />
        <View style={[styles.skeleton, styles.skeletonLarge]} />
      </View>
      <View style={[styles.skeleton, styles.skeletonTable]} />
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
    padding: spacing.md,
  },
  bannerBody: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  bannerCopy: { flex: 1, gap: spacing.xxs },
  bannerInfo: {
    backgroundColor: colors.feedback.infoSoft,
    borderColor: colors.brand.blueSoft,
  },
  bannerTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
  },
  bannerWarning: {
    backgroundColor: colors.feedback.warningSoft,
    borderColor: colors.feedback.warningSoft,
  },
  blockingActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  blockingBody: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  blockingCard: {
    alignItems: "center",
    gap: spacing.lg,
    maxWidth: 680,
    padding: spacing.xl,
    width: "100%",
  },
  blockingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 520,
    padding: spacing.lg,
  },
  blockingCopy: { alignItems: "center", gap: spacing.xs, maxWidth: 520 },
  blockingTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 24,
    letterSpacing: -0.24,
    lineHeight: 32,
    textAlign: "center",
  },
  loadingLayout: { gap: spacing.lg },
  setupLabel: {
    color: colors.ink.primary,
    flex: 1,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
  },
  setupList: { gap: spacing.xs, maxWidth: 460, width: "100%" },
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
  setupStep: {
    alignItems: "center",
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.sm,
  },
  skeleton: {
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    opacity: 0.7,
  },
  skeletonHero: { height: 166 },
  skeletonLarge: { flex: 1, height: 420, minWidth: 260 },
  skeletonMetric: { flex: 1, height: 150, minWidth: 180 },
  skeletonPair: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  skeletonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  skeletonTable: { height: 480 },
  stateIcon: {
    alignItems: "center",
    backgroundColor: colors.feedback.dangerSoft,
    borderRadius: borderRadius.pill,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  stateIconWarning: { backgroundColor: colors.feedback.warningSoft },
});
