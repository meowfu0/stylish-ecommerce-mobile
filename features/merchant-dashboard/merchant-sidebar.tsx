import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { VeloriLogo, VeloriMark } from "@/components/brand/velori-logo";
import { StylishText } from "@/components/typography/stylish-text";
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "@/constants/design-tokens";
import {
  DashboardIcon,
  StatusChip,
  type DashboardIconName,
} from "@/features/merchant-dashboard/dashboard-primitives";
import {
  findMerchantNavigationGroupLabel,
  type MerchantNavigationItem,
  navigationRequiresActiveStore,
  resolveMerchantNavigationAccess,
} from "@/features/merchant-dashboard/merchant-navigation";
import { HelpSupportDialog } from "@/features/merchant-dashboard/help-support-dialog";
import {
  presentStoreStatus,
  STOREFRONT_ROUTE,
  type StoreStatusPresentation,
} from "@/features/merchant-dashboard/merchant-store-status";
import { SidebarPressable } from "@/features/merchant-dashboard/sidebar-pressable";
import { useReducedMotion } from "@/features/merchant-dashboard/use-reduced-motion";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import { signOutCurrentSession } from "@/services/auth/auth-session";

const focusRingClass =
  "focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-brand-primary focus-visible:ring-offset-[2px] focus-visible:ring-offset-white";
const scrollFocusRingClass =
  "focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-inset focus-visible:ring-brand-primary";
const interactiveTransitionClass =
  "transition-colors duration-150 ease-out motion-reduce:transition-none";
const sidebarActionClass = `${focusRingClass} ${interactiveTransitionClass} cursor-pointer hover:bg-brand-socialSurface active:bg-brand-pinkSoft/35`;
const disabledTitle = "Your role doesn't include access to this section";
const inactiveStoreTitle =
  "Selling is paused for this merchant, so this section is unavailable";
const pressedRowBackground = `${colors.brand.pinkSoft}59`;

/**
 * Brand region sizing. The expanded lockup is capped rather than fixed so it
 * scales with the sidebar and always keeps `brandRegion`'s gap between itself
 * and the collapse control. The rail mark is sized so the stacked mark, gap and
 * control still fit inside the shared header height with room to breathe.
 */
export const SIDEBAR_LOGO_MAX_WIDTH = 112;
const SIDEBAR_MARK_HEIGHT = 22;
const COLLAPSE_CONTROL_SIZE = 36;
const MERCHANT_AVATAR_SIZE = 38;

/**
 * The sidebar's vertical rhythm, derived from tokens rather than measured off a
 * screenshot.
 *
 * The brand band is the rail's stack — mark, gap, collapse control — plus even
 * clearance, and the expanded sidebar centres its lockup in the same band. Both
 * states therefore share a header height, which is what stops the navigation
 * jumping while the sidebar animates between them. The breathing room above the
 * brand comes from the sidebar's own top padding instead of inflating this
 * band, because growing the band would push the merchant card further from the
 * logo at exactly the moment the design wants it closer.
 */
const SIDEBAR_BRAND_HEIGHT =
  SIDEBAR_MARK_HEIGHT + spacing.xs + COLLAPSE_CONTROL_SIZE + spacing.xs;

/** The avatar plus the card's own padding: the card sizes itself to content. */
const MERCHANT_CARD_HEIGHT = MERCHANT_AVATAR_SIZE + spacing.sm * 2;

/**
 * The card plus the gap before the first navigation row. Fixed so the rail's
 * smaller avatar block still hands the navigation off at the same height the
 * expanded card does.
 */
const SIDEBAR_WORKSPACE_HEIGHT = MERCHANT_CARD_HEIGHT + spacing.xs;

/**
 * The sidebar's two resting widths. The shell owns the element that actually
 * carries the width so it can animate between them, which is why the sidebar
 * itself simply fills whatever it is given.
 */
export const MERCHANT_SIDEBAR_WIDTH = 272;
export const MERCHANT_SIDEBAR_RAIL_WIDTH = 84;

function sidebarItemId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function childListId(groupId: string) {
  return `merchant-sidebar-${groupId}-children`;
}

function groupTriggerId(groupId: string) {
  return `merchant-sidebar-${groupId}-trigger`;
}

function webTitle(label: string, enabled: boolean) {
  return Platform.OS === "web" && enabled ? { title: label } : {};
}

