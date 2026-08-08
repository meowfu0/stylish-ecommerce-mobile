import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  DashboardIcon,
  type DashboardIconName,
  DashboardSkeleton,
} from "@/features/merchant-dashboard/dashboard-primitives";
import type {
  DashboardNotification,
  DateRange,
  MerchantSession,
} from "@/features/merchant-dashboard/dashboard-types";
import { dashboardNotifications } from "@/features/merchant-dashboard/dashboard-data";
import { DATE_RANGE_LABELS } from "@/features/merchant-dashboard/dashboard-format";
import {
  DashboardMenu,
  type MenuAnchor,
} from "@/features/merchant-dashboard/dashboard-menu";
import { HelpSupportDialog } from "@/features/merchant-dashboard/help-support-dialog";
import { NotificationMenu } from "@/features/merchant-dashboard/notification-menu";
import {
  presentStoreStatus,
  STOREFRONT_ROUTE,
} from "@/features/merchant-dashboard/merchant-store-status";
import { signOutCurrentSession } from "@/services/auth/auth-session";

const DATE_LABELS = DATE_RANGE_LABELS;

/**
 * The topbar's icon controls.
 *
 * One box size and one glyph size for the bell and the Help control, so the
 * pair reads as a matched set rather than two buttons that happen to sit next
 * to each other. The box comfortably clears the 44px touch-target minimum.
 */
export const ICON_BUTTON_SIZE = 46;
export const HEADER_ICON_SIZE = 24;

/**
 * Every popover the header owns, in one piece of state.
 *
 * They were three independent flags, which meant the bell panel and the account
 * menu could be on screen at the same time. A single value makes them mutually
 * exclusive by construction rather than by remembering to close the others.
 */
type HeaderMenu = "account" | "date" | "help" | "notifications" | null;

/** Ordered as the design lists them; the labels come from the shared map. */
const DATE_RANGES = Object.keys(DATE_LABELS) as DateRange[];

/**
 * Where each Help entry lands.
 *
 * A section id opens the shared Help & Support dialog at that section;
 * `"contact"` opens it with the contact channels first. Every destination is
 * real content that already exists, so no entry is a dead row waiting on a
 * route that has not been built.
 */
type HelpDestination = "catalog" | "common" | "contact" | "orders";

const HELP_ITEMS: {
  destination: HelpDestination;
  icon: DashboardIconName;
  key: string;
  label: string;
}[] = [
  {
    destination: "common",
    icon: "lifebuoy",
    key: "help-center",
    label: "Help Center",
  },
  {
    destination: "common",
    icon: "rocket-launch-outline",
    key: "getting-started",
    label: "Getting Started",
  },
  {
    destination: "orders",
    icon: "truck-outline",
    key: "orders-help",
    label: "Orders & Fulfillment Help",
  },
  {
    destination: "catalog",
    icon: "package-variant-closed",
    key: "catalog-help",
    label: "Catalog & Inventory Help",
  },
  {
    destination: "contact",
    icon: "email-outline",
    key: "contact-support",
    label: "Contact Support",
  },
];

/** Counts past 9 would stretch the badge and shift the bell's optical centre. */
export function badgeCount(count: number) {
  return count > 9 ? "9+" : String(count);
}

/** Reads as a sentence rather than "1 unread notifications". */
export function notificationLabel(count: number) {
  if (count === 0) return "Notifications, none unread";
  return `Notifications, ${count} unread`;
}

