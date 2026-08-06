import { Image, type ImageSource } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { colors, typography } from "@/constants/design-tokens";

export type AuthAlertTone = "error" | "info" | "warning";

const TONE_STYLES: Record<
  AuthAlertTone,
  {
    backgroundColor: string;
    borderColor: string;
    icon: ImageSource;
    textColor: string;
  }
> = {
  error: {
    backgroundColor: "#FDECEF",
    borderColor: "#F3B7C2",
    icon: require("@/assets/icons/auth-alert-error.svg"),
    textColor: "#9F1330",
  },
  info: {
    backgroundColor: "rgba(207, 226, 252, 0.5)",
    borderColor: colors.brand.blueSoft,
    icon: require("@/assets/icons/auth-alert-info.svg"),
    textColor: "#1B5AAB",
  },
  warning: {
    backgroundColor: "#FFF6E6",
    borderColor: "#F3D9A4",
    icon: require("@/assets/icons/auth-alert-warning.svg"),
    textColor: "#8A5A00",
  },
};

type AuthAlertBannerProps = {
  actionLabel?: string;
  busy?: boolean;
  compact?: boolean;
  message: string;
  onAction?: () => void;
  tone: AuthAlertTone;
};

export function AuthAlertBanner({
  actionLabel,
  busy = false,
  compact = false,
  message,
  onAction,
  tone,
}: AuthAlertBannerProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <View
      accessibilityLiveRegion={tone === "info" ? "polite" : "assertive"}
      accessibilityRole="alert"
      style={[
        styles.container,
        compact && styles.containerCompact,
        {
          backgroundColor: toneStyle.backgroundColor,
          borderColor: toneStyle.borderColor,
        },
      ]}
      testID="auth-alert-banner"
    >
      <Image
        accessible={false}
        contentFit="contain"
        source={toneStyle.icon}
        style={[styles.icon, compact && styles.iconCompact]}
      />
      <View style={styles.content}>
        <StylishText
          style={[
            styles.message,
            compact && styles.messageCompact,
            { color: toneStyle.textColor },
          ]}
          testID="auth-alert-message"
          variant="body"
        >
          {message}
        </StylishText>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            hitSlop={6}
            onPress={onAction}
            style={({ pressed }) => [
              styles.action,
              pressed && !busy && styles.actionPressed,
              busy && styles.actionDisabled,
            ]}
            testID="auth-alert-action"
          >
            <StylishText
              className="text-brand-primary underline"
              variant="navigation-strong"
            >
              {busy ? "Sending…" : actionLabel}
            </StylishText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    alignSelf: "flex-start",
    justifyContent: "center",
    marginTop: 2,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  actionDisabled: { opacity: 0.6 },
  actionPressed: { opacity: 0.72 },
  container: {
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    width: "100%",
  },
  containerCompact: {
    borderRadius: 8,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  content: { flex: 1, minWidth: 0 },
  icon: { height: 18, marginTop: 1, width: 18 },
  iconCompact: { height: 16, width: 16 },
  message: {
    fontSize: typography.fontSize.label,
    lineHeight: typography.lineHeight.label,
  },
  messageCompact: {
    fontSize: typography.fontSize.caption,
    lineHeight: typography.lineHeight.caption,
  },
});
