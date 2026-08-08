import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  DashboardIcon,
  type DashboardIconName,
} from "@/features/merchant-dashboard/dashboard-primitives";
import { useReducedMotion } from "@/features/merchant-dashboard/use-reduced-motion";

/**
 * Anchored dropdown used by the dashboard's row and field menus.
 *
 * It follows the header popover's pattern — a transparent modal over a
 * dismissing backdrop — but positions itself against a measured trigger rather
 * than a fixed corner, so a menu can belong to a specific table row. Opening
 * fades and lifts the panel into place, and honours the platform's reduce
 * motion setting.
 */

export type MenuAnchor = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type DashboardMenuItem = {
  disabled?: boolean;
  icon?: DashboardIconName;
  key: string;
  label: string;
  onPress?: () => void;
  selected?: boolean;
};

const MENU_MARGIN = 8;

/**
 * The floating surface itself: anchored to a measured trigger, dismissed by
 * backdrop, Escape or the Android back gesture, and animated open. Shared by
 * the option menus and the notifications panel so there is one implementation
 * of the positioning and dismiss rules.
 */
export function AnchoredPopover({
  accessibilityLabel,
  align = "end",
  anchor,
  children,
  maxWidth,
  minWidth = 180,
  onClose,
  testID,
  visible,
}: {
  accessibilityLabel: string;
  /** Which edge of the trigger the panel lines up with. */
  align?: "end" | "start";
  anchor: MenuAnchor | null;
  children: ReactNode;
  maxWidth?: number;
  minWidth?: number;
  onClose: () => void;
  testID?: string;
  visible: boolean;
}) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const [panel, setPanel] = useState({ height: 0, width: 0 });

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(visible ? 1 : 0);
      return;
    }
    const animation = Animated.timing(progress, {
      duration: visible ? 160 : 120,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion, visible]);

  useEffect(() => {
    // `Modal.onRequestClose` covers the Android back gesture; on web the
    // dismiss key is Escape, which it does not report.
    if (Platform.OS !== "web" || !visible || typeof document === "undefined") {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, visible]);

  // Visibility never depends on measurement: if `measureInWindow` has not
  // reported yet the menu still opens, pinned to the safe margin, rather than
  // leaving the trigger dead.
  const frame = anchor ?? { height: 0, width: 0, x: MENU_MARGIN, y: MENU_MARGIN };
  const width = Math.max(minWidth, panel.width);
  // Flip to the other side of the trigger rather than hanging off the viewport.
  const rawLeft = align === "end" ? frame.x + frame.width - width : frame.x;
  const left = Math.min(
    Math.max(MENU_MARGIN, rawLeft),
    Math.max(MENU_MARGIN, windowWidth - width - MENU_MARGIN),
  );
  const below = frame.y + frame.height + 4;
  const opensUpward =
    panel.height > 0 && below + panel.height > windowHeight - MENU_MARGIN;
  const top = opensUpward
    ? Math.max(MENU_MARGIN, frame.y - panel.height - 4)
    : below;

  return (
    <Modal onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        accessibilityLabel="Close menu"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
      >
        <Animated.View
          accessibilityLabel={accessibilityLabel}
          onLayout={(event) => {
            const { height, width: measured } = event.nativeEvent.layout;
            setPanel({ height, width: measured });
          }}
          style={[
            styles.panel,
            {
              left,
              maxWidth,
              minWidth,
              opacity: progress,
              top,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [opensUpward ? 6 : -6, 0],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
          testID={testID}
        >
          {children}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/** A list of options inside the shared popover. */
export function DashboardMenu({
  items,
  onClose,
  ...popover
}: {
  accessibilityLabel: string;
  align?: "end" | "start";
  anchor: MenuAnchor | null;
  items: readonly DashboardMenuItem[];
  minWidth?: number;
  onClose: () => void;
  testID?: string;
  visible: boolean;
}) {
  return (
    <AnchoredPopover onClose={onClose} {...popover}>
      {items.map((item) => (
        <MenuRow item={item} key={item.key} onClose={onClose} />
      ))}
    </AnchoredPopover>
  );
}

function MenuRow({
  item,
  onClose,
}: {
  item: DashboardMenuItem;
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ disabled: item.disabled, selected: item.selected }}
      className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
      disabled={item.disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => {
        item.onPress?.();
        onClose();
      }}
      style={[
        styles.item,
        hovered && !item.disabled && styles.itemHovered,
        item.disabled && styles.itemDisabled,
      ]}
      testID={`menu-item-${item.key}`}
    >
      {/* One leading slot, always reserved so labels line up: the selected row
          shows a check where the others show their own icon. */}
      <View style={styles.itemIcon}>
        {item.selected ? (
          <DashboardIcon color={colors.ink.primary} name="check" size={16} />
        ) : item.icon ? (
          <DashboardIcon
            color={item.disabled ? colors.neutral[400] : colors.neutral[550]}
            name={item.icon}
            size={16}
          />
        ) : null}
      </View>
      <StylishText
        numberOfLines={1}
        style={[styles.itemLabel, item.disabled && styles.itemLabelDisabled]}
        unstyled
        variant="caption"
      >
        {item.label}
      </StylishText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  item: {
    alignItems: "center",
    borderRadius: borderRadius.sm,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  itemDisabled: { opacity: 0.45 },
  itemIcon: { alignItems: "center", width: 16 },
  itemHovered: { backgroundColor: colors.neutral[75] },
  itemLabel: {
    color: colors.ink.primary,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  itemLabelDisabled: { color: colors.neutral[450] },
  panel: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderStyle: "solid",
    borderWidth: 1,
    elevation: 8,
    padding: spacing.xxs,
    position: "absolute",
    shadowColor: "#11223B",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
  },
});
