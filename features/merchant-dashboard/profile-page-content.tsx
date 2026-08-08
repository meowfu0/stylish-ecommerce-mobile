import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  DashboardCard,
  DashboardSkeleton,
} from "@/features/merchant-dashboard/dashboard-primitives";
import {
  DashboardBlockingState,
  DashboardStateBanner,
} from "@/features/merchant-dashboard/dashboard-states";
import type {
  DashboardDataState,
  DashboardState,
  MerchantSession,
  Permission,
  ProfileSectionKey,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  EditProfileModal,
  PendingIntegrationDialog,
  ProfileContent,
  SettingsContent,
} from "@/features/merchant-dashboard/profile-settings-sections";
import { useProfileSettings } from "@/features/merchant-dashboard/use-profile-settings";

/**
 * The Merchant Profile and Settings workspaces, rendered inside the existing
 * dashboard shell.
 *
 * One hook owns both pages, so a name edited on the profile is the name the
 * settings header shows, and the loading, error and permission states come from
 * the same `resolveState` the rest of the dashboard uses.
 */

export const profileSectionLabels: Record<ProfileSectionKey, string> = {
  "merchant-profile": "Merchant Profile",
  settings: "Settings",
};

export function ProfilePageContent({
  compact,
  deniedSection,
  onContactSupport,
  onOpenProfile,
  onReturnToOverview,
  onReviewMerchantProfile,
  onSignInAgain,
  paired,
  requiredPermission,
  resolveState,
  section,
  session,
}: {
  compact: boolean;
  deniedSection?: string;
  onContactSupport?: () => void;
  onOpenProfile?: () => void;
  onReturnToOverview?: () => void;
  onReviewMerchantProfile?: () => void;
  onSignInAgain?: () => void | Promise<void>;
  paired: boolean;
  requiredPermission?: Permission;
  resolveState: (dataState: DashboardDataState) => DashboardState;
  section: ProfileSectionKey;
  session: MerchantSession;
}) {
  const [editing, setEditing] = useState(false);
  const workspace = useProfileSettings({ enabled: true });
  const state = resolveState(workspace.dataState);

  if (state === "loading") {
    return <ProfileLoadingState compact={compact} section={section} />;
  }

  const renderPage =
    ["ready", "partial", "refreshing"].includes(state) &&
    workspace.profile !== null;

  return (
    <View style={styles.column}>
      <DashboardStateBanner
        failedSections={[]}
        onRetry={workspace.retry}
        sectionLabels={profileSectionLabels}
        state={state}
      />
      <DashboardBlockingState
        deniedSection={deniedSection}
        onContactSupport={onContactSupport}
        onRetry={workspace.retry}
        onReturnToOverview={onReturnToOverview}
        onReviewMerchantProfile={onReviewMerchantProfile}
        onSignInAgain={onSignInAgain}
        paired={paired}
        requiredPermission={requiredPermission}
        session={session}
        state={state}
      />

      {renderPage && workspace.profile ? (
        section === "merchant-profile" ? (
          <ProfileContent
            compact={compact}
            onEdit={() => setEditing(true)}
            profile={workspace.profile}
            session={session}
          />
        ) : workspace.security ? (
          <SettingsContent
            compact={compact}
            notifications={workspace.notifications}
            onOpenProfile={() => onOpenProfile?.()}
            onPending={workspace.setPending}
            onPreferenceChange={workspace.setPreference}
            onToggleNotification={workspace.toggleNotification}
            preferences={workspace.preferences}
            security={workspace.security}
            session={session}
          />
        ) : null
      ) : null}

      <EditProfileModal
        onClose={() => setEditing(false)}
        onSave={workspace.saveProfile}
        profile={workspace.profile}
        visible={editing}
      />

      <PendingIntegrationDialog
        onClose={() => workspace.setPending(null)}
        pending={workspace.pending}
      />
    </View>
  );
}

/**
 * Loading placeholder.
 *
 * The geometry is taken from the loaded pages rather than guessed: the heading's
 * padding and divider, the 44px primary action, the 64px avatar block, the same
 * detail-tile grid, and — on Settings — the demo notice and the 44px rows the
 * toggles and selects occupy. Profile reserves four cards and Settings five,
 * which is what each page actually renders.
 */