function CountBadge({ count, rail }: { count: number; rail: boolean }) {
  if (rail) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.countBadgeDot}
      />
    );
  }

  return (
    <View style={styles.countBadge} testID="sidebar-count-badge">
      <StylishText style={styles.countBadgeText} unstyled variant="caption">
        {count}
      </StylishText>
    </View>
  );
}

function SidebarNavRow({
  active = false,
  badge,
  child = false,
  controlsId,
  disabled = false,
  disabledHint = disabledTitle,
  expanded = false,
  icon,
  label,
  onPress,
  rail = false,
  showChevron = false,
  triggerId,
  reducedMotion,
}: {
  active?: boolean;
  badge?: number;
  child?: boolean;
  controlsId?: string;
  disabled?: boolean;
  disabledHint?: string;
  expanded?: boolean;
  icon?: DashboardIconName;
  label: string;
  onPress?: () => void;
  rail?: boolean;
  showChevron?: boolean;
  triggerId?: string;
  reducedMotion: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const emphasized = active || (hovered && !disabled);
  const hasRightAccessory =
    disabled || badge !== undefined || (!rail && showChevron);
  const rowClassName = [
    focusRingClass,
    interactiveTransitionClass,
    disabled ? "cursor-not-allowed" : "cursor-pointer",
  ].join(" ");

  return (
    <SidebarPressable
      {...webTitle(disabled ? disabledHint : label, rail || disabled)}
      aria-controls={controlsId}
      aria-current={active ? "page" : undefined}
      aria-disabled={disabled}
      aria-expanded={controlsId ? expanded : undefined}
      accessibilityHint={disabled ? disabledHint : undefined}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{
        disabled,
        expanded: controlsId ? expanded : undefined,
        selected: active,
      }}
      className={rowClassName}
      disabled={disabled}
      nativeID={triggerId}
      onHoverIn={() => {
        if (!disabled) setHovered(true);
      }}
      onHoverOut={() => setHovered(false)}
      onPress={disabled ? undefined : onPress}
      onPressIn={() => {
        if (!disabled) setPressed(true);
      }}
      onPressOut={() => setPressed(false)}
      style={[
        styles.navItem,
        child && styles.subnavItem,
        rail && styles.navItemRail,
        hovered && !disabled && !active && styles.navItemHovered,
        pressed && !disabled && !active && styles.navItemPressed,
        active && styles.navItemActive,
        disabled && styles.navItemDisabled,
      ]}
    >
      {icon ? (
        <View style={styles.navIcon}>
          <DashboardIcon
            color={emphasized ? colors.brand.primary : colors.neutral[550]}
            name={icon}
            size={18}
          />
        </View>
      ) : null}
      {!rail ? (
        <StylishText
          numberOfLines={1}
          style={[
            styles.navLabel,
            child && styles.subnavLabel,
            hovered && !disabled && styles.navLabelHovered,
            active && styles.navLabelActive,
          ]}
          unstyled
          variant={child ? "caption" : "navigation"}
        >
          {label}
        </StylishText>
      ) : null}
      {hasRightAccessory ? (
        <View
          pointerEvents="none"
          style={[styles.navAccessory, rail && styles.navAccessoryRail]}
        >
          {disabled ? (
            <View style={styles.navLock}>
              <DashboardIcon name="lock-outline" size={14} />
            </View>
          ) : badge !== undefined ? (
            <CountBadge count={badge} rail={rail} />
          ) : (
            <SidebarChevron
              expanded={expanded}
              highlighted={emphasized}
              reducedMotion={reducedMotion}
            />
          )}
        </View>
      ) : null}
    </SidebarPressable>
  );
}

function SidebarChevron({
  expanded,
  highlighted,
  reducedMotion,
}: {
  expanded: boolean;
  highlighted: boolean;
  reducedMotion: boolean;
}) {
  const rotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      rotation.setValue(expanded ? 1 : 0);
      return;
    }

    const animation = Animated.timing(rotation, {
      duration: reducedMotion ? 0 : 200,
      easing: Easing.out(Easing.cubic),
      toValue: expanded ? 1 : 0,
      useNativeDriver: false,
    });
    animation.start();

    return () => animation.stop();
  }, [expanded, reducedMotion, rotation]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.navChevron,
        {
          transform: [
            {
              rotate: rotation.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "180deg"],
              }),
            },
          ],
        },
      ]}
      testID="sidebar-group-chevron"
    >
      <DashboardIcon
        color={highlighted ? colors.brand.primary : colors.neutral[550]}
        name="chevron-down"
        size={16}
      />
    </Animated.View>
  );
}

