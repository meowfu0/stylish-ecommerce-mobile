import { type Href, useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StylishText } from "@/components/typography/stylish-text";
import { colors, spacing } from "@/constants/design-tokens";
import {
  NavigationModelSection,
  PermissionMatrixSection,
  ResponsiveRulesSection,
} from "@/features/merchant-dashboard/dashboard-documentation-reference";
import {
  ChartEmptyStateSection,
  DashboardStatesSection,
  SidebarStatesSection,
} from "@/features/merchant-dashboard/dashboard-documentation-states";
import { DashboardButton } from "@/features/merchant-dashboard/dashboard-primitives";

export function DashboardDocumentationScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const pagePadding =
    width < 768 ? spacing.md : width < 1024 ? spacing.lg : spacing.xl;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
      <ScrollView
        bounces={false}
        className="st-doc-scope st-scroll"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: width < 768 ? spacing.xxxl : spacing.xxl,
            paddingHorizontal: pagePadding,
          },
        ]}
        style={styles.scroll}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <StylishText style={styles.eyebrow} unstyled variant="eyebrow">
              Merchant workspace — states
            </StylishText>
            <StylishText
              accessibilityRole="header"
              aria-level={1}
              style={[styles.title, width < 768 && styles.titleMobile]}
              unstyled
              variant="headingLarge"
            >
              Merchant dashboard states &amp; permissions
            </StylishText>
            <StylishText style={styles.subtitle} unstyled variant="bodyLarge">
              Design documentation for the Velori merchant workspace. These
              frames are not user-facing screens.
            </StylishText>
            <DashboardButton
              icon="arrow-left"
              label="Back to merchant dashboard"
              onPress={() => router.replace("/merchant/dashboard" as Href)}
            />
          </View>

          <DashboardStatesSection />
          <ChartEmptyStateSection />
          <SidebarStatesSection />
          <PermissionMatrixSection />
          <NavigationModelSection />
          <ResponsiveRulesSection />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: 20,
    maxWidth: 1240,
    minWidth: 0,
    width: "100%",
  },
  eyebrow: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    lineHeight: 18,
    textTransform: "uppercase",
  },
  header: { alignItems: "flex-start", gap: spacing.sm, maxWidth: 760 },
  page: { backgroundColor: colors.neutral[50], flex: 1, minWidth: 0 },
  scroll: { flex: 1, minWidth: 0 },
  scrollContent: { paddingTop: spacing.xl },
  subtitle: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 15,
    lineHeight: 24,
  },
  title: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 40,
    letterSpacing: -0.8,
    lineHeight: 48,
  },
  titleMobile: { fontSize: 30, lineHeight: 38 },
});