export function ProfileLoadingState({
  compact,
  section,
}: {
  compact: boolean;
  section: ProfileSectionKey;
}) {
  const profile = section === "merchant-profile";

  return (
    <View
      accessibilityLabel={`Loading ${profileSectionLabels[section]}.`}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      style={styles.column}
      testID={`profile-state-loading-${section}`}
    >
      <DashboardCard>
        <SkeletonHeading action={profile} />
        {profile ? (
          <View style={styles.skeletonIdentity}>
            <DashboardSkeleton style={styles.skeletonAvatar} />
            <View style={styles.skeletonIdentityCopy}>
              <DashboardSkeleton style={styles.skeletonStoreName} />
              <DashboardSkeleton style={styles.skeletonHandle} />
              <DashboardSkeleton style={styles.skeletonChips} />
            </View>
          </View>
        ) : (
          <View style={styles.skeletonNotice} />
        )}
      </DashboardCard>

      {profile ? (
        <>
          <SkeletonDetailCard compact={compact} />
          <SkeletonDetailCard compact={compact} />
          <DashboardCard>
            <SkeletonHeading />
            <View style={styles.skeletonBody}>
              <DashboardSkeleton style={styles.skeletonLine} />
              <DashboardSkeleton style={styles.skeletonLineShort} />
            </View>
          </DashboardCard>
        </>
      ) : (
        <>
          <DashboardCard>
            <SkeletonHeading action />
            <View style={styles.skeletonBody}>
              {Array.from({ length: 4 }, (_value, index) => (
                <DashboardSkeleton key={index} style={styles.skeletonRow} />
              ))}
            </View>
          </DashboardCard>
          <DashboardCard>
            <SkeletonHeading />
            <View style={styles.skeletonBody}>
              {Array.from({ length: 5 }, (_value, index) => (
                <DashboardSkeleton key={index} style={styles.skeletonRow} />
              ))}
            </View>
          </DashboardCard>
          <DashboardCard>
            <SkeletonHeading />
            <View style={styles.skeletonBody}>
              <View
                style={[
                  styles.skeletonControls,
                  compact && styles.skeletonControlsStacked,
                ]}
              >
                {Array.from({ length: 4 }, (_value, index) => (
                  <View key={index} style={styles.skeletonField}>
                    <DashboardSkeleton style={styles.skeletonFieldLabel} />
                    <DashboardSkeleton style={styles.skeletonControl} />
                  </View>
                ))}
              </View>
              <DashboardSkeleton style={styles.skeletonRow} />
            </View>
          </DashboardCard>
          <DashboardCard>
            <SkeletonHeading />
            <View style={styles.skeletonBody}>
              {Array.from({ length: 3 }, (_value, index) => (
                <DashboardSkeleton key={index} style={styles.skeletonRow} />
              ))}
              <DashboardSkeleton style={styles.skeletonControl} />
            </View>
          </DashboardCard>
          <DashboardCard style={styles.skeletonDangerCard}>
            <SkeletonHeading />
            <View style={styles.skeletonBody}>
              <DashboardSkeleton style={styles.skeletonNoticeBlock} />
              <DashboardSkeleton style={styles.skeletonControl} />
            </View>
          </DashboardCard>
        </>
      )}
    </View>
  );
}

function SkeletonDetailCard({ compact }: { compact: boolean }) {
  return (
    <DashboardCard>
      <SkeletonHeading />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonDetailGrid}>
          {Array.from({ length: 4 }, (_value, index) => (
            <View
              key={index}
              style={[
                styles.skeletonDetail,
                compact && styles.skeletonDetailStacked,
              ]}
            >
              <DashboardSkeleton style={styles.skeletonDetailLabel} />
              <DashboardSkeleton style={styles.skeletonDetailValue} />
            </View>
          ))}
        </View>
      </View>
    </DashboardCard>
  );
}

function SkeletonHeading({ action = false }: { action?: boolean }) {
  return (
    <View style={styles.skeletonHeading}>
      <View style={styles.skeletonHeadingCopy}>
        <DashboardSkeleton style={styles.skeletonTitle} />
        <DashboardSkeleton style={styles.skeletonDescription} />
      </View>
      {action ? <DashboardSkeleton style={styles.skeletonAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: 20, minWidth: 0, width: "100%" },
  skeletonAction: { borderRadius: borderRadius.input, height: 44, width: 148 },
  skeletonAvatar: { borderRadius: borderRadius.md, height: 64, width: 64 },
  skeletonBody: { gap: spacing.md, padding: spacing.lg },
  skeletonChips: { height: 22, maxWidth: 240, width: "60%" },
  skeletonControl: { borderRadius: borderRadius.input, height: 44 },
  skeletonControls: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  skeletonControlsStacked: { flexDirection: "column" },
  skeletonDangerCard: { borderColor: colors.feedback.dangerBorder },
  skeletonDescription: { height: 18, maxWidth: 260, width: "70%" },
  skeletonDetail: {
    borderColor: "transparent",
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexBasis: 220,
    flexGrow: 1,
    gap: spacing.xxs,
    minWidth: 220,
    padding: spacing.sm,
  },
  skeletonDetailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  skeletonDetailLabel: { height: 16, width: "55%" },
  skeletonDetailStacked: { flexBasis: "100%", minWidth: 0 },
  skeletonDetailValue: { height: 20, width: "75%" },
  skeletonField: {
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing.xxs,
    minWidth: 168,
  },
  skeletonFieldLabel: { height: 16, width: 72 },
  skeletonHandle: { height: 18, maxWidth: 200, width: "45%" },
  skeletonHeading: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  skeletonHeadingCopy: { flex: 1, gap: spacing.xxs, minWidth: 220 },
  skeletonIdentity: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  skeletonIdentityCopy: {
    flexBasis: 0,
    flexGrow: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  skeletonLine: { height: 21, width: "100%" },
  skeletonLineShort: { height: 21, width: "62%" },
  // Mirrors the demo notice Settings renders under its heading.
  skeletonNotice: {
    backgroundColor: colors.neutral[150],
    borderRadius: borderRadius.input,
    height: 42,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  skeletonNoticeBlock: { borderRadius: borderRadius.input, height: 42 },
  skeletonRow: { borderRadius: borderRadius.input, height: 44 },
  skeletonStoreName: { height: 28, maxWidth: 260, width: "55%" },
  skeletonTitle: { height: 24, maxWidth: 180, width: "45%" },
});