function SidebarChildList({
  activeItemLabel,
  badges,
  disabled,
  expanded,
  groupId,
  items,
  onNavigate,
  onEscape,
  reducedMotion,
}: {
  activeItemLabel: string;
  badges: SidebarBadges;
  disabled: boolean;
  expanded: boolean;
  groupId: string;
  items: NonNullable<MerchantNavigationItem["children"]>;
  onNavigate: (route: MerchantNavigationItem["route"]) => void;
  onEscape: () => void;
  reducedMotion: boolean;
}) {
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const firstRender = useRef(true);
  const [mounted, setMounted] = useState(expanded);
  const listId = childListId(groupId);
  const maximumHeight = items.length * 40 + (items.length - 1) * 2 + 6;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      progress.setValue(expanded ? 1 : 0);
      setMounted(expanded);
      return;
    }

    progress.stopAnimation();
    if (expanded) {
      setMounted(true);
      progress.setValue(0);
    }

    Animated.timing(progress, {
      duration: reducedMotion ? 0 : 190,
      easing: Easing.out(Easing.cubic),
      toValue: expanded ? 1 : 0,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !expanded) setMounted(false);
    });
  }, [expanded, progress, reducedMotion]);

  if (!mounted) return null;

  const rows = items.map((item) => {
    const active = !disabled && item.label === activeItemLabel;
    const contents = (
      <SidebarNavRow
        active={active}
        badge={badges[item.key] ?? item.badge}
        child
        disabled={disabled}
        label={item.label}
        onPress={() => onNavigate(item.route)}
        reducedMotion={reducedMotion}
      />
    );

    if (Platform.OS === "web") {
      return createElement(
        "li",
        { key: item.label, style: webSubnavItemStyle },
        contents,
      );
    }

    return (
      <View key={item.label} style={styles.subnavListItem}>
        {contents}
      </View>
    );
  });

  const list =
    Platform.OS === "web"
      ? createElement(
          "ul",
          {
            "aria-hidden": expanded ? undefined : true,
            id: listId,
            onKeyDown: (event: ReactKeyboardEvent<HTMLUListElement>) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              onEscape();
            },
            role: "list",
            style: webSubnavStyle,
          },
          rows,
        )
      : createElement(
          View,
          {
            accessibilityElementsHidden: !expanded,
            accessibilityRole: "list",
            importantForAccessibility: expanded
              ? "auto"
              : "no-hide-descendants",
            nativeID: listId,
            style: styles.subnav,
          },
          rows,
        );

  return (
    <Animated.View
      pointerEvents={expanded ? "auto" : "none"}
      style={[
        styles.subnavAnimation,
        {
          maxHeight: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, maximumHeight],
          }),
          opacity: progress,
        },
      ]}
    >
      {list}
    </Animated.View>
  );
}

const webSubnavStyle: CSSProperties = {
  borderLeftColor: colors.neutral[200],
  borderLeftStyle: "solid",
  borderLeftWidth: 1,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  listStyle: "none",
  marginBottom: 0,
  marginLeft: 22,
  marginRight: 0,
  marginTop: 0,
  paddingBottom: 4,
  paddingLeft: 11,
  paddingRight: 0,
  paddingTop: 2,
};

const webSubnavItemStyle: CSSProperties = {
  position: "relative",
};

function SidebarNavItem({
  activeItemLabel,
  badges,
  disabled,
  disabledHint,
  expanded,
  item,
  onNavigate,
  onEscape,
  onToggle,
  rail,
  reducedMotion,
}: {
  activeItemLabel: string;
  badges: SidebarBadges;
  disabled: boolean;
  disabledHint: string;
  expanded: boolean;
  item: MerchantNavigationItem;
  onNavigate: (route: MerchantNavigationItem["route"]) => void;
  onEscape: () => void;
  onToggle: () => void;
  rail: boolean;
  reducedMotion: boolean;
}) {
  const groupId = sidebarItemId(item.label);
  const hasChildren = Boolean(item.children?.length);
  const activeChild = Boolean(
    item.children?.some((child) => child.label === activeItemLabel),
  );
  const active =
    !disabled &&
    ((!hasChildren && item.label === activeItemLabel) ||
      (hasChildren && activeChild && !expanded));

  return (
    <View>
      <SidebarNavRow
        active={active}
        badge={item.badge}
        controlsId={!rail && hasChildren ? childListId(groupId) : undefined}
        disabled={disabled}
        disabledHint={disabledHint}
        expanded={expanded}
        icon={item.icon}
        label={item.label}
        onPress={hasChildren ? onToggle : () => onNavigate(item.route)}
        rail={rail}
        reducedMotion={reducedMotion}
        showChevron={hasChildren}
        triggerId={hasChildren ? groupTriggerId(groupId) : undefined}
      />

      {!rail && item.children ? (
        <SidebarChildList
          activeItemLabel={activeItemLabel}
          badges={badges}
          disabled={disabled}
          expanded={expanded}
          groupId={groupId}
          items={item.children}
          onNavigate={onNavigate}
          onEscape={onEscape}
          reducedMotion={reducedMotion}
        />
      ) : null}
    </View>
  );
}

