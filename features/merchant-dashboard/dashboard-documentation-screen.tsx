import { type Href, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import { SalesPerformance } from "@/features/merchant-dashboard/dashboard-overview-sections";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  type DashboardIconName,
} from "@/features/merchant-dashboard/dashboard-primitives";
import {
  DASHBOARD_STATES,
  type DashboardState,
  type MerchantRole,
  type MerchantSession,
  type Permission,
} from "@/features/merchant-dashboard/dashboard-types";
import { MerchantSidebar } from "@/features/merchant-dashboard/merchant-sidebar";

const DOCUMENTATION_SESSION: MerchantSession = {
  defaultLocation: "Lumière Makati Warehouse",
  displayName: "Althea",
  email: "owner@example.com",
  merchantHandle: "documentation-only",
  merchantName: "Lumière",
  permissions: rolePermissions["Merchant Owner"],
  role: "Merchant Owner",
  storeStatus: "active",
  verified: true,
};

const stateDetails: Record<
  DashboardState,
  { icon: DashboardIconName; summary: string }
> = {
  degraded: {
    icon: "clock-outline",
    summary: "Populated overview with a delayed-data notice.",
  },
  empty: {
    icon: "store-plus-outline",
    summary: "Guided merchant setup, never zeroed metrics.",
  },
  error: {
    icon: "cloud-alert-outline",
    summary: "Recoverable service or network failure.",
  },
  loading: {
    icon: "loading",
    summary: "Skeletons mirror the final overview layout.",
  },
  partial: {
    icon: "alert-outline",
    summary: "Available data with warnings and an empty chart.",
  },
  "permission-denied": {
    icon: "shield-lock-outline",
    summary: "No privileged content is rendered.",
  },
  ready: {
    icon: "check-decagram-outline",
    summary: "All permitted overview content is populated.",
  },
  "session-expired": {
    icon: "timer-lock-outline",
    summary: "Safe sign-in-again handoff.",
  },
  suspended: {
    icon: "store-alert-outline",
    summary: "Commerce actions are unavailable during review.",
  },
};

const sidebarStates = [
  { label: "Default", rail: false },
  { demo: "scrolling" as const, label: "Scrolling", rail: false },
  { demo: "hover" as const, label: "Thumb hover", rail: false },
  { demo: "active" as const, label: "Thumb dragging", rail: false },
  { label: "Short laptop viewport", rail: false, short: true },
  { label: "Collapsed rail", rail: true },
  { label: "Tablet drawer", rail: false },
];

const permissions = rolePermissions["Merchant Owner"];

