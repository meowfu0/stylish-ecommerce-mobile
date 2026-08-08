import { useEffect, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { DashboardIcon } from "@/features/merchant-dashboard/dashboard-primitives";

/**
 * The dashboard's dialog shell.
 *
 * It follows the pattern the app's other modals already use — a transparent
 * `Modal` over a dismissing backdrop inside a `KeyboardAvoidingView` — and adds
 * the two things a dashboard dialog needs: the card treatment the rest of the
 * surface uses (white, 16px radius, `neutral[200]` border), and a sheet form on
 * phones so a long form is reachable with one thumb.
 *
 * Dismissal is deliberately blocked while `busy`, so a submit in flight cannot
 * be orphaned by a stray backdrop tap or Escape.
 */
export function DashboardDialog({
  busy = false,
  children,
  description,
  footer,
  onClose,
  testID,
  title,
  visible,
  width = 640,
}: {
  busy?: boolean;
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  testID?: string;
  title: string;
  visible: boolean;
  /** Desktop width; phones always take the full viewport. */
  width?: number;
}) {
  const { height, width: viewportWidth } = useWindowDimensions();
  // The dashboard's own tablet breakpoint, so a dialog changes shape where the
  // page behind it does.
  const sheet = viewportWidth <= 768;

  useEffect(() => {
    // `Modal.onRequestClose` covers the Android back gesture; on web the dismiss
    // key is Escape, which it does not report.
    if (Platform.OS !== "web" || !visible || typeof document === "undefined") {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose, visible]);

  const dismiss = () => {
    if (!busy) onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding" })}
        style={[styles.layer, sheet ? styles.layerSheet : styles.layerCentered]}
      >
        <Pressable
          accessibilityLabel={`Close ${title}`}
          accessibilityRole="button"
          disabled={busy}
          onPress={dismiss}
          style={styles.backdrop}
        />

        <View
          accessibilityLabel={title}
          accessibilityViewIsModal
          style={[
            styles.dialog,
            sheet
              ? { maxHeight: height * 0.92, width: viewportWidth }
              : { maxWidth: width, width: "100%" },
            sheet ? styles.dialogSheet : styles.dialogCentered,
          ]}
          testID={testID}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <StylishText
                accessibilityRole="header"
                style={styles.title}
                unstyled
                variant="headingSmall"
              >
                {title}
              </StylishText>
              {description ? (
                <StylishText
                  style={styles.description}
                  unstyled
                  variant="caption"
                >
                  {description}
                </StylishText>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
              disabled={busy}
              onPress={dismiss}
              style={styles.close}
              testID={testID ? `${testID}-close` : undefined}
            >
              <DashboardIcon name="close" size={20} />
            </Pressable>
          </View>

          <ScrollView
            className="st-scroll"
            contentContainerStyle={styles.bodyContent}
            style={styles.body}
          >
            {children}
          </ScrollView>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(17,24,28,0.42)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { gap: spacing.md, padding: spacing.lg },
  close: {
    alignItems: "center",
    borderRadius: borderRadius.sm,
    flexShrink: 0,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  description: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  dialog: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    // Required alongside an all-sides `borderWidth`: on web these serialise to
    // the `border` shorthand, which resets the omitted style to `none` and
    // silently collapses the outline to zero width.
    borderStyle: "solid",
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#11223B",
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 36,
  },
  dialogCentered: { borderRadius: borderRadius.lg, maxHeight: "88%" },
  dialogSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  footer: {
    borderTopColor: colors.neutral[200],
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "flex-end",
    padding: spacing.lg,
  },
  header: {
    alignItems: "flex-start",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  headerCopy: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  layer: { flex: 1 },
  layerCentered: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  layerSheet: { justifyContent: "flex-end" },
  title: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    lineHeight: 26,
  },
});