/**
 * The single brand region for both sidebar states: the full lockup while the
 * sidebar is expanded, and only the compact mark once it collapses to the rail.
 * Keeping both in one place means the collapse control is declared once and can
 * never drift out of alignment with whichever piece of artwork sits beside it.
 */
function SidebarBrand({
  onToggleRail,
  rail,
}: {
  onToggleRail: () => void;
  rail: boolean;
}) {
  return (
    <View
      style={[styles.brandRegion, rail && styles.brandRegionRail]}
      testID="merchant-sidebar-brand-region"
    >
      {rail ? (
        <VeloriMark
          size={SIDEBAR_MARK_HEIGHT}
          testID="merchant-sidebar-brand-mark"
        />
      ) : (
        <VeloriLogo
          maxWidth={SIDEBAR_LOGO_MAX_WIDTH}
          style={styles.brandLogo}
          testID="merchant-sidebar-brand-logo"
        />
      )}
      <SidebarPressable
        {...webTitle(rail ? "Expand sidebar" : "Collapse sidebar", rail)}
        accessibilityLabel={rail ? "Expand sidebar" : "Collapse sidebar"}
        accessibilityRole="button"
        className={sidebarActionClass}
        onPress={onToggleRail}
        style={styles.collapseButton}
      >
        <DashboardIcon
          name={rail ? "chevron-double-right" : "chevron-double-left"}
          size={20}
        />
      </SidebarPressable>
    </View>
  );
}

/**
 * Current-workspace card. It rests as a plain filled tile and only draws its
 * outline under the cursor, so hover reads as the card lifting off the sidebar
 * rather than as a colour wash. The resting border is transparent rather than
 * absent, which keeps the 1px reserved and stops the row shifting on hover.
 *
 * Hover is tracked here rather than with a `hover:` utility class because the
 * web pressable flattens these styles inline, and an inline declaration always
 * outranks a class.
 */
function SidebarWorkspaceCard({
  onPress,
  rail,
  session,
}: {
  onPress: () => void;
  rail: boolean;
  session: MerchantSession;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const outlined = hovered || pressed;

  return (
    <SidebarPressable
      {...webTitle(`${session.merchantName} · ${session.role}`, rail)}
      accessibilityLabel={`Current workspace ${session.merchantName}, ${session.role}`}
      accessibilityRole="button"
      className={`${focusRingClass} ${interactiveTransitionClass} cursor-pointer`}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.workspaceCard,
        rail && styles.workspaceCardRail,
        outlined && !rail && styles.workspaceCardHovered,
        outlined && rail && styles.workspaceCardRailHovered,
      ]}
      testID="merchant-sidebar-workspace-card"
    >
      <View
        style={[styles.merchantAvatar, rail && styles.merchantAvatarRail]}
        testID="merchant-sidebar-merchant-avatar"
      >
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
          <View style={styles.workspaceAccessory}>
            <DashboardIcon name="chevron-down" size={16} />
          </View>
        </>
      ) : null}
    </SidebarPressable>
  );
}

/**
 * Live counts keyed by navigation key, so a badge shows what the database
 * reports rather than a number baked into the navigation model.
 */
export type SidebarBadges = Readonly<Record<string, number | undefined>>;

