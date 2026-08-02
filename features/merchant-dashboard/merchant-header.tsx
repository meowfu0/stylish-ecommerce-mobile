import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  DashboardIcon,
  type DashboardIconName,
} from "@/features/merchant-dashboard/dashboard-primitives";
import type {
  DateRange,
  MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";
import { signOutCurrentSession } from "@/services/auth/auth-session";

const DATE_LABELS: Record<DateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  mtd: "Month to date",
};

type HeaderMenu = "account" | "date" | null;

export function MerchantHeader({
  dateRange,
  notificationCount,
  onDateRangeChange,
  onOpenNavigation,
  onOpenNotifications,
  session,
}: {
  dateRange: DateRange;
  notificationCount: number;
  onDateRangeChange: (range: DateRange) => void;
  onOpenNavigation: () => void;
  onOpenNotifications: () => void;
  session: MerchantSession;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [menu, setMenu] = useState<HeaderMenu>(null);
  const compact = width < 1280;
  const mobile = width < 1024;

  const signOut = async () => {
    setMenu(null);
    await signOutCurrentSession();
    router.replace("/sign-in");
  };

  return (
    <View style={styles.header}>
      <View style={[styles.headerRow, mobile && styles.headerRowMobile]}>
        {mobile ? (
          <HeaderIconButton
            icon="menu"
            label="Open merchant navigation"
            onPress={onOpenNavigation}
          />
        ) : null}
        <View style={styles.titleBlock}>
          <StylishText
            accessibilityRole="header"
            numberOfLines={1}
            style={styles.title}
            unstyled
            variant="headingLarge"
          >
            Overview
          </StylishText>
          <StylishText
            numberOfLines={1}
            style={styles.subtitle}
            unstyled
            variant="caption"
          >
            Welcome back, {session.displayName} · {session.merchantName}
          </StylishText>
        </View>

        {!compact ? <HeaderSearch /> : null}

        <Pressable
          accessibilityLabel={`Date range ${DATE_LABELS[dateRange]}`}
          accessibilityRole="button"
          onPress={() => setMenu("date")}
          style={styles.dateButton}
        >
          <DashboardIcon name="calendar-month-outline" />
          {!mobile ? (
            <StylishText style={styles.controlLabel} unstyled variant="label">
              {DATE_LABELS[dateRange]}
            </StylishText>
          ) : null}
        </Pressable>
        <View>
          <HeaderIconButton
            icon="bell-outline"
            label={`${notificationCount} unread notifications`}
            onPress={onOpenNotifications}
          />
          {notificationCount ? (
            <View style={styles.notificationBadge}>
              <StylishText
                style={styles.notificationBadgeText}
                unstyled
                variant="caption"
              >
                {notificationCount}
              </StylishText>
            </View>
          ) : null}
        </View>
        {!mobile ? (
          <HeaderIconButton
            icon="help-circle-outline"
            label="Help and support"
          />
        ) : null}
        <Pressable
          accessibilityLabel={`Account menu for ${session.displayName}`}
          accessibilityRole="button"
          onPress={() => setMenu("account")}
          style={styles.accountButton}
        >
          <View style={styles.avatar}>
            <StylishText style={styles.avatarText} unstyled variant="caption">
              {session.displayName.charAt(0).toUpperCase()}
            </StylishText>
          </View>
          {!mobile ? (
            <View style={styles.accountCopy}>
              <StylishText
                numberOfLines={1}
                style={styles.accountName}
                unstyled
                variant="label"
              >
                {session.displayName}
              </StylishText>
              <StylishText
                numberOfLines={1}
                style={styles.accountRole}
                unstyled
                variant="caption"
              >
                {session.role}
              </StylishText>
            </View>
          ) : null}
        </Pressable>
      </View>
      {compact ? (
        <View style={styles.compactSearchRow}>
          <HeaderSearch />
        </View>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setMenu(null)}
        transparent
        visible={menu !== null}
      >
        <Pressable
          accessibilityLabel="Close menu"
          accessibilityRole="button"
          onPress={() => setMenu(null)}
          style={styles.modalBackdrop}
        >
          <View style={[styles.popover, mobile && styles.popoverMobile]}>
            {menu === "date"
              ? (Object.keys(DATE_LABELS) as DateRange[]).map((range) => (
                  <PopoverItem
                    icon={
                      range === dateRange ? "check" : "calendar-blank-outline"
                    }
                    key={range}
                    label={DATE_LABELS[range]}
                    onPress={() => {
                      onDateRangeChange(range);
                      setMenu(null);
                    }}
                  />
                ))
              : null}
            {menu === "account" ? (
              <>
                <PopoverItem icon="account-outline" label="Account profile" />
                <PopoverItem
                  icon="swap-horizontal"
                  label="Switch workspace"
                  onPress={() => {
                    setMenu(null);
                    router.push("/auth/choose-workspace");
                  }}
                />
                <PopoverItem icon="open-in-new" label="View storefront" />
                <PopoverItem
                  icon="logout"
                  label="Sign out"
                  onPress={() => void signOut()}
                />
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function HeaderSearch() {
  return (
    <View style={styles.searchField}>
      <DashboardIcon name="magnify" />
      <StylishTextInput
        accessibilityLabel="Search products, orders, and customers"
        placeholder="Search products, orders, customers"
        placeholderTextColor={colors.neutral[450]}
        style={styles.searchInput}
      />
    </View>
  );
}

function HeaderIconButton({
  icon,
  label,
  onPress,
}: {
  icon: DashboardIconName;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <DashboardIcon color={colors.ink.primary} name={icon} size={20} />
    </Pressable>
  );
}

function PopoverItem({
  icon,
  label,
  onPress,
}: {
  icon: DashboardIconName;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.popoverItem, pressed && styles.pressed]}
    >
      <DashboardIcon name={icon} />
      <StylishText style={styles.popoverLabel} unstyled variant="navigation">
        {label}
      </StylishText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accountButton: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  accountCopy: { maxWidth: 116 },
  accountName: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  accountRole: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.brand.blueSoft,
    borderRadius: borderRadius.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  avatarText: {
    color: colors.feedback.info,
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    lineHeight: 18,
  },
  compactSearchRow: {
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  controlLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  dateButton: {
    alignItems: "center",
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  header: {
    backgroundColor: colors.neutral[0],
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexShrink: 0,
    zIndex: 20,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 76,
    paddingHorizontal: spacing.xl,
  },
  headerRowMobile: {
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  modalBackdrop: {
    backgroundColor: "rgba(17,24,28,0.08)",
    flex: 1,
    paddingRight: spacing.lg,
    paddingTop: 76,
  },
  notificationBadge: {
    alignItems: "center",
    backgroundColor: colors.brand.primary,
    borderRadius: borderRadius.pill,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    top: 2,
    width: 18,
  },
  notificationBadgeText: {
    color: colors.neutral[0],
    fontFamily: "Montserrat_700Bold",
    fontSize: 9,
    lineHeight: 12,
  },
  popover: {
    alignSelf: "flex-end",
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 240,
    padding: spacing.xs,
    shadowColor: colors.ink.primary,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  popoverItem: {
    alignItems: "center",
    borderRadius: borderRadius.sm,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  popoverLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  popoverMobile: { marginLeft: spacing.lg, width: 280 },
  pressed: { backgroundColor: colors.neutral[100] },
  searchField: {
    alignItems: "center",
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    height: 44,
    maxWidth: 320,
    minWidth: 200,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    color: colors.ink.primary,
    flex: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
    minWidth: 0,
    padding: 0,
  },
  subtitle: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  title: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 28,
    letterSpacing: -0.45,
    lineHeight: 34,
  },
  titleBlock: { flex: 1, minWidth: 120 },
});
