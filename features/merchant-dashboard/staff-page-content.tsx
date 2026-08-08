import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  DashboardCard,
  DashboardIcon,
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
  StaffSectionKey,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  emptyReportFilters,
  type ReportFilters,
  ReportsContent,
} from "@/features/merchant-dashboard/reports-sections";
import type { StaffMember } from "@/features/merchant-dashboard/staff-reports-demo-data";
import {
  EditRoleModal,
  InviteStaffModal,
  PermissionsDialog,
  StaffContent,
} from "@/features/merchant-dashboard/staff-sections";
import {
  emptyStaffFilters,
  filterStaff,
  type StaffFilters,
  useStaffReports,
} from "@/features/merchant-dashboard/use-staff-reports";

/**
 * The Staff & Permissions and Reports workspaces, rendered inside the existing
 * dashboard shell.
 *
 * Loading, filters and the demo mutations live here so there is one owner:
 * inviting a member or changing a role updates the rows the page is showing,
 * and the owner guards see the whole team rather than one page of it.
 */

export const staffSectionLabels: Record<StaffSectionKey, string> = {
  reports: "Reports",
  "staff-permissions": "Staff & Permissions",
};

export function StaffPageContent({
  compact,
  deniedSection,
  onContactSupport,
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
  onReturnToOverview?: () => void;
  onReviewMerchantProfile?: () => void;
  onSignInAgain?: () => void | Promise<void>;
  paired: boolean;
  requiredPermission?: Permission;
  resolveState: (dataState: DashboardDataState) => DashboardState;
  section: StaffSectionKey;
  session: MerchantSession;
}) {
  const [staffFilters, setStaffFilters] =
    useState<StaffFilters>(emptyStaffFilters);
  const [reportFilters, setReportFilters] =
    useState<ReportFilters>(emptyReportFilters);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [viewing, setViewing] = useState<StaffMember | null>(null);
  const [exported, setExported] = useState(false);

  const workspace = useStaffReports({ enabled: true });
  const state = resolveState(workspace.dataState);

  const visibleStaff = useMemo(
    () => filterStaff(workspace.staff, staffFilters),
    [staffFilters, workspace.staff],
  );

  if (state === "loading") {
    return <StaffLoadingState compact={compact} section={section} />;
  }

  const renderPage = ["ready", "partial", "refreshing"].includes(state);

  return (
    <View style={styles.column}>
      <DashboardStateBanner
        failedSections={[]}
        onRetry={workspace.retry}
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

      {renderPage ? (
        section === "staff-permissions" ? (
          <StaffContent
            compact={compact}
            filters={staffFilters}
            onAction={(member, action) =>
              action === "remove"
                ? workspace.removeStaff(member.id)
                : workspace.staffAction(member.id, action)
            }
            onEditRole={setEditing}
            onFiltersChange={setStaffFilters}
            onInvite={() => setInviteOpen(true)}
            onViewPermissions={setViewing}
            session={session}
            staff={workspace.staff}
            visibleStaff={visibleStaff}
          />
        ) : workspace.reports ? (
          <ReportsContent
            compact={compact}
            filters={reportFilters}
            onExport={() => setExported(true)}
            onFiltersChange={setReportFilters}
            reports={workspace.reports}
            session={session}
          />
        ) : null
      ) : null}

      {exported ? (
        <View style={styles.exportNotice} testID="reports-export-notice">
          <DashboardIcon
            color={colors.feedback.info}
            name="information-outline"
            size={16}
          />
          <StylishText style={styles.exportText} unstyled variant="caption">
            Export is a placeholder: there is no report service to generate a
            file yet, so nothing was downloaded.
          </StylishText>
        </View>
      ) : null}

      <InviteStaffModal
        onClose={() => setInviteOpen(false)}
        onInvite={workspace.inviteStaff}
        staff={workspace.staff}
        visible={inviteOpen}
      />

      <EditRoleModal
        member={editing}
        onClose={() => setEditing(null)}
        onSave={(member, role) => workspace.updateRole(member.id, role)}
        staff={workspace.staff}
        visible={editing !== null}
      />

      <PermissionsDialog member={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}

/**
 * Loading placeholder. Built from the dimensions the real pages use — the
 * heading's padding and divider, the tile grid, the demo notice, the 44px filter
 * controls and the pagination footer — so the layout does not move when the rows
 * arrive.
 */
export function StaffLoadingState({
  compact,
  section,
}: {
  compact: boolean;
  section: StaffSectionKey;
}) {
  const staff = section === "staff-permissions";

  return (
    <View
      accessibilityLabel={`Loading ${staffSectionLabels[section]}.`}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      style={styles.column}
      testID={`staff-state-loading-${section}`}
    >
      <DashboardCard>
        <SkeletonHeading action={!staff} />
        <View style={styles.skeletonTileGrid}>
          {Array.from({ length: 4 }, (_value, index) => (
            <View key={index} style={styles.skeletonTile}>
              <DashboardSkeleton style={styles.skeletonTileLabel} />
              <DashboardSkeleton style={styles.skeletonTileValue} />
            </View>
          ))}
        </View>
      </DashboardCard>

      <DashboardCard>
        <SkeletonHeading action={staff} />
        <View style={styles.skeletonNotice} />
        <View style={styles.skeletonControls}>
          {Array.from({ length: staff ? 3 : 2 }, (_value, index) => (
            <View key={index} style={styles.skeletonField}>
              <DashboardSkeleton style={styles.skeletonFieldLabel} />
              <DashboardSkeleton style={styles.skeletonControl} />
            </View>
          ))}
        </View>
        <View style={compact ? styles.skeletonCards : styles.skeletonRows}>
          {!compact && staff ? (
            <View style={[styles.skeletonRow, styles.skeletonHeaderRow]} />
          ) : null}
          {Array.from({ length: staff ? 8 : 4 }, (_value, index) =>
            compact ? (
              <DashboardSkeleton key={index} style={styles.skeletonCardBlock} />
            ) : (
              <View key={index} style={styles.skeletonRow}>
                <DashboardSkeleton style={styles.skeletonRowLine} />
              </View>
            ),
          )}
        </View>
        {staff ? (
          <View style={styles.skeletonPagination}>
            <DashboardSkeleton style={styles.skeletonPageLabel} />
            <DashboardSkeleton style={styles.skeletonPageButtons} />
          </View>
        ) : null}
      </DashboardCard>
    </View>
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
  exportNotice: {
    alignItems: "flex-start",
    backgroundColor: colors.feedback.infoSoft,
    borderColor: colors.brand.blueSoft,
    borderRadius: borderRadius.md,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  exportText: {
    color: colors.feedback.info,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  skeletonAction: { borderRadius: borderRadius.input, height: 44, width: 148 },
  skeletonCardBlock: { borderRadius: borderRadius.md, height: 132 },
  skeletonCards: { gap: spacing.sm, paddingHorizontal: spacing.md },
  skeletonControl: { borderRadius: borderRadius.input, height: 44 },
  skeletonControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  skeletonDescription: { height: 18, maxWidth: 260, width: "70%" },
  skeletonField: {
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing.xxs,
    minWidth: 168,
  },
  skeletonFieldLabel: { height: 16, width: 72 },
  skeletonHeaderRow: { backgroundColor: colors.neutral[50] },
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
  // Mirrors the demo notice the real pages render above their filters.
  skeletonNotice: {
    backgroundColor: colors.neutral[150],
    borderRadius: borderRadius.input,
    height: 42,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  skeletonPageButtons: {
    borderRadius: borderRadius.input,
    height: 44,
    width: 210,
  },
  skeletonPageLabel: { height: 12, width: 96 },
  skeletonPagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  skeletonRow: {
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    height: 52,
    justifyContent: "center",
  },
  skeletonRowLine: { height: 12, width: "100%" },
  skeletonRows: { paddingHorizontal: spacing.lg },
  skeletonTile: {
    borderColor: "transparent",
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexBasis: 150,
    flexGrow: 1,
    gap: spacing.xxs,
    minWidth: 150,
    padding: spacing.sm,
  },
  skeletonTileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  skeletonTileLabel: { height: 16, width: "70%" },
  skeletonTileValue: { height: 24, width: "45%" },
  skeletonTitle: { height: 24, maxWidth: 180, width: "45%" },
});
