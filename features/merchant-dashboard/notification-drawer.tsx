import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { dashboardNotifications } from "@/features/merchant-dashboard/dashboard-data";
import {
  DashboardIcon,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";

export function NotificationDrawer({
  docked,
  onClose,
  session,
}: {
  docked: boolean;
  onClose?: () => void;
  session: MerchantSession;
}) {
  return (
    <View style={[styles.drawer, !docked && styles.overlayDrawer]}>
      <View style={styles.heading}>
        <View style={styles.headingLabel}>
          <DashboardIcon color={colors.brand.primary} name="bell-outline" />
          <StylishText style={styles.title} unstyled variant="headingSmall">
            Notifications
          </StylishText>
        </View>
        <StylishText style={styles.unread} unstyled variant="caption">
          3 unread
        </StylishText>
        {onClose ? (
          <Pressable
            accessibilityLabel="Close notifications"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
          >
            <DashboardIcon name="close" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        bounces={false}
        className="st-scroll"
        contentContainerStyle={styles.content}
      >
        <View style={styles.notificationList}>
          {dashboardNotifications.map((notification) => (
            <View
              key={notification.key}
              style={[
                styles.notification,
                notification.unread && styles.notificationUnread,
              ]}
            >
              <StylishText
                style={styles.notificationMessage}
                unstyled
                variant="bodySmall"
              >
                {notification.message}
              </StylishText>
              <StylishText
                style={styles.notificationTime}
                unstyled
                variant="caption"
              >
                {notification.time}
              </StylishText>
            </View>
          ))}
        </View>

        <DrawerSection title="Quick details">
          <QuickDetail
            icon="map-marker-outline"
            label="Default location"
            value={session.defaultLocation}
          />
          <QuickDetail
            icon="wallet-outline"
            label="Next payout"
            value="₱286,400 · Aug 5"
          />
          <QuickDetail
            icon="clock-outline"
            label="Avg. fulfillment time"
            value="1.4 days"
          />
        </DrawerSection>

        <DrawerSection title="Workspace">
          <View style={styles.workspaceCard}>
            <StylishText style={styles.merchantName} unstyled variant="label">
              {session.merchantName}
            </StylishText>
            <StatusChip label={session.role} tone="pink" />
            <StylishText
              style={styles.workspaceNote}
              unstyled
              variant="caption"
            >
              Role and permissions are assigned by the merchant owner and
              resolved by the backend.
            </StylishText>
          </View>
        </DrawerSection>
      </ScrollView>
    </View>
  );
}

function DrawerSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <StylishText style={styles.sectionTitle} unstyled variant="headingSmall">
        {title}
      </StylishText>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function QuickDetail({
  icon,
  label,
  value,
}: {
  icon: "clock-outline" | "map-marker-outline" | "wallet-outline";
  label: string;
  value: string;
}) {
  return (
    <View style={styles.quickDetail}>
      <DashboardIcon name={icon} />
      <View style={styles.quickDetailCopy}>
        <StylishText style={styles.quickLabel} unstyled variant="caption">
          {label}
        </StylishText>
        <StylishText style={styles.quickValue} unstyled variant="label">
          {value}
        </StylishText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    marginLeft: "auto",
    width: 44,
  },
  content: { gap: spacing.lg, padding: spacing.lg },
  drawer: {
    backgroundColor: colors.neutral[0],
    borderLeftColor: colors.neutral[200],
    borderLeftWidth: 1,
    flexShrink: 0,
    minHeight: 0,
    width: 320,
  },
  heading: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 64,
    paddingHorizontal: spacing.md,
  },
  headingLabel: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  merchantName: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
  },
  notification: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 4,
    padding: spacing.sm,
  },
  notificationList: { gap: spacing.xs },
  notificationMessage: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  notificationTime: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  notificationUnread: {
    backgroundColor: colors.feedback.dangerSoft,
    borderColor: colors.brand.pinkSoft,
  },
  overlayDrawer: {
    bottom: 0,
    elevation: 24,
    position: "absolute",
    right: 0,
    shadowColor: colors.ink.primary,
    shadowOffset: { height: 0, width: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    top: 0,
    zIndex: 50,
  },
  quickDetail: {
    alignItems: "flex-start",
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  quickDetailCopy: { flex: 1 },
  quickLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  quickValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  section: { gap: spacing.sm },
  sectionContent: { gap: spacing.xs },
  sectionTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  title: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  unread: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginLeft: "auto",
  },
  workspaceCard: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  workspaceNote: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 17,
  },
});