export function MerchantSidebar({
  activeItemLabel = "Overview",
  badges = {},
  onClose,
  onToggleRail,
  rail,
  scrollDemo,
  session,
}: {
  activeItemLabel?: string;
  badges?: SidebarBadges;
  onClose?: () => void;
  onToggleRail: () => void;
  rail: boolean;
  scrollDemo?: "active" | "hover" | "scrolling";
  session: MerchantSession;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // Label, tone, icon and whether the storefront can be opened all come from one
  // shared map, so the sidebar never decides how a status reads.
  const storeStatus = presentStoreStatus(session);
  const [isScrolling, setIsScrolling] = useState(false);
  const [navigationContentHeight, setNavigationContentHeight] = useState(0);
  const [navigationViewportHeight, setNavigationViewportHeight] = useState(0);
  // The group that owns the page the merchant is on, if any.
  const activeGroupLabel = findMerchantNavigationGroupLabel(activeItemLabel);
  const activeGroupId = activeGroupLabel
    ? sidebarItemId(activeGroupLabel)
    : undefined;
  const [openGroupIds, setOpenGroupIds] = useState<Set<string>>(
    () => new Set(activeGroupId ? [activeGroupId] : []),
  );
  const lastActiveGroupId = useRef(activeGroupId);

  useEffect(
    () => () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    },
    [],
  );

  useEffect(() => {
    // Opens the group when the merchant arrives at one of its children, and
    // when they move between them. It deliberately does not re-open on every
    // render: a merchant who collapses the group while still on its page keeps
    // it collapsed.
    if (activeGroupId && activeGroupId !== lastActiveGroupId.current) {
      setOpenGroupIds(new Set([activeGroupId]));
    }
    lastActiveGroupId.current = activeGroupId;
  }, [activeGroupId]);

  const noteScrollActivity = () => {
    setIsScrolling(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsScrolling(false), 900);
  };

  const signOut = async () => {
    await signOutCurrentSession();
    router.replace("/sign-in");
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroupIds((current) => {
      if (current.has(groupId)) return new Set();
      return new Set([groupId]);
    });

    if (rail) onToggleRail();
  };

  const closeGroupFromKeyboard = (groupId: string) => {
    setOpenGroupIds((current) => {
      if (!current.has(groupId)) return current;
      const next = new Set(current);
      next.delete(groupId);
      return next;
    });

    if (Platform.OS === "web") {
      requestAnimationFrame(() => {
        document.getElementById(groupTriggerId(groupId))?.focus();
      });
    }
  };

  const navigationOverflows =
    navigationViewportHeight > 0 &&
    navigationContentHeight > navigationViewportHeight + 1;
  const navigationCanScroll = navigationOverflows || Boolean(scrollDemo);
  const navigationShowsScrollbar = navigationCanScroll && !rail;
  const navigationAccess = resolveMerchantNavigationAccess(session);
  const scrollClass = [
    "merchant-sidebar-nav",
    navigationCanScroll
      ? "merchant-sidebar-nav--scrollable st-scroll"
      : "merchant-sidebar-nav--static",
    rail && "merchant-sidebar-nav--rail",
    navigationCanScroll && isScrolling && "is-scrolling",
    navigationCanScroll && scrollDemo && `st-scroll--demo-${scrollDemo}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <View style={styles.sidebar} testID="merchant-sidebar">
      <SidebarBrand onToggleRail={onToggleRail} rail={rail} />

      <View
        style={[styles.workspaceRegion, rail && styles.workspaceRegionRail]}
        testID="merchant-sidebar-workspace-region"
      >
        <SidebarWorkspaceCard
          onPress={() => router.push("/auth/choose-workspace")}
          rail={rail}
          session={session}
        />
      </View>

      <ScrollView
        accessibilityLabel="Merchant sections"
        bounces={false}
        className={[scrollClass, navigationCanScroll && scrollFocusRingClass]
          .filter(Boolean)
          .join(" ")}
        contentContainerStyle={[
          styles.navContent,
          rail && styles.navContentRail,
        ]}
        onContentSizeChange={(_width, height) => {
          setNavigationContentHeight(Math.ceil(height));
        }}
        onLayout={(event) => {
          setNavigationViewportHeight(
            Math.ceil(event.nativeEvent.layout.height),
          );
        }}
        onScroll={noteScrollActivity}
        scrollEnabled={navigationCanScroll}
        scrollEventThrottle={120}
        showsVerticalScrollIndicator={navigationShowsScrollbar}
        style={styles.navRegion}
        tabIndex={navigationCanScroll ? 0 : -1}
      >
        {navigationAccess.map(({ disabled, item }) => {
          const groupId = sidebarItemId(item.label);
          const blockedByStore =
            session.storeStatus !== "active" &&
            navigationRequiresActiveStore(item);

          return (
            <SidebarNavItem
              activeItemLabel={activeItemLabel}
              badges={badges}
              disabled={disabled}
              disabledHint={blockedByStore ? inactiveStoreTitle : disabledTitle}
              expanded={openGroupIds.has(groupId)}
              item={item}
              key={item.label}
              onNavigate={(route) => {
                router.push(route);
                onClose?.();
              }}
              onEscape={() => closeGroupFromKeyboard(groupId)}
              onToggle={() => toggleGroup(groupId)}
              rail={rail}
              reducedMotion={reducedMotion}
            />
          );
        })}
      </ScrollView>

      <View style={[styles.utilityRegion, rail && styles.utilityRegionRail]}>
        {/* The rail has no room for a chip, so the status becomes an icon that
            still carries the full label to assistive technology and to the
            native tooltip — never a bare colour. */}
        <View
          accessibilityLabel={`Store status: ${storeStatus.shortLabel}`}
          accessibilityRole="text"
          style={[styles.storeStatusRow, rail && styles.storeStatusRowRail]}
          testID="sidebar-store-status"
          {...webTitle(storeStatus.label, rail)}
        >
          {rail ? (
            <View style={styles.storeStatusRail}>
              <DashboardIcon
                color={storeStatusRailColor(storeStatus.tone)}
                name={storeStatus.icon}
                size={18}
              />
            </View>
          ) : (
            <StatusChip
              icon={storeStatus.icon}
              label={storeStatus.label}
              tone={storeStatus.tone}
            />
          )}
        </View>
        <SidebarUtility
          disabled={!storeStatus.canViewStorefront}
          disabledHint={storeStatus.disabledReason}
          icon="open-in-new"
          label="View Storefront"
          onPress={() => {
            router.push(STOREFRONT_ROUTE);
            onClose?.();
          }}
          rail={rail}
        />
        <SidebarUtility
          icon="swap-horizontal"
          label="Switch Workspace"
          onPress={() => {
            router.push("/auth/choose-workspace");
            onClose?.();
          }}
          rail={rail}
        />
        <SidebarUtility
          icon="lifebuoy"
          label="Help & Support"
          onPress={() => setHelpOpen(true)}
          rail={rail}
        />
        <SidebarUtility
          icon="logout"
          label="Sign Out"
          onPress={() => void signOut()}
          rail={rail}
        />
      </View>

      <HelpSupportDialog
        onClose={() => setHelpOpen(false)}
        visible={helpOpen}
      />

      {onClose ? (
        <SidebarPressable
          accessibilityLabel="Close navigation"
          accessibilityRole="button"
          className={sidebarActionClass}
          onPress={onClose}
          style={styles.mobileClose}
        >
          <DashboardIcon name="close" size={22} />
        </SidebarPressable>
      ) : null}
    </View>
  );
}

function SidebarUtility({
  disabled = false,
  disabledHint,
  icon,
  label,
  onPress,
  rail,
}: {
  disabled?: boolean;
  disabledHint?: string;
  icon: DashboardIconName;
  label: string;
  onPress?: () => void;
  rail: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const emphasized = hovered && !disabled;
  // A disabled row keeps its tooltip at every width — the rail relies on one to
  // name the action at all, and a blocked action needs to say why.
  const tooltip = disabled ? (disabledHint ?? label) : label;

  return (
    <SidebarPressable
      {...webTitle(tooltip, rail || disabled)}
      aria-disabled={disabled}
      accessibilityHint={disabled ? disabledHint : undefined}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`${focusRingClass} ${interactiveTransitionClass} ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      }`}
      disabled={disabled}
      onHoverIn={() => {
        if (!disabled) setHovered(true);
      }}
      onHoverOut={() => setHovered(false)}
      onPress={disabled ? undefined : onPress}
      onPressIn={() => {
        if (!disabled) setPressed(true);
      }}
      onPressOut={() => setPressed(false)}
      style={[
        styles.utilityItem,
        rail && styles.utilityItemRail,
        emphasized && styles.navItemHovered,
        pressed && !disabled && styles.navItemPressed,
        disabled && styles.navItemDisabled,
      ]}
      testID={`sidebar-utility-${sidebarItemId(label)}`}
    >
      <DashboardIcon
        color={emphasized ? colors.brand.primary : colors.neutral[550]}
        name={icon}
      />
      {!rail ? (
        <StylishText
          numberOfLines={1}
          style={[styles.utilityLabel, emphasized && styles.navLabelHovered]}
          unstyled
          variant="navigation"
        >
          {label}
        </StylishText>
      ) : null}
      {disabled && !rail ? (
        <View pointerEvents="none" style={styles.navLock}>
          <DashboardIcon name="lock-outline" size={14} />
        </View>
      ) : null}
    </SidebarPressable>
  );
}

const styles = StyleSheet.create({
  avatarLabel: {
    color: colors.feedback.danger,
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: typography.fontSize.navigation,
    lineHeight: typography.lineHeight.navigation,
  },
  brandRegion: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    // Minimum clearance between the lockup and the collapse control; the logo's
    // own cap leaves more than this at the sidebar's normal width.
    gap: spacing.md,
    height: SIDEBAR_BRAND_HEIGHT,
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  // No minimum width: while the sidebar animates open the lockup scales up with
  // it, and a floor here would push the collapse control out of the clipped box.
  brandLogo: { flexShrink: 1 },
  brandRegionRail: {
    alignItems: "center",
    flexDirection: "column",
    gap: spacing.xs,
    // The rail keeps the expanded header height so the navigation below starts
    // at the same place in both states. Centring the stack inside it is what
    // stops the mark sitting flush against the top edge and reading as clipped.
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  collapseButton: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    flexShrink: 0,
    height: COLLAPSE_CONTROL_SIZE,
    justifyContent: "center",
    width: COLLAPSE_CONTROL_SIZE,
  },
  countBadge: {
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: colors.brand.primary,
    borderRadius: borderRadius.pill,
    flexShrink: 0,
    height: 20,
    justifyContent: "center",
    minWidth: 22,
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: colors.neutral[0],
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: 11,
    lineHeight: 16,
  },
  countBadgeDot: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.neutral[0],
    borderRadius: borderRadius.pill,
    // `borderStyle` is required alongside an all-sides `borderWidth`: on web
    // these serialise to the `border` shorthand, which resets the omitted style
    // to `none` and silently collapses the rendered width to zero.
    borderStyle: "solid",
    borderWidth: 1,
    height: 8,
    position: "absolute",
    right: 0,
    top: 0,
    width: 8,
  },
  merchantAvatar: {
    alignItems: "center",
    backgroundColor: colors.brand.socialSurface,
    borderRadius: borderRadius.input,
    height: MERCHANT_AVATAR_SIZE,
    justifyContent: "center",
    width: MERCHANT_AVATAR_SIZE,
  },
  merchantAvatarRail: { height: 40, width: 40 },
  mobileClose: {
    alignItems: "center",
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.pill,
    borderStyle: "solid",
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: -56,
    top: spacing.md,
    width: 44,
  },
  navContent: {
    // No trailing padding and no inter-row gap: each row already carries its
    // own 44px target and vertical padding, and the utility region below
    // supplies the separating border and its own top padding. Spacing here
    // would only add scroll range that holds nothing, which is what made the
    // collapsed sidebar report an overflow it did not have.
    paddingHorizontal: spacing.sm,
  },
  navContentRail: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 0,
  },
  navItem: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "relative",
    width: "100%",
  },
  navItemActive: { backgroundColor: colors.brand.socialSurface },
  navItemDisabled: { opacity: 0.6 },
  navItemHovered: { backgroundColor: colors.brand.socialSurface },
  navItemPressed: { backgroundColor: pressedRowBackground },
  navItemRail: {
    alignSelf: "center",
    flexShrink: 0,
    height: 44,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 0,
    position: "relative",
    width: 44,
  },
  navAccessory: {
    alignItems: "center",
    flexShrink: 0,
    justifyContent: "center",
    marginLeft: "auto",
    minHeight: 20,
    minWidth: 16,
  },
  navAccessoryRail: {
    height: 12,
    marginLeft: 0,
    minHeight: 12,
    minWidth: 12,
    position: "absolute",
    right: 2,
    top: 2,
    width: 12,
  },
  navChevron: {
    alignItems: "center",
    flexShrink: 0,
    height: 16,
    justifyContent: "center",
    width: 16,
  },
  navIcon: {
    alignItems: "center",
    flexShrink: 0,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  navLabel: {
    color: colors.ink.primary,
    flex: 1,
    fontFamily: typography.fontFamily.montserratMedium,
    fontSize: typography.fontSize.navigation,
    lineHeight: typography.lineHeight.navigation,
    minWidth: 0,
  },
  navLabelActive: {
    color: colors.feedback.danger,
    fontFamily: typography.fontFamily.montserratSemibold,
  },
  navLabelHovered: { color: colors.feedback.danger },
  navLock: {
    alignItems: "center",
    flexShrink: 0,
    height: 16,
    justifyContent: "center",
    width: 16,
  },
  navRegion: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  sidebar: {
    backgroundColor: colors.neutral[0],
    borderRightColor: colors.neutral[200],
    borderRightWidth: 1,
    flex: 1,
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
    // Clearance above the logo, in both states, without changing the brand
    // band the two layouts share.
    paddingTop: spacing.sm,
    // Fills whatever width the shell gives it, so collapsing can be animated
    // from the outside without the sidebar fighting it with a fixed width.
    width: "100%",
  },
  subnav: {
    borderLeftColor: colors.neutral[200],
    borderLeftWidth: 1,
    gap: 2,
    marginLeft: 22,
    paddingBottom: 4,
    paddingLeft: 11,
    paddingTop: 2,
  },
  subnavItem: {
    borderRadius: borderRadius.sm,
    height: 40,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  subnavAnimation: { overflow: "hidden" },
  subnavListItem: { position: "relative" },
  subnavLabel: {
    color: colors.neutral[550],
    fontFamily: typography.fontFamily.montserratMedium,
    fontSize: typography.fontSize.label,
    lineHeight: typography.lineHeight.label,
  },
  utilityItem: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  utilityItemRail: {
    alignSelf: "center",
    height: 44,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 0,
    width: 44,
  },
  utilityLabel: {
    color: colors.neutral[550],
    flex: 1,
    fontFamily: typography.fontFamily.montserratMedium,
    fontSize: typography.fontSize.label,
    lineHeight: typography.lineHeight.label,
    minWidth: 0,
  },
  utilityRegion: {
    borderTopColor: colors.neutral[200],
    borderTopWidth: 1,
    flexShrink: 0,
    gap: 2,
    marginTop: "auto",
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: 13,
  },
  utilityRegionRail: { alignItems: "center", paddingHorizontal: spacing.sm },
  workspaceCard: {
    alignItems: "center",
    backgroundColor: colors.neutral[50],
    // Reserved, not absent: the outline appears on hover, and keeping the width
    // here means only the colour changes so the row never shifts.
    borderColor: "transparent",
    borderRadius: borderRadius.md,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: MERCHANT_CARD_HEIGHT,
    padding: spacing.sm,
  },
  workspaceCardHovered: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
  },
  workspaceCardRail: {
    alignSelf: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    height: 44,
    justifyContent: "center",
    minHeight: 44,
    padding: 2,
    width: 44,
  },
  // The rail has no room for an outline, so it takes the same tinted hover the
  // rest of the rail's icon buttons use.
  workspaceCardRailHovered: { backgroundColor: colors.brand.socialSurface },
  workspaceCopy: { flex: 1, gap: 2, minWidth: 0 },
  workspaceAccessory: {
    alignItems: "center",
    flexShrink: 0,
    height: 16,
    justifyContent: "center",
    width: 16,
  },
  workspaceName: {
    color: colors.ink.primary,
    fontFamily: typography.fontFamily.montserratSemibold,
    fontSize: typography.fontSize.navigation,
    lineHeight: typography.lineHeight.navigation,
  },
  workspaceRegion: {
    flexShrink: 0,
    height: SIDEBAR_WORKSPACE_HEIGHT,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  // Centres the rail's shorter avatar block in the band the expanded card
  // fills, so the avatar keeps the same centre line in both states.
  workspaceRegionRail: {
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  workspaceRole: {
    color: colors.neutral[550],
    fontFamily: typography.fontFamily.montserratMedium,
    fontSize: 11,
    lineHeight: 16,
  },
  storeStatusRow: {
    height: 34,
    justifyContent: "center",
  },
  storeStatusRail: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  // The rail keeps the same 34px band the chip occupies, so collapsing the
  // sidebar does not shift the four actions below it.
  storeStatusRowRail: { alignItems: "center" },
});

/** The rail shows the status as a tinted icon, using the chip's own tones. */
function storeStatusRailColor(tone: StoreStatusPresentation["tone"]) {
  return {
    danger: colors.feedback.danger,
    green: colors.feedback.success,
    neutral: colors.neutral[550],
    warning: colors.feedback.warning,
  }[tone];
}