export function DashboardDocumentationScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        bounces={false}
        className="st-scroll"
        contentContainerStyle={styles.content}
      >
        <View style={styles.intro}>
          <View style={styles.docBadge}>
            <StylishText style={styles.docBadgeText} unstyled variant="eyebrow">
              Design documentation · not user-facing
            </StylishText>
          </View>
          <StylishText
            accessibilityRole="header"
            style={styles.pageTitle}
            unstyled
            variant="headingLarge"
          >
            Merchant dashboard system
          </StylishText>
          <StylishText
            style={styles.pageDescription}
            unstyled
            variant="bodyLarge"
          >
            Reachable application states, sidebar behavior, role permissions,
            responsive rules, and the data-safety contract for the Stylish
            merchant workspace.
          </StylishText>
          <DashboardButton
            label="Return to Dashboard"
            onPress={() => router.replace("/merchant/dashboard" as Href)}
            tone="primary"
          />
        </View>

        <DocumentationSection
          description="Each frame opens the real dashboard shell with that state active."
          title="Nine dashboard states"
        >
          <View style={styles.stateGrid}>
            {DASHBOARD_STATES.map((state) => (
              <DashboardCard key={state} style={styles.stateCard}>
                <View style={styles.stateIcon}>
                  <DashboardIcon
                    color={
                      state === "ready"
                        ? colors.feedback.success
                        : state === "partial" || state === "suspended"
                          ? colors.feedback.warning
                          : colors.feedback.info
                    }
                    name={stateDetails[state].icon}
                    size={24}
                  />
                </View>
                <StylishText
                  style={styles.stateTitle}
                  unstyled
                  variant="headingSmall"
                >
                  {state
                    .split("-")
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(" ")}
                </StylishText>
                <StylishText
                  style={styles.stateSummary}
                  unstyled
                  variant="caption"
                >
                  {stateDetails[state].summary}
                </StylishText>
                <DashboardButton
                  label="Open full frame"
                  onPress={() =>
                    router.push({
                      params: { previewState: state },
                      pathname: "/merchant/dashboard",
                    } as unknown as Href)
                  }
                />
              </DashboardCard>
            ))}
          </View>
        </DocumentationSection>

        <DocumentationSection
          description="The sales panel uses a guided empty state rather than a flat zero line."
          title="Chart empty state"
        >
          <View style={styles.chartDoc}>
            <SalesPerformance empty />
          </View>
        </DocumentationSection>

        <DocumentationSection
          description="The scroll demo classes exist only on this documentation screen."
          title="Seven sidebar scrolling states"
        >
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.sidebarGallery}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {sidebarStates.map((state) => (
              <View key={state.label} style={styles.sidebarFrame}>
                <StylishText
                  style={styles.sidebarFrameLabel}
                  unstyled
                  variant="label"
                >
                  {state.label}
                </StylishText>
                <View
                  style={[
                    styles.sidebarViewport,
                    state.short && styles.sidebarViewportShort,
                    state.rail && styles.sidebarViewportRail,
                  ]}
                >
                  <MerchantSidebar
                    documentationScrollDemo={state.demo}
                    onToggleRail={() => undefined}
                    rail={state.rail}
                    session={DOCUMENTATION_SESSION}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        </DocumentationSection>

        <DocumentationSection
          description="Roles are resolved by the backend and are never selectable in the product."
          title="Role × permission matrix"
        >
          <ScrollView bounces={false} horizontal>
            <View style={styles.permissionTable}>
              <View style={styles.permissionRow}>
                <MatrixCell label="Role" strong wide />
                {permissions.map((permission) => (
                  <MatrixCell key={permission} label={permission} />
                ))}
              </View>
              {(Object.keys(rolePermissions) as MerchantRole[]).map((role) => (
                <View key={role} style={styles.permissionRow}>
                  <MatrixCell label={role} strong wide />
                  {permissions.map((permission) => (
                    <MatrixPermission
                      allowed={rolePermissions[role].includes(permission)}
                      key={permission}
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </DocumentationSection>

        <View style={styles.docPair}>
          <DocumentationSection title="Navigation model">
            <BulletList
              items={[
                "Fixed brand and workspace region",
                "One independently scrolling navigation region",
                "Fixed utility and sign-out region",
                "272px expanded, 84px rail, drawer below 1024px",
              ]}
            />
          </DocumentationSection>
          <DocumentationSection title="Responsive breakpoints">
            <BulletList
              items={[
                "1440+: expanded sidebar and multi-column overview",
                "1280–1399: icon rail for compact laptops",
                "768–1023: drawer navigation and compact order cards",
                "Below 768: single column and metric carousel",
                "1536+: docked notification rail",
              ]}
            />
          </DocumentationSection>
        </View>

        <DocumentationSection title="Applied data and security rules">
          <BulletList
            items={[
              "Merchant and role context comes only from the authenticated backend response.",
              "No user can type a merchant ID or invent a role.",
              "Money remains integer Philippine centavos until formatted at render.",
              "Order rows omit addresses, contacts, credentials, and payment details.",
              "Activity entries are sanitized summaries, not raw audit payloads.",
              "Inventory movement internals never appear on the overview.",
              "Permissions hide unreadable sections and disable unavailable actions.",
            ]}
          />
        </DocumentationSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function DocumentationSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionCopy}>
        <StylishText
          style={styles.sectionTitle}
          unstyled
          variant="headingMedium"
        >
          {title}
        </StylishText>
        {description ? (
          <StylishText
            style={styles.sectionDescription}
            unstyled
            variant="bodySmall"
          >
            {description}
          </StylishText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function MatrixCell({
  label,
  strong = false,
  wide = false,
}: {
  label: Permission | string;
  strong?: boolean;
  wide?: boolean;
}) {
  return (
    <View style={[styles.matrixCell, wide && styles.matrixCellWide]}>
      <StylishText
        style={[styles.matrixLabel, strong && styles.matrixLabelStrong]}
        unstyled
        variant="caption"
      >
        {label}
      </StylishText>
    </View>
  );
}

function MatrixPermission({ allowed }: { allowed: boolean }) {
  return (
    <View style={styles.matrixCell}>
      <DashboardIcon
        color={allowed ? colors.feedback.success : colors.neutral[400]}
        name={allowed ? "check-circle-outline" : "minus-circle-outline"}
      />
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={styles.bullet} />
          <StylishText style={styles.bulletText} unstyled variant="bodySmall">
            {item}
          </StylishText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bullet: {
    backgroundColor: colors.brand.primary,
    borderRadius: borderRadius.pill,
    height: 7,
    marginTop: spacing.xs,
    width: 7,
  },
  bulletList: { gap: spacing.xs },
  bulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  bulletText: {
    color: colors.neutral[550],
    flex: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 21,
  },
  chartDoc: { maxWidth: 760 },
  content: {
    alignSelf: "center",
    gap: spacing.xxl,
    maxWidth: 1400,
    padding: spacing.xl,
    width: "100%",
  },
  docBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand.socialSurface,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  docBadgeText: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 16,
  },
  docPair: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xl },
  intro: { alignItems: "flex-start", gap: spacing.md, maxWidth: 820 },
  matrixCell: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    borderRightColor: colors.neutral[200],
    borderRightWidth: 1,
    justifyContent: "center",
    minHeight: 58,
    padding: spacing.xs,
    width: 132,
  },
  matrixCellWide: { alignItems: "flex-start", width: 210 },
  matrixLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
  },
  matrixLabelStrong: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    textAlign: "left",
  },
  page: { backgroundColor: colors.neutral[50], flex: 1 },
  pageDescription: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    lineHeight: 26,
  },
  pageTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 36,
    letterSpacing: -0.8,
    lineHeight: 44,
  },
  permissionRow: { flexDirection: "row" },
  permissionTable: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderLeftWidth: 1,
    borderRadius: borderRadius.md,
    borderTopWidth: 1,
    overflow: "hidden",
  },
  section: { flex: 1, gap: spacing.md, minWidth: 300 },
  sectionCopy: { gap: spacing.xs },
  sectionDescription: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 21,
  },
  sectionTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 22,
    letterSpacing: -0.24,
    lineHeight: 30,
  },
  sidebarFrame: { gap: spacing.sm },
  sidebarFrameLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
  },
  sidebarGallery: { gap: spacing.lg, paddingRight: spacing.xl },
  sidebarViewport: {
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    height: 720,
    overflow: "hidden",
    width: 272,
  },
  sidebarViewportRail: { width: 84 },
  sidebarViewportShort: { height: 560 },
  stateCard: {
    flexBasis: 260,
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 240,
    padding: spacing.lg,
  },
  stateGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  stateIcon: {
    alignItems: "center",
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.input,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  stateSummary: {
    color: colors.neutral[550],
    flex: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 19,
  },
  stateTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 17,
    lineHeight: 23,
  },
});
