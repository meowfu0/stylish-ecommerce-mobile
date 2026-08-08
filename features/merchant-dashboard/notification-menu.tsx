import { Pressable, StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  AnchoredPopover,
  type MenuAnchor,
} from "@/features/merchant-dashboard/dashboard-menu";
import { formatCount } from "@/features/merchant-dashboard/dashboard-format";
import type { DashboardNotification } from "@/features/merchant-dashboard/dashboard-types";

/**
 * The bell's notification panel. It reuses `AnchoredPopover` for positioning
 * and dismissal, so the surface, the Escape handling and the outside-click
 * behaviour are the same ones the dashboard's other dropdowns use.
 *
 * Rows come from whatever the caller passes; the unread count is derived rather
 * than supplied, so the heading can never disagree with the list beneath it.
 */
export function NotificationMenu({
  anchor,
  notifications,
  onClose,
  onSeeAll,
  visible,
}: {
  anchor: MenuAnchor | null;
  notifications: readonly DashboardNotification[];
  onClose: () => void;
  /** Opens the fuller notification surface the dashboard already provides. */
  onSeeAll?: () => void;
  visible: boolean;
}) {
  const unread = notifications.filter((item) => item.unread).length;

  return (
    <AnchoredPopover
      accessibilityLabel="Notifications"
      anchor={anchor}
      maxWidth={360}
      minWidth={300}
      onClose={onClose}
      testID="header-notifications-menu"
      visible={visible}
    >
      <View style={styles.heading}>
        <StylishText
          accessibilityRole="header"
          style={styles.title}
          unstyled
          variant="label"
        >
          Notifications
        </StylishText>
        <StylishText style={styles.unreadCount} unstyled variant="caption">
          {formatCount(unread)} unread
        </StylishText>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <StylishText style={styles.emptyText} unstyled variant="caption">
            You&apos;re all caught up.
          </StylishText>
        </View>
      ) : (
        notifications.map((item, index) => (
          <View
            key={item.key}
            // Hairline separators between rows; the last leaves the panel's own
            // padding as its bottom edge.
            style={[
              styles.row,
              index < notifications.length - 1 && styles.rowDivided,
            ]}
            testID={`notification-${item.key}`}
          >
            <View
              style={[styles.dot, item.unread ? styles.dotUnread : styles.dotRead]}
              testID={`notification-dot-${item.key}`}
            />
            <View style={styles.rowCopy}>
              <StylishText style={styles.message} unstyled variant="label">
                {item.message}
              </StylishText>
              <StylishText style={styles.meta} unstyled variant="caption">
                {item.unread ? `${item.time} · Unread` : item.time}
              </StylishText>
            </View>
          </View>
        ))
      )}

      {onSeeAll ? (
        <Pressable
          accessibilityRole="button"
          className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
          onPress={() => {
            onClose();
            onSeeAll();
          }}
          style={styles.seeAll}
          testID="notifications-see-all"
        >
          <StylishText style={styles.seeAllLabel} unstyled variant="caption">
            See all notifications
          </StylishText>
        </Pressable>
      ) : null}
    </AnchoredPopover>
  );
}

const styles = StyleSheet.create({
  dot: { borderRadius: borderRadius.pill, height: 8, marginTop: 5, width: 8 },
  dotRead: { backgroundColor: colors.neutral[300] },
  dotUnread: { backgroundColor: colors.brand.primary },
  empty: { paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  emptyText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  message: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  meta: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowCopy: { flex: 1, gap: 1, minWidth: 0 },
  rowDivided: {
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
  },
  seeAll: {
    alignItems: "center",
    borderTopColor: colors.neutral[200],
    borderTopWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  seeAllLabel: {
    color: colors.brand.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  title: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },
  unreadCount: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
});
