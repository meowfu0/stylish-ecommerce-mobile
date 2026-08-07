import { StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  dashboardStateFrames,
  sidebarFrames,
} from "@/features/merchant-dashboard/dashboard-documentation-data";
import {
  DocumentationFrame,
  DocumentationSection,
  DocumentationStage,
} from "@/features/merchant-dashboard/dashboard-documentation-primitives";
import { documentationMerchantSession } from "@/features/merchant-dashboard/dashboard-data";
import { SalesPerformance } from "@/features/merchant-dashboard/dashboard-overview-sections";
import {
  DashboardBlockingState,
  DashboardLoadingState,
  DashboardSectionUnavailable,
  DashboardStateBanner,
} from "@/features/merchant-dashboard/dashboard-states";
import type { DashboardState } from "@/features/merchant-dashboard/dashboard-types";
import { MerchantSidebar } from "@/features/merchant-dashboard/merchant-sidebar";

export function DashboardStatesSection() {
  return (
    <DocumentationSection
      description="Eight dashboard states plus the chart-empty state use the same production components shown to merchants."
      title="Dashboard states"
    >
      <View style={styles.stateFrames}>
        {dashboardStateFrames.map((frame) => (
          <DocumentationFrame
            description={frame.note}
            key={frame.id}
            name={`Merchant / Dashboard — ${frame.name}`}
            trigger={frame.trigger}
          >
            <DashboardStatePreview state={frame.state} />
          </DocumentationFrame>
        ))}
      </View>
    </DocumentationSection>
  );
}

function DashboardStatePreview({ state }: { state: DashboardState }) {
  if (state === "loading") return <DashboardLoadingState />;
  if (state === "partial" || state === "refreshing") {
    return (
      <View style={styles.statePreviewStack}>
        <DashboardStateBanner
          failedSections={state === "partial" ? ["sales", "activity"] : []}
          onRetry={state === "partial" ? () => undefined : undefined}
          state={state}
        />
        {state === "partial" ? (
          <DashboardSectionUnavailable
            onRetry={() => undefined}
            section="sales"
            tall
          />
        ) : null}
      </View>
    );
  }

  return (
    <DashboardBlockingState
      deniedSection="Staff & Permissions"
      onContactSupport={() => undefined}
      onCreateProduct={() => undefined}
      onImportCatalog={() => undefined}
      onRetry={() => undefined}
      onReturnToOverview={() => undefined}
      onReviewMerchantProfile={() => undefined}
      onSignInAgain={() => undefined}
      requiredPermission="staff.manage"
      session={documentationMerchantSession}
      state={state}
    />
  );
}

export function ChartEmptyStateSection() {
  return (
    <DocumentationSection
      description="Cadence controls and the legend remain visible without inventing axes, totals, or a zero-value trend."
      title="Chart empty state"
    >
      <DocumentationFrame
        description="The chart keeps its orientation controls while a neutral plot surface explains why data is absent."
        name="Merchant / Sales Performance — Empty data"
      >
        <SalesPerformance empty />
      </DocumentationFrame>
    </DocumentationSection>
  );
}

export function SidebarStatesSection() {
  return (
    <DocumentationSection
      description="The real three-region sidebar renders in fixed-height stages so its navigation genuinely overflows."
      title="Sidebar scrolling states"
    >
      <View style={styles.sidebarGrid}>
        {sidebarFrames.map((frame) => {
          const collapsed = frame.props?.collapsed ?? false;
          const drawer = frame.id === "sidebar-tablet-drawer";
          return (
            <View key={frame.id} style={styles.sidebarSpecimen}>
              <DocumentationFrame description={frame.note} name={frame.name}>
                <View style={styles.sidebarStage}>
                  <DocumentationStage height={frame.height} rail={collapsed}>
                    <MerchantSidebar
                      onClose={drawer ? () => undefined : undefined}
                      onToggleRail={() => undefined}
                      rail={collapsed}
                      scrollDemo={frame.props?.scrollDemo}
                      session={documentationMerchantSession}
                    />
                  </DocumentationStage>
                </View>
                <StylishText
                  style={styles.sidebarThumb}
                  unstyled
                  variant="caption"
                >
                  Thumb: {frame.thumb}
                </StylishText>
              </DocumentationFrame>
            </View>
          );
        })}
      </View>
      <View style={styles.scrollbarNote}>
        <StylishText style={styles.scrollbarText} unstyled variant="bodySmall">
          The visible thumb is 4px and sits about 6px inside the sidebar’s right
          edge. There is no track and there are no arrow buttons. The sidebar
          can never show two vertical scrollbars. Chrome, Edge, and Safari
          receive exact hover and drag colors through the WebKit thumb; Firefox
          uses a thin bar with idle and active tones, but cannot express a
          separate per-thumb hover shade. Keyboard focus uses the primary pink
          thumb.
        </StylishText>
      </View>
    </DocumentationSection>
  );
}

const styles = StyleSheet.create({
  scrollbarNote: {
    backgroundColor: colors.feedback.infoSoft,
    borderColor: colors.brand.blueSoft,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  scrollbarText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  sidebarGrid: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  sidebarSpecimen: { flexBasis: 312, flexGrow: 1, maxWidth: 360, minWidth: 0 },
  sidebarStage: { alignItems: "center", minWidth: 0 },
  sidebarThumb: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  stateFrames: { gap: 40 },
  statePreviewStack: { gap: spacing.md, width: "100%" },
});
