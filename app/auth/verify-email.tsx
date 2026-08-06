import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AuthAlertBanner,
  type AuthAlertTone,
} from "@/components/auth/auth-alert-banner";
import { StylishLogo } from "@/components/brand/stylish-logo";
import { StylishText } from "@/components/typography/stylish-text";
import { colors, typography } from "@/constants/design-tokens";
import {
  AuthRequestError,
  resendVerificationEmail,
  verifyEmail,
} from "@/services/auth/auth-api";
import {
  clearPendingVerificationEmail,
  getPendingVerificationEmail,
  savePendingVerificationEmail,
} from "@/services/auth/auth-storage";

const RESEND_COOLDOWN_SECONDS = 60;
const VERIFIED_REDIRECT_DELAY_MS = 3_000;

type VerificationStatus =
  | "awaiting"
  | "expired-link"
  | "invalid-link"
  | "verification-error"
  | "verified"
  | "verifying";

type VerificationNotice = {
  key: string;
  message: string;
  tone: AuthAlertTone;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusFromReason(reason: string | undefined): VerificationStatus {
  if (reason === "expired" || reason === "expired-link") {
    return "expired-link";
  }

  if (reason === "invalid" || reason === "invalid-link") {
    return "invalid-link";
  }

  return "awaiting";
}

function noticeForInitialStatus(
  status: VerificationStatus,
): VerificationNotice | null {
  if (status === "expired-link") {
    return {
      key: "expired-link",
      message: "Verify your email before signing in.",
      tone: "warning",
    };
  }

  if (status === "invalid-link") {
    return {
      key: "invalid-link",
      message: "Request a new verification email to continue.",
      tone: "warning",
    };
  }

  return null;
}

function resendErrorNotice(error: unknown): VerificationNotice {
  if (error instanceof AuthRequestError) {
    if (error.kind === "rate-limited") {
      return {
        key: "rate-limited",
        message: "Too many requests. Please wait before trying again.",
        tone: "warning",
      };
    }

    if (error.kind === "network") {
      return {
        key: "network-error",
        message:
          "We couldn’t connect right now. Check your connection and try again.",
        tone: "error",
      };
    }
  }

  return {
    key: "resend-error",
    message: "The verification request could not be completed. Try again.",
    tone: "error",
  };
}

function verificationErrorNotice(error: unknown): VerificationNotice {
  if (error instanceof AuthRequestError) {
    if (error.kind === "rate-limited") {
      return {
        key: "verify-rate-limited",
        message:
          "Too many verification attempts. Please wait before trying again.",
        tone: "warning",
      };
    }

    if (error.kind === "network") {
      return {
        key: "verify-network-error",
        message:
          "We couldn’t verify this link right now. Check your connection and try again.",
        tone: "error",
      };
    }
  }

  return {
    key: "verify-server-error",
    message: "Verification is temporarily unavailable. Please try again.",
    tone: "error",
  };
}

function VerificationStateIcon({
  compact,
  status,
}: {
  compact: boolean;
  status: VerificationStatus;
}) {
  const iconSize = compact ? 26 : 30;
  const circleStyle = [
    styles.iconCircle,
    compact && styles.iconCircleCompact,
    status === "verified" && styles.iconCircleSuccess,
    (status === "expired-link" || status === "invalid-link") &&
      styles.iconCircleWarning,
    status === "verification-error" && styles.iconCircleWarning,
  ];

  if (status === "verified") {
    return (
      <View
        accessibilityLabel="Email verified"
        accessibilityRole="image"
        style={circleStyle}
      >
        <MaterialCommunityIcons
          color={colors.feedback.success}
          name="check-circle-outline"
          size={iconSize}
        />
      </View>
    );
  }

  if (status === "expired-link" || status === "invalid-link") {
    return (
      <View
        accessibilityLabel="Verification link unavailable"
        accessibilityRole="image"
        style={circleStyle}
      >
        <MaterialCommunityIcons
          color="#8A5A00"
          name="link-variant-off"
          size={iconSize}
        />
      </View>
    );
  }

  if (status === "verification-error") {
    return (
      <View
        accessibilityLabel="Verification unavailable"
        accessibilityRole="image"
        style={circleStyle}
      >
        <MaterialCommunityIcons
          color="#8A5A00"
          name="alert-circle-outline"
          size={iconSize}
        />
      </View>
    );
  }

  return (
    <View
      accessibilityLabel="Verification email"
      accessibilityRole="image"
      style={circleStyle}
    >
      <Image
        accessible={false}
        contentFit="contain"
        source={require("@/assets/icons/auth-verify-email.svg")}
        style={compact ? styles.iconCompact : styles.icon}
      />
    </View>
  );
}

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string | string[];
    reason?: string | string[];
    token?: string | string[];
  }>();
  const navigationStartedRef = useRef(false);
  const verificationInFlightRef = useRef(false);
  const verifiedTokenRef = useRef<string | null>(null);
  const routeEmail = firstParam(params.email)?.trim().toLowerCase();
  const token = firstParam(params.token);
  const initialReason = firstParam(params.reason);
  const initialStatus = token ? "verifying" : statusFromReason(initialReason);
  const { height, width } = useWindowDimensions();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(
    routeEmail ?? null,
  );
  const [status, setStatus] = useState<VerificationStatus>(initialStatus);
  const [notice, setNotice] = useState<VerificationNotice | null>(() =>
    noticeForInitialStatus(statusFromReason(initialReason)),
  );
  const [isOpeningEmail, setIsOpeningEmail] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const compact = height < 720;
  const desktop = Platform.OS === "web" && width >= 1024;
  const cardPadding = compact ? 24 : width < 600 ? 28 : 41;
  const logoWidth = desktop ? 190 : width < 480 ? 136 : 150;
  const glowSize = desktop ? 480 : Math.min(320, width * 0.82);
  const actionDisabled = status === "verifying" || status === "verified";
  const resendDisabled =
    actionDisabled || isResending || cooldownSeconds > 0 || !registeredEmail;

  useEffect(() => {
    if (routeEmail) {
      setRegisteredEmail(routeEmail);
      void savePendingVerificationEmail(routeEmail).catch(() => undefined);
      return;
    }

    let active = true;
    void getPendingVerificationEmail()
      .then((pendingEmail) => {
        if (active && pendingEmail) {
          setRegisteredEmail(pendingEmail);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [routeEmail]);

  const consumeVerificationToken = useCallback(async (actionToken: string) => {
    if (verificationInFlightRef.current) {
      return;
    }

    verificationInFlightRef.current = true;
    setStatus("verifying");
    setNotice(null);

    try {
      await verifyEmail(actionToken);
      await clearPendingVerificationEmail().catch(() => undefined);
      setStatus("verified");
      setNotice(null);
    } catch (error) {
      if (error instanceof AuthRequestError) {
        if (error.kind === "expired-action-token") {
          setStatus("expired-link");
          setNotice(noticeForInitialStatus("expired-link"));
          return;
        }

        if (error.kind === "invalid-action-token") {
          setStatus("invalid-link");
          setNotice(noticeForInitialStatus("invalid-link"));
          return;
        }
      }

      setStatus("verification-error");
      setNotice(verificationErrorNotice(error));
    } finally {
      verificationInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!token || verifiedTokenRef.current === token) {
      return;
    }

    verifiedTokenRef.current = token;
    void consumeVerificationToken(token);
  }, [consumeVerificationToken, token]);

  useEffect(() => {
    if (status !== "verified") {
      return;
    }

    const timer = setTimeout(() => {
      if (!navigationStartedRef.current) {
        navigationStartedRef.current = true;
        router.replace("/sign-in");
      }
    }, VERIFIED_REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [router, status]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const openEmailApp = async () => {
    if (isOpeningEmail || actionDisabled) {
      return;
    }

    setIsOpeningEmail(true);
    setNotice(null);

    try {
      const supported = await Linking.canOpenURL("mailto:");
      if (!supported) {
        throw new Error("Email applications are unavailable");
      }

      await Linking.openURL("mailto:");
    } catch {
      setNotice({
        key: "email-app-error",
        message:
          "We couldn’t open an email app. Open your inbox manually to continue.",
        tone: "warning",
      });
    } finally {
      setIsOpeningEmail(false);
    }
  };

  const resend = async () => {
    if (resendDisabled || !registeredEmail) {
      if (!registeredEmail) {
        setNotice({
          key: "missing-email",
          message:
            "Your email address is unavailable. Use a different email to continue.",
          tone: "warning",
        });
      }
      return;
    }

    setIsResending(true);
    setNotice({
      key: "resending",
      message: "Sending a new verification email.",
      tone: "info",
    });

    try {
      await resendVerificationEmail(registeredEmail);
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      setStatus("awaiting");
      setNotice({
        key: "resend-success",
        message:
          "If the account is eligible, a new verification email will be sent.",
        tone: "info",
      });
    } catch (error) {
      setNotice(resendErrorNotice(error));
    } finally {
      setIsResending(false);
    }
  };

  const chooseDifferentEmail = async () => {
    if (navigationStartedRef.current) {
      return;
    }

    navigationStartedRef.current = true;
    await clearPendingVerificationEmail().catch(() => undefined);
    router.replace("/sign-up");
  };

  const continueToSignIn = () => {
    if (navigationStartedRef.current) {
      return;
    }

    navigationStartedRef.current = true;
    router.replace("/sign-in");
  };

  const title =
    status === "verified"
      ? "Email verified"
      : status === "expired-link"
        ? "This link has expired"
        : status === "invalid-link"
          ? "This link is invalid"
          : status === "verifying"
            ? "Verifying your email"
            : status === "verification-error"
              ? "We couldn’t verify your email"
              : "Verify your email";

  const description =
    status === "verified"
      ? "Your account is ready. You can now sign in."
      : status === "expired-link"
        ? "Verification links are valid for 24 hours. Request a new one to finish setting up your account."
        : status === "invalid-link"
          ? "This verification link is invalid or has already been used. Request a new one to continue."
          : status === "verifying"
            ? "Please wait while we securely verify your email address."
            : status === "verification-error"
              ? "Your account has not been changed. Try the verification link again when you’re ready."
              : registeredEmail
                ? `We sent a verification link to ${registeredEmail}. Open the link to activate your account.`
                : "Open the verification link in your inbox to activate your account.";

  const visualState = isResending
    ? "resending"
    : status === "awaiting"
      ? "waiting"
      : status;
  const isLinkUnavailable =
    status === "expired-link" || status === "invalid-link";

  const noticeBanner = notice ? (
    <View key={notice.key} testID="auth-verify-email-notice">
      <AuthAlertBanner compact message={notice.message} tone={notice.tone} />
    </View>
  ) : null;

  const differentEmailAction = (
    <Pressable
      accessibilityHint="Returns to Create Account"
      accessibilityLabel="Use a different email"
      accessibilityRole="link"
      onPress={() => void chooseDifferentEmail()}
      style={({ pressed }) => [
        styles.differentEmailButton,
        pressed && styles.linkPressed,
      ]}
      testID="auth-verify-email-different-email"
    >
      <StylishText
        className="text-[#C81E3E] underline"
        variant="navigation-strong"
      >
        Use a different email
      </StylishText>
    </Pressable>
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
      <StatusBar style="dark" />

      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: colors.brand.pinkSoft,
            height: glowSize,
            left: -glowSize * 0.34,
            opacity: 0.22,
            top: -glowSize * 0.32,
            width: glowSize,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: colors.brand.blueSoft,
            bottom: -glowSize * 0.32,
            height: glowSize,
            opacity: 0.28,
            right: -glowSize * 0.28,
            width: glowSize,
          },
        ]}
      />

      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            minHeight: height,
            paddingBottom: desktop && !compact ? 70 : compact ? 16 : 32,
            paddingHorizontal: 16,
            paddingTop: compact ? 16 : 32,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.content, { gap: compact ? 16 : desktop ? 32 : 24 }]}
          testID="auth-verify-email-content"
        >
          <StylishLogo testID="auth-verify-email-logo" width={logoWidth} />

          <View
            style={[styles.card, { padding: cardPadding }]}
            testID="auth-verify-email-card"
          >
            <View style={[styles.header, { gap: compact ? 6 : 8 }]}>
              <VerificationStateIcon compact={compact} status={status} />

              <StylishText
                accessibilityRole="header"
                className="text-center text-ink-primary"
                style={[styles.title, compact && styles.titleCompact]}
                testID="auth-verify-email-title"
                unstyled
                variant="section-title"
              >
                {title}
              </StylishText>
              <StylishText
                className="text-center text-neutral-550"
                style={styles.description}
                testID="auth-verify-email-description"
                unstyled
                variant="body"
              >
                {description}
              </StylishText>
            </View>

            <View
              accessibilityLiveRegion="polite"
              key={visualState}
              style={[styles.actions, { marginTop: compact ? 16 : 24 }]}
              testID={`auth-verify-email-state:${visualState}`}
            >
              {status === "verifying" ? (
                <View
                  accessibilityLabel="Verifying your email"
                  accessibilityRole="progressbar"
                  style={[styles.primaryButton, styles.primaryButtonDisabled]}
                  testID="auth-verify-email-verifying"
                >
                  <ActivityIndicator color={colors.neutral[0]} size="small" />
                  <StylishText className="text-neutral-0" variant="button">
                    Verifying…
                  </StylishText>
                </View>
              ) : status === "verified" ? (
                <Pressable
                  accessibilityLabel="Continue to Sign In"
                  accessibilityRole="button"
                  onPress={continueToSignIn}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  testID="auth-verify-email-primary"
                >
                  <StylishText className="text-neutral-0" variant="button">
                    Continue to Sign In
                  </StylishText>
                </Pressable>
              ) : status === "verification-error" ? (
                <>
                  {noticeBanner}
                  {token ? (
                    <Pressable
                      accessibilityLabel="Try verification again"
                      accessibilityRole="button"
                      onPress={() => void consumeVerificationToken(token)}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        pressed && styles.buttonPressed,
                      ]}
                      testID="auth-verify-email-primary"
                    >
                      <StylishText className="text-neutral-0" variant="button">
                        Try Verification Again
                      </StylishText>
                    </Pressable>
                  ) : null}
                  {registeredEmail ? (
                    <Pressable
                      accessibilityLabel="Resend Verification Email"
                      accessibilityRole="button"
                      accessibilityState={{
                        busy: isResending,
                        disabled: resendDisabled,
                      }}
                      disabled={resendDisabled}
                      onPress={() => void resend()}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && !resendDisabled && styles.buttonPressed,
                        resendDisabled && styles.secondaryButtonDisabled,
                      ]}
                      testID="auth-verify-email-resend"
                    >
                      {isResending ? (
                        <ActivityIndicator
                          color={colors.ink.primary}
                          size="small"
                        />
                      ) : null}
                      <StylishText
                        className="text-ink-primary"
                        variant="button"
                      >
                        {isResending
                          ? "Resending…"
                          : cooldownSeconds > 0
                            ? `Resend available in ${cooldownSeconds}s`
                            : "Resend Verification Email"}
                      </StylishText>
                    </Pressable>
                  ) : null}
                  {differentEmailAction}
                </>
              ) : isLinkUnavailable ? (
                <>
                  {noticeBanner}
                  <Pressable
                    accessibilityLabel="Resend Verification Email"
                    accessibilityRole="button"
                    accessibilityState={{
                      busy: isResending,
                      disabled: resendDisabled,
                    }}
                    disabled={resendDisabled}
                    onPress={() => void resend()}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && !resendDisabled && styles.buttonPressed,
                      resendDisabled && styles.primaryButtonDisabled,
                    ]}
                    testID="auth-verify-email-resend"
                  >
                    {isResending ? (
                      <ActivityIndicator
                        color={colors.neutral[0]}
                        size="small"
                      />
                    ) : null}
                    <StylishText className="text-neutral-0" variant="button">
                      {isResending
                        ? "Resending…"
                        : cooldownSeconds > 0
                          ? `Resend available in ${cooldownSeconds}s`
                          : "Resend Verification Email"}
                    </StylishText>
                  </Pressable>
                  {differentEmailAction}
                </>
              ) : (
                <>
                  {noticeBanner}
                  <Pressable
                    accessibilityLabel="Open Email App"
                    accessibilityRole="button"
                    accessibilityState={{
                      busy: isOpeningEmail,
                      disabled: isOpeningEmail,
                    }}
                    disabled={isOpeningEmail}
                    onPress={() => void openEmailApp()}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.buttonPressed,
                      isOpeningEmail && styles.primaryButtonDisabled,
                    ]}
                    testID="auth-verify-email-primary"
                  >
                    {isOpeningEmail ? (
                      <ActivityIndicator
                        color={colors.neutral[0]}
                        size="small"
                      />
                    ) : null}
                    <StylishText className="text-neutral-0" variant="button">
                      {isOpeningEmail ? "Opening…" : "Open Email App"}
                    </StylishText>
                  </Pressable>

                  <Pressable
                    accessibilityLabel="Resend Verification Email"
                    accessibilityRole="button"
                    accessibilityState={{
                      busy: isResending,
                      disabled: resendDisabled,
                    }}
                    disabled={resendDisabled}
                    onPress={() => void resend()}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && !resendDisabled && styles.buttonPressed,
                      resendDisabled && styles.secondaryButtonDisabled,
                    ]}
                    testID="auth-verify-email-resend"
                  >
                    {isResending ? (
                      <ActivityIndicator
                        color={colors.ink.primary}
                        size="small"
                      />
                    ) : null}
                    <StylishText className="text-ink-primary" variant="button">
                      {isResending
                        ? "Resending…"
                        : cooldownSeconds > 0
                          ? `Resend available in ${cooldownSeconds}s`
                          : "Resend Verification Email"}
                    </StylishText>
                  </Pressable>

                  {differentEmailAction}

                  <StylishText
                    className="text-center text-neutral-550"
                    style={styles.expirationText}
                    variant="helper"
                  >
                    The verification link expires 24 hours after it is sent.
                  </StylishText>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12, width: "100%" },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.992 }] },
  card: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 520,
    shadowColor: colors.ink.primary,
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    width: "100%",
  },
  content: { alignItems: "center", maxWidth: 520, width: "100%" },
  description: {
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodyMedium,
    lineHeight: typography.lineHeight.bodyMedium,
    width: "100%",
  },
  differentEmailButton: {
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 4,
  },
  expirationText: {
    fontSize: typography.fontSize.caption,
    lineHeight: typography.lineHeight.caption,
  },
  glow: {
    borderRadius: 9999,
    filter: Platform.OS === "web" ? "blur(104px)" : [{ blur: 72 }],
    position: "absolute",
  },
  header: { alignItems: "center", width: "100%" },
  icon: { height: 30, width: 30 },
  iconCircle: {
    alignItems: "center",
    backgroundColor: colors.brand.socialSurface,
    borderRadius: 999,
    height: 64,
    justifyContent: "center",
    marginBottom: 8,
    width: 64,
  },
  iconCircleCompact: { height: 56, marginBottom: 4, width: 56 },
  iconCircleSuccess: { backgroundColor: "#EAF7EE" },
  iconCircleWarning: { backgroundColor: "#FFF6E6" },
  iconCompact: { height: 26, width: 26 },
  linkPressed: { opacity: 0.68 },
  page: { backgroundColor: colors.neutral[50], flex: 1 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    height: 56,
    justifyContent: "center",
    paddingHorizontal: 16,
    shadowColor: colors.brand.primary,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 8,
    width: "100%",
  },
  primaryButtonDisabled: { opacity: 0.58, shadowOpacity: 0 },
  scrollContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[400],
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    height: 56,
    justifyContent: "center",
    paddingHorizontal: 16,
    width: "100%",
  },
  secondaryButtonDisabled: { opacity: 0.5 },
  title: {
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: typography.fontSize.headingLarge,
    letterSpacing: typography.letterSpacing.headingLarge,
    lineHeight: typography.lineHeight.headingLarge,
    textAlign: "center",
  },
  titleCompact: { fontSize: 26, lineHeight: 34 },
});