export function MerchantHeader({
  dateRange,
  notifications = dashboardNotifications,
  onDateRangeChange,
  onOpenNavigation,
  onOpenNotifications,
  session,
}: {
  dateRange: DateRange;
  /** Omitted only in previews; the badge and panel both derive from this. */
  notifications?: readonly DashboardNotification[];
  onDateRangeChange: (range: DateRange) => void;
  onOpenNavigation: () => void;
  onOpenNotifications: () => void;
  session: MerchantSession;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [menu, setMenu] = useState<HeaderMenu>(null);
  const [help, setHelp] = useState<HelpDestination | null>(null);
  const compact = width < 1280;
  const mobile = width < 1024;
  // The header runs out of room for a fifth control on a phone, where the
  // navigation drawer already carries Help & Support. Tablets upward keep it.
  const phone = width < 768;
  // Derived, so the badge can never disagree with the panel it opens.
  const notificationCount = notifications.filter((item) => item.unread).length;

  // Every menu anchors to its own trigger rather than floating in the header's
  // corner, so it opens directly beneath the control that owns it.
  const dateTrigger = useRef<View>(null);
  const bellTrigger = useRef<View>(null);
  const helpTrigger = useRef<View>(null);
  const accountTrigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);

  /**
   * Opens one popover and, because there is a single `menu` value, closes
   * whichever was open. Pressing the same trigger again closes it.
   *
   * The anchor is measured on every open rather than cached per trigger: one
   * menu is visible at a time, so one measurement is all that can be in use,
   * and re-measuring keeps a menu anchored after the header reflows.
   */
  const toggleMenu = (
    key: Exclude<HeaderMenu, null>,
    trigger: typeof dateTrigger,
  ) => {
    if (menu === key) {
      setMenu(null);
      return;
    }
    setMenu(key);
    trigger.current?.measureInWindow((x, y, triggerWidth, height) => {
      setAnchor({ height, width: triggerWidth, x, y });
    });
  };

  const openHelp = (destination: HelpDestination) => {
    setMenu(null);
    setHelp(destination);
  };

  const signOut = async () => {
    setMenu(null);
    await signOutCurrentSession();
    router.replace("/sign-in");
  };

  return (
    <View style={styles.header}>
      <View
        style={[styles.headerRow, mobile && styles.headerRowMobile]}
        testID="merchant-header-row"
      >
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
          accessibilityState={{ expanded: menu === "date" }}
          className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
          onPress={() => toggleMenu("date", dateTrigger)}
          ref={dateTrigger}
          style={styles.dateButton}
          testID="header-date-range"
        >
          <DashboardIcon name="calendar-month-outline" />
          {!mobile ? (
            <StylishText style={styles.controlLabel} unstyled variant="label">
              {DATE_LABELS[dateRange]}
            </StylishText>
          ) : null}
        </Pressable>

        <DashboardMenu
          accessibilityLabel="Date range options"
          anchor={anchor}
          items={DATE_RANGES.map((range) => ({
            // The selected row shows a check in place of its calendar icon.
            icon: "calendar-blank-outline",
            key: range,
            label: DATE_LABELS[range],
            onPress: () => onDateRangeChange(range),
            selected: range === dateRange,
          }))}
          minWidth={200}
          onClose={() => setMenu(null)}
          testID="header-date-range-menu"
          visible={menu === "date"}
        />

        {/* The badge is absolutely positioned inside this wrapper, so it never
            adds to the button's width and the bell stays the same size as the
            Help control beside it. */}
        <View
          ref={bellTrigger}
          style={styles.iconButtonSlot}
          testID="header-notifications-slot"
        >
          <HeaderIconButton
            expanded={menu === "notifications"}
            icon="bell-outline"
            label={notificationLabel(notificationCount)}
            onPress={() => toggleMenu("notifications", bellTrigger)}
            testID="header-notifications"
          />
          {notificationCount ? (
            <View
              pointerEvents="none"
              style={styles.notificationBadge}
              testID="header-notifications-badge"
            >
              <StylishText
                numberOfLines={1}
                style={styles.notificationBadgeText}
                unstyled
                variant="caption"
              >
                {badgeCount(notificationCount)}
              </StylishText>
            </View>
          ) : null}
        </View>

        <NotificationMenu
          anchor={anchor}
          notifications={notifications}
          onClose={() => setMenu(null)}
          onSeeAll={onOpenNotifications}
          visible={menu === "notifications"}
        />

        {!phone ? (
          <View
            ref={helpTrigger}
            style={styles.iconButtonSlot}
            testID="header-help-slot"
          >
            <HeaderIconButton
              expanded={menu === "help"}
              icon="help-circle-outline"
              label="Open help menu"
              onPress={() => toggleMenu("help", helpTrigger)}
              testID="header-help"
            />
          </View>
        ) : null}

        <DashboardMenu
          accessibilityLabel="Help and support options"
          anchor={anchor}
          items={HELP_ITEMS.map((item) => ({
            icon: item.icon,
            key: item.key,
            label: item.label,
            onPress: () => openHelp(item.destination),
          }))}
          minWidth={232}
          onClose={() => setMenu(null)}
          testID="header-help-menu"
          visible={menu === "help"}
        />
        <Pressable
          accessibilityLabel={`Account menu for ${session.displayName}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: menu === "account" }}
          className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
          onPress={() => toggleMenu("account", accountTrigger)}
          ref={accountTrigger}
          style={styles.accountButton}
          testID="header-account"
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

      {/* The same anchored popover the date-range and notification menus use,
          so there is one dropdown system in the header rather than two. It
          carries no profile summary: the trigger beside it already shows the
          name and role, and repeating them cost the menu a header, a divider
          and the compact height the design asks for. */}
      <DashboardMenu
        accessibilityLabel={`Account options for ${session.displayName}`}
        anchor={anchor}
        items={[
          {
            icon: "account-outline",
            key: "account-profile",
            label: "Account profile",
          },
          {
            icon: "swap-horizontal",
            key: "switch-workspace",
            label: "Switch workspace",
            onPress: () => router.push("/auth/choose-workspace"),
          },
          {
            disabled: !presentStoreStatus(session).canViewStorefront,
            icon: "open-in-new",
            key: "view-storefront",
            label: "View storefront",
            // The same route the sidebar footer and the welcome card use, so
            // there is one definition of where the storefront lives.
            onPress: () => router.push(STOREFRONT_ROUTE),
          },
          {
            icon: "logout",
            key: "sign-out",
            label: "Sign out",
            onPress: () => void signOut(),
          },
        ]}
        minWidth={216}
        onClose={() => setMenu(null)}
        testID="header-account-menu"
        visible={menu === "account"}
      />

      {/* The sidebar's Help & Support experience, not a second one. Each menu
          entry opens it at the part it names. */}
      <HelpSupportDialog
        contactFirst={help === "contact"}
        initialSectionId={help && help !== "contact" ? help : undefined}
        onClose={() => setHelp(null)}
        visible={help !== null}
      />
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

/**
 * Header placeholder for the loading state. It reuses the header's own row,
 * paddings and control sizes, so the real header lands exactly where this
 * stood — no strip appearing and pushing the dashboard down.
 *
 * Nothing here stands in for user data: the avatar and name are neutral blocks,
 * never a fake identity.
 */
export function MerchantHeaderSkeleton() {
  const { width } = useWindowDimensions();
  const compact = width < 1280;
  const mobile = width < 1024;

  return (
    <View style={styles.header} testID="merchant-header-skeleton">
      <View style={[styles.headerRow, mobile && styles.headerRowMobile]}>
        {mobile ? (
          <DashboardSkeleton style={styles.skeletonIconButton} />
        ) : null}
        <View style={styles.titleBlock}>
          <DashboardSkeleton style={styles.skeletonTitle} />
          <DashboardSkeleton style={styles.skeletonSubtitle} />
        </View>
        {!compact ? <DashboardSkeleton style={styles.skeletonSearch} /> : null}
        <DashboardSkeleton style={styles.skeletonDateButton} />
        <DashboardSkeleton style={styles.skeletonIconButton} />
        {!mobile ? (
          <DashboardSkeleton style={styles.skeletonIconButton} />
        ) : null}
        <View style={styles.accountButton}>
          <DashboardSkeleton style={styles.skeletonAvatar} />
          {!mobile ? (
            <View style={styles.accountCopy}>
              <DashboardSkeleton style={styles.skeletonAccountName} />
              <DashboardSkeleton style={styles.skeletonAccountRole} />
            </View>
          ) : null}
        </View>
      </View>
      {/* Below 1280 the real header drops its search onto a second row; the
          placeholder has to do the same or the strip is 35px short. */}
      {compact ? (
        <View style={styles.compactSearchRow}>
          <DashboardSkeleton style={styles.skeletonCompactSearch} />
        </View>
      ) : null}
    </View>
  );
}

function HeaderIconButton({
  expanded,
  icon,
  iconSize = HEADER_ICON_SIZE,
  label,
  onPress,
  testID,
}: {
  /** Set when the button owns a popover, so its state is announced. */
  expanded?: boolean;
  icon: DashboardIconName;
  /** Escape hatch for a glyph that needs optical tuning; the box never moves. */
  iconSize?: number;
  label: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      testID={testID}
    >
      <DashboardIcon color={colors.ink.primary} name={icon} size={iconSize} />
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
    // One gap for every pair in the action area: date range, bell, help and
    // the owner block are all separated by the same step.
    gap: spacing.sm,
    minHeight: 76,
    paddingHorizontal: spacing.xl,
  },
  headerRowMobile: {
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  // Slightly larger than the 44 it was, so the bell reads at the weight the
  // design gives it. Shared by the bell, help and mobile menu buttons so the
  // header's icon controls stay the same size as each other.
  iconButton: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    height: ICON_BUTTON_SIZE,
    justifyContent: "center",
    width: ICON_BUTTON_SIZE,
  },
  /**
   * The measured anchor for a header icon menu, and the badge's containing box.
   *
   * Pinned to the button's own square and centred on the row explicitly: the
   * wrapper must not stretch to the row's height, or its popover would open
   * below where the control actually sits and the badge would ride away from
   * the bell.
   */
  iconButtonSlot: {
    alignItems: "center",
    alignSelf: "center",
    flexShrink: 0,
    height: ICON_BUTTON_SIZE,
    justifyContent: "center",
    width: ICON_BUTTON_SIZE,
  },
  /**
   * The badge is placed against the bell glyph, not the button box.
   *
   * The 24px glyph is centred in the 46px button, so it occupies 11–35 on both
   * axes and the button's own corner sits 11px beyond it — pinning the badge
   * there left it floating in empty padding. Inset by `spacing.xxs + 1` the
   * badge spans 23–41 across and 5–23 down, which lands it on the bell's
   * top-right shoulder: adjacent to the glyph, clear of its dome, and still
   * wholly inside the button so the header row cannot clip it.
   *
   * Absolute, so it stays out of the layout flow and can never widen the button
   * away from the Help control beside it.
   */
  notificationBadge: {
    alignItems: "center",
    backgroundColor: colors.brand.primary,
    // A heavier ring than a hairline: it is what separates the badge from the
    // bell's stroke where the two meet.
    borderColor: colors.neutral[0],
    borderRadius: borderRadius.pill,
    borderStyle: "solid",
    borderWidth: 2,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 3,
    position: "absolute",
    right: spacing.xxs + 1,
    top: spacing.xxs + 1,
  },
  notificationBadgeText: {
    color: colors.neutral[0],
    fontFamily: "Montserrat_700Bold",
    fontSize: 10,
    lineHeight: 13,
  },
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
  // Each placeholder carries the box of the control it stands in for, so the
  // real header replaces it without moving anything.
  skeletonAccountName: { height: 13, width: 92 },
  skeletonAccountRole: { height: 11, marginTop: 4, width: 64 },
  skeletonAvatar: { borderRadius: borderRadius.pill, height: 36, width: 36 },
  // Matches the height the real compact search row actually renders at (34
  // total with its padding), not the 44 the field style suggests.
  skeletonCompactSearch: { borderRadius: borderRadius.input, height: 22 },
  skeletonDateButton: {
    borderRadius: borderRadius.input,
    height: 44,
    width: 132,
  },
  skeletonIconButton: {
    borderRadius: borderRadius.input,
    height: 46,
    width: 46,
  },
  skeletonSearch: {
    borderRadius: borderRadius.input,
    flex: 1,
    height: 44,
    maxWidth: 320,
  },
  skeletonSubtitle: { height: 12, marginTop: 6, width: 220 },
  skeletonTitle: { height: 20, width: 132 },
});
