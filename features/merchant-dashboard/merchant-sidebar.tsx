import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { StylishLogo } from "@/components/brand/stylish-logo";
import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { can } from "@/features/merchant-dashboard/dashboard-access";
import {
  DashboardIcon,
  type DashboardIconName,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import type {
  MerchantSession,
  Permission,
} from "@/features/merchant-dashboard/dashboard-types";
import { signOutCurrentSession } from "@/services/auth/auth-session";

type NavItem = {
  badge?: number;
  children?: { badge?: number; label: string }[];
  icon: DashboardIconName;
  label: string;
  permission?: Permission;
};

const NAV_ITEMS: NavItem[] = [
  { icon: "view-dashboard-outline", label: "Overview" },
  {
    children: [
      { badge: 7, label: "Products" },
      { label: "Categories" },
      { label: "Collections" },
      { label: "Brands" },
    ],
    icon: "archive-outline",
    label: "Catalog",
    permission: "products.read",
  },
  {
    children: [
      { label: "Stock Levels" },
      { label: "Locations" },
      { label: "Movements" },
      { badge: 12, label: "Low Stock" },
    ],
    icon: "cube-outline",
    label: "Inventory",
    permission: "inventory.read",
  },
  {
    badge: 18,
    icon: "clipboard-text-outline",
    label: "Orders",
    permission: "orders.read",
  },
  {
    badge: 9,
    icon: "truck-delivery-outline",
    label: "Fulfillment",
    permission: "orders.fulfill",
  },
  {
    icon: "ticket-percent-outline",
    label: "Promotions",
    permission: "promotions.manage",
  },
  {
    badge: 4,
    icon: "message-star-outline",
    label: "Reviews",
    permission: "reviews.moderate",
  },
  {
    icon: "account-group-outline",
    label: "Staff & Permissions",
    permission: "staff.manage",
  },
  {
    icon: "chart-line",
    label: "Reports",
    permission: "reports.read",
  },
  {
    icon: "shield-account-outline",
    label: "Merchant Profile",
    permission: "merchant.profile.update",
  },
  {
    icon: "cog-outline",
    label: "Settings",
    permission: "settings.manage",
  },
];

function CountBadge({ count }: { count: number }) {
  return (
    <View style={styles.countBadge}>
      <StylishText style={styles.countBadgeText} unstyled variant="caption">
        {count}
      </StylishText>
    </View>
  );
}

function SidebarNavItem({ item, rail }: { item: NavItem; rail: boolean }) {
  const active = item.label === "Overview";

  return (
    <View>
      <Pressable
        accessibilityLabel={item.label}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [
          styles.navItem,
          rail && styles.navItemRail,
          active && styles.navItemActive,
          pressed && styles.navItemPressed,
        ]}
      >
        <DashboardIcon
          color={active ? colors.feedback.danger : colors.neutral[550]}
          name={item.icon}
          size={19}
        />
        {!rail ? (
          <StylishText
            numberOfLines={1}
            style={[styles.navLabel, active && styles.navLabelActive]}
            unstyled
            variant="navigation"
          >
            {item.label}
          </StylishText>
        ) : null}
        {!rail && item.badge ? <CountBadge count={item.badge} /> : null}
        {!rail && item.children ? (
          <DashboardIcon name="chevron-up" size={16} />
        ) : null}
      </Pressable>

      {!rail && item.children ? (
        <View style={styles.subnav}>
          {item.children.map((child) => (
            <Pressable
              accessibilityRole="button"
              key={child.label}
              style={({ pressed }) => [
                styles.subnavItem,
                pressed && styles.navItemPressed,
              ]}
            >
              <StylishText
                style={styles.subnavLabel}
                unstyled
                variant="caption"
              >
                {child.label}
              </StylishText>
              {child.badge ? <CountBadge count={child.badge} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function MerchantSidebar({
  documentationScrollDemo,
  onClose,
  onToggleRail,
  rail,
  session,
}: {
  documentationScrollDemo?: "active" | "hover" | "scrolling";
  onClose?: () => void;
  onToggleRail: () => void;
  rail: boolean;
  session: MerchantSession;
}) {
  const router = useRouter();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(
    () => () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    },
    [],
  );

  const noteScrollActivity = () => {
    setIsScrolling(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsScrolling(false), 900);
  };

  const signOut = async () => {
    await signOutCurrentSession();
    router.replace("/sign-in");
  };

  const scrollClass = [
    "st-scroll",
    isScrolling && "is-scrolling",
    documentationScrollDemo && `st-scroll--demo-${documentationScrollDemo}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <View style={[styles.sidebar, rail && styles.sidebarRail]}>
      <View style={[styles.brandRegion, rail && styles.brandRegionRail]}>
        {rail ? (
          <Image
            accessibilityLabel="Stylish"
            contentFit="contain"
            source={require("@/assets/images/stylish-mark.svg")}
            style={styles.brandMark}
          />
        ) : (
          <StylishLogo width={194} />
        )}
        <Pressable
          accessibilityLabel={rail ? "Expand sidebar" : "Collapse sidebar"}
          accessibilityRole="button"
          onPress={onToggleRail}
          style={styles.collapseButton}
        >
          <DashboardIcon name={rail ? "chevron-right" : "chevron-left"} />
        </Pressable>
      </View>

      <View
        style={[styles.workspaceRegion, rail && styles.workspaceRegionRail]}
      >
        <Pressable
          accessibilityLabel={`Current workspace ${session.merchantName}, ${session.role}`}
          accessibilityRole="button"
          onPress={() => router.push("/auth/choose-workspace")}
          style={[styles.workspaceCard, rail && styles.workspaceCardRail]}
        >
          <View style={styles.merchantAvatar}>
            <StylishText style={styles.avatarLabel} unstyled variant="label">
              {session.merchantName.charAt(0).toUpperCase()}
            </StylishText>
          </View>
          {!rail ? (
            <>
              <View style={styles.workspaceCopy}>
                <StylishText
                  numberOfLines={1}
                  style={styles.workspaceName}
                  unstyled
                  variant="label"
                >
                  {session.merchantName}
                </StylishText>
                <StylishText
                  numberOfLines={1}
                  style={styles.workspaceRole}
                  unstyled
                  variant="caption"
                >
                  {session.role}
                </StylishText>
              </View>
              <DashboardIcon name="chevron-down" size={16} />
            </>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        accessibilityLabel="Merchant sections"
        bounces={false}
        className={scrollClass}
        contentContainerStyle={styles.navContent}
        onScroll={noteScrollActivity}
        scrollEventThrottle={120}
        style={styles.navRegion}
      >
        {NAV_ITEMS.filter(
          (item) => !item.permission || can(session, item.permission),
        ).map((item) => (
          <SidebarNavItem item={item} key={item.label} rail={rail} />
        ))}
      </ScrollView>

      <View style={styles.utilityRegion}>
        {!rail ? (
          <StatusChip
            icon="check-circle-outline"
            label={`Store ${session.storeStatus}`}
            tone={session.storeStatus === "active" ? "green" : "warning"}
          />
        ) : null}
        <SidebarUtility
          icon="open-in-new"
          label="View Storefront"
          rail={rail}
        />
        <SidebarUtility
          icon="swap-horizontal"
          label="Switch Workspace"
          onPress={() => router.push("/auth/choose-workspace")}
          rail={rail}
        />
        <SidebarUtility icon="lifebuoy" label="Help & Support" rail={rail} />
        <SidebarUtility
          icon="logout"
          label="Sign Out"
          onPress={() => void signOut()}
          rail={rail}
        />
      </View>

      {onClose ? (
        <Pressable
          accessibilityLabel="Close navigation"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.mobileClose}
        >
          <DashboardIcon name="close" size={22} />
        </Pressable>
      ) : null}
    </View>
  );
}

function SidebarUtility({
  icon,
  label,
  onPress,
  rail,
}: {
  icon: DashboardIconName;
  label: string;
  onPress?: () => void;
  rail: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.utilityItem,
        rail && styles.utilityItemRail,
        pressed && styles.navItemPressed,
      ]}
    >
      <DashboardIcon name={icon} />
      {!rail ? (
        <StylishText style={styles.utilityLabel} unstyled variant="navigation">
          {label}
        </StylishText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatarLabel: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },
  brandRegion: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  brandMark: { height: 36, width: 36 },
  brandRegionRail: { flexDirection: "column", paddingHorizontal: spacing.sm },
  collapseButton: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  countBadge: {
    alignItems: "center",
    backgroundColor: colors.brand.primary,
    borderRadius: borderRadius.pill,
    justifyContent: "center",
    minHeight: 22,
    minWidth: 22,
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: colors.neutral[0],
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    lineHeight: 14,
  },
  merchantAvatar: {
    alignItems: "center",
    backgroundColor: colors.brand.socialSurface,
    borderRadius: borderRadius.input,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  mobileClose: {
    alignItems: "center",
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: -56,
    top: spacing.md,
    width: 44,
  },
  navContent: {
    gap: 2,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  navItem: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  navItemActive: { backgroundColor: colors.brand.socialSurface },
  navItemPressed: { backgroundColor: colors.neutral[100] },
  navItemRail: { justifyContent: "center", paddingHorizontal: 0 },
  navLabel: {
    color: colors.ink.primary,
    flex: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  navLabelActive: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_600SemiBold",
  },
  navRegion: { flex: 1, minHeight: 0 },
  sidebar: {
    backgroundColor: colors.neutral[0],
    borderRightColor: colors.neutral[200],
    borderRightWidth: 1,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    width: 272,
  },
  sidebarRail: { width: 84 },
  subnav: {
    borderLeftColor: colors.neutral[200],
    borderLeftWidth: 1,
    gap: 2,
    marginLeft: spacing.xl,
    paddingBottom: 4,
    paddingLeft: spacing.sm,
  },
  subnavItem: {
    alignItems: "center",
    borderRadius: borderRadius.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  subnavLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  utilityItem: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  utilityItemRail: { justifyContent: "center", paddingHorizontal: 0 },
  utilityLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  utilityRegion: {
    borderTopColor: colors.neutral[200],
    borderTopWidth: 1,
    gap: 2,
    padding: spacing.sm,
  },
  workspaceCard: {
    alignItems: "center",
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 66,
    padding: spacing.sm,
  },
  workspaceCardRail: { justifyContent: "center", padding: spacing.xs },
  workspaceCopy: { flex: 1, gap: 2, minWidth: 0 },
  workspaceName: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  workspaceRegion: { paddingBottom: spacing.md, paddingHorizontal: spacing.md },
  workspaceRegionRail: { paddingHorizontal: spacing.sm },
  workspaceRole: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
});
