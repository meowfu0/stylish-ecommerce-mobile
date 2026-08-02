import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import {
  AuthAlertBanner,
  type AuthAlertTone,
} from "@/components/auth/auth-alert-banner";
import { AuthFormField } from "@/components/auth/auth-form-field";
import { StylishLogo } from "@/components/brand/stylish-logo";
import { StylishText } from "@/components/typography/stylish-text";
import { colors, typography } from "@/constants/design-tokens";
import { AuthRequestError, forgotPassword } from "@/services/auth/auth-api";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type ForgotPasswordStatus = "form" | "success";

type ForgotPasswordNotice = {
  key: string;
  message: string;
  tone: AuthAlertTone;
};

function requestErrorNotice(error: unknown): ForgotPasswordNotice {
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
          "We couldn't connect right now. Check your connection and try again.",
        tone: "error",
      };
    }
  }

  return {
    key: "request-error",
    message: "The reset request could not be completed. Please try again.",
    tone: "error",
  };
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const [emailFocused, setEmailFocused] = useState(false);
  const [notice, setNotice] = useState<ForgotPasswordNotice | null>(null);
  const [status, setStatus] = useState<ForgotPasswordStatus>("form");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const {
    clearErrors,
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: { email: "" },
    mode: "onTouched",
    resolver: zodResolver(forgotPasswordSchema),
  });

  const compact = height < 720;
  const desktop = Platform.OS === "web" && width >= 1024;
  const cardPadding = compact ? 24 : width < 600 ? 28 : 41;
  const glowSize = desktop ? 480 : Math.min(320, width * 0.82);
  const logoWidth = desktop ? 190 : width < 480 ? 136 : 150;

  const submit = async ({ email }: ForgotPasswordFormValues) => {
    setNotice(null);

    try {
      await forgotPassword(email);
      setSubmittedEmail(email.trim().toLowerCase());
      setStatus("success");
      setNotice(null);
    } catch (error) {
      if (error instanceof AuthRequestError && error.fieldErrors.email) {
        setError("email", {
          message: "Enter a valid email address.",
          type: "server",
        });
        return;
      }

      setNotice(requestErrorNotice(error));
    }
  };

  const showForm = () => {
    setNotice(null);
    setStatus("form");
  };

  const backToSignIn = () => router.replace("/sign-in");

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ android: "height", ios: "padding" })}
      style={styles.page}
    >
      <StatusBar style="dark" />

      <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
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
          automaticallyAdjustKeyboardInsets
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              minHeight: height,
              paddingHorizontal: 16,
              paddingVertical: compact ? 16 : 32,
            },
          ]}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[styles.content, { gap: compact ? 16 : desktop ? 32 : 24 }]}
            testID="auth-forgot-password-content"
          >
            <StylishLogo testID="auth-forgot-password-logo" width={logoWidth} />

            <View
              style={[styles.card, { padding: cardPadding }]}
              testID="auth-forgot-password-card"
            >
              <View
                style={[
                  styles.header,
                  status === "success" && styles.headerCentered,
                  { gap: compact ? 6 : 8 },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    compact && styles.iconCircleCompact,
                    status === "success" && styles.iconCircleSuccess,
                  ]}
                  accessibilityLabel={
                    status === "success"
                      ? "Password-reset email requested"
                      : "Password recovery"
                  }
                  accessibilityRole="image"
                >
                  {status === "success" ? (
                    <MaterialCommunityIcons
                      color="#1B5AAB"
                      name="email-check-outline"
                      size={compact ? 24 : 28}
                    />
                  ) : (
                    <Image
                      accessible={false}
                      contentFit="contain"
                      source={require("@/assets/icons/auth-forgot-password.svg")}
                      style={compact ? styles.iconCompact : styles.icon}
                    />
                  )}
                </View>

                <StylishText
                  accessibilityRole="header"
                  className={
                    status === "success"
                      ? "text-center text-ink-primary"
                      : "text-ink-primary"
                  }
                  style={[styles.title, compact && styles.titleCompact]}
                  testID="auth-forgot-password-title"
                  unstyled
                  variant="section-title"
                >
                  {status === "success"
                    ? "Check your email"
                    : "Forgot your password?"}
                </StylishText>
                <StylishText
                  className={
                    status === "success"
                      ? "text-center text-neutral-550"
                      : "text-neutral-550"
                  }
                  style={styles.description}
                  testID="auth-forgot-password-description"
                  unstyled
                  variant="body"
                >
                  {status === "success"
                    ? `If an account is eligible, password-reset instructions were sent to ${submittedEmail}.`
                    : "Enter your email and we’ll send password-reset instructions if the account is eligible."}
                </StylishText>
              </View>

              <View
                accessibilityLiveRegion="polite"
                key={status}
                style={[styles.form, { marginTop: compact ? 16 : 24 }]}
                testID={`auth-forgot-password-state:${status}`}
              >
                {status === "form" ? (
                  <>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onBlur, onChange, value } }) => (
                        <AuthFormField
                          autoCapitalize="none"
                          autoComplete="email"
                          autoCorrect={false}
                          compact={compact}
                          editable={!isSubmitting}
                          error={errors.email?.message}
                          focused={emailFocused}
                          icon={require("@/assets/icons/auth-forgot-password-email.svg")}
                          keyboardType="email-address"
                          label="Email address"
                          nativeID="forgot-password-email"
                          onBlur={() => {
                            setEmailFocused(false);
                            onBlur();
                          }}
                          onChangeText={(text) => {
                            clearErrors("email");
                            setNotice(null);
                            onChange(text);
                          }}
                          onFocus={() => setEmailFocused(true)}
                          onSubmitEditing={() => void handleSubmit(submit)()}
                          placeholder="you@example.com"
                          placeholderTextColor="rgba(103, 103, 103, 0.8)"
                          returnKeyType="send"
                          testID="auth-forgot-password-email"
                          textContentType="emailAddress"
                          value={value}
                        />
                      )}
                    />

                    {notice ? (
                      <View key={notice.key}>
                        <AuthAlertBanner
                          compact
                          message={notice.message}
                          tone={notice.tone}
                        />
                      </View>
                    ) : null}

                    <Pressable
                      accessibilityLabel={
                        isSubmitting
                          ? "Sending reset instructions"
                          : "Send Reset Instructions"
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        busy: isSubmitting,
                        disabled: isSubmitting,
                      }}
                      disabled={isSubmitting}
                      onPress={() => void handleSubmit(submit)()}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        pressed && !isSubmitting && styles.buttonPressed,
                        isSubmitting && styles.primaryButtonDisabled,
                      ]}
                      testID="auth-forgot-password-submit"
                    >
                      {isSubmitting ? (
                        <View style={styles.buttonContent}>
                          <ActivityIndicator
                            color={colors.neutral[0]}
                            size="small"
                          />
                          <StylishText
                            className="text-neutral-0"
                            variant="button"
                          >
                            Sending…
                          </StylishText>
                        </View>
                      ) : (
                        <StylishText
                          className="text-neutral-0"
                          variant="button"
                        >
                          Send Reset Instructions
                        </StylishText>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <>
                    <AuthAlertBanner
                      compact
                      message={
                        notice?.message ??
                        "Reset links expire 30 minutes after they are sent."
                      }
                      tone={notice?.tone ?? "info"}
                    />
                    <Pressable
                      accessibilityLabel={
                        isSubmitting
                          ? "Resending reset instructions"
                          : "Resend Instructions"
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        busy: isSubmitting,
                        disabled: isSubmitting,
                      }}
                      disabled={isSubmitting}
                      onPress={() => void handleSubmit(submit)()}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && !isSubmitting && styles.buttonPressed,
                        isSubmitting && styles.secondaryButtonDisabled,
                      ]}
                      testID="auth-forgot-password-resend"
                    >
                      {isSubmitting ? (
                        <ActivityIndicator
                          color={colors.ink.primary}
                          size="small"
                        />
                      ) : null}
                      <StylishText
                        className="text-ink-primary"
                        variant="button"
                      >
                        {isSubmitting ? "Sending…" : "Resend Instructions"}
                      </StylishText>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Use a different email"
                      accessibilityRole="button"
                      onPress={showForm}
                      style={({ pressed }) => [
                        styles.textAction,
                        pressed && styles.linkPressed,
                      ]}
                      testID="auth-forgot-password-different-email"
                    >
                      <StylishText
                        className="text-[#C81E3E] underline"
                        variant="navigation-strong"
                      >
                        Use a different email
                      </StylishText>
                    </Pressable>
                  </>
                )}

                <Pressable
                  accessibilityLabel="Back to Sign In"
                  accessibilityRole="link"
                  onPress={backToSignIn}
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.linkPressed,
                  ]}
                  testID="auth-forgot-password-back"
                >
                  <Image
                    accessible={false}
                    contentFit="contain"
                    source={require("@/assets/icons/auth-back.svg")}
                    style={styles.backIcon}
                  />
                  <StylishText
                    className="text-[#C81E3E] underline"
                    variant="navigation-strong"
                  >
                    Back to Sign In
                  </StylishText>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 4,
  },
  backIcon: { height: 16, width: 16 },
  buttonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.992 }] },
  card: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: 16,
    borderWidth: 1,
    elevation: 12,
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
    minHeight: 48,
    width: "100%",
  },
  form: { gap: 20, width: "100%" },
  glow: {
    borderRadius: 9999,
    filter: Platform.OS === "web" ? "blur(104px)" : [{ blur: 72 }],
    position: "absolute",
  },
  header: { alignItems: "flex-start", width: "100%" },
  headerCentered: { alignItems: "center" },
  icon: { height: 28, width: 28 },
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
  iconCircleSuccess: { backgroundColor: "#EAF3FF" },
  iconCompact: { height: 24, width: 24 },
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
    shadowColor: colors.brand.primary,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 8,
    width: "100%",
  },
  primaryButtonDisabled: { opacity: 0.58, shadowOpacity: 0 },
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
  scrollContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  title: {
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: typography.fontSize.headingLarge,
    letterSpacing: typography.letterSpacing.headingLarge,
    lineHeight: typography.lineHeight.headingLarge,
  },
  titleCompact: { fontSize: 26, lineHeight: 34 },
  textAction: {
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 4,
  },
});
