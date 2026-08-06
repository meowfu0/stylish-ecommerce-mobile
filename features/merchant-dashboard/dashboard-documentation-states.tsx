import { StyleSheet, useWindowDimensions, View } from "react-native";

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
import { DashboardOverviewContent } from "@/features/merchant-dashboard/dashboard-overview-content";
import { SalesPerformance } from "@/features/merchant-dashboard/dashboard-overview-sections";
import { MerchantSidebar } from "@/features/merchant-dashboard/merchant-sidebar";

export function DashboardStatesSection() {
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const paired = width >= 1024;

  return (
    <DocumentationSection
      description="Nine reachable states use the real overview, shared fixtures, and production state components."
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
            <DashboardOverviewContent
              compactMetrics={width < 1280}
              compactOrders={width < 1024}
              mobile={mobile}
              onRetry={() => undefined}
              onSignInAgain={() => undefined}
              paired={paired}
              session={documentationMerchantSession}
              state={frame.state}
            />
          </DocumentationFrame>
        ))}
      </View>
    </DocumentationSection>
  );
}

export function ChartEmptyStateSection() {
  return (
    <DocumentationSection
      description="Axes, labels, cadence controls, and legend remain visible without inventing a zero-value trend."
      title="Chart empty state"
    >
      <DocumentationFrame
        description="The chart keeps its orientation controls while the plot explains why data is absent."
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
});
