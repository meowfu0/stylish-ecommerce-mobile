import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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
import { VeloriLogo } from "@/components/brand/velori-logo";
import { StylishText } from "@/components/typography/stylish-text";
import { colors, typography } from "@/constants/design-tokens";
import { AuthRequestError, resetPassword } from "@/services/auth/auth-api";

const resetPasswordSchema = z
  .object({
    confirmNewPassword: z
      .string()
      .min(1, "Re-enter your new password.")
      .max(128, "Password must be 128 characters or fewer."),
    newPassword: z
      .string()
      .min(1, "Enter a new password.")
      .min(12, "Use at least 12 characters.")
      .max(128, "Password must be 128 characters or fewer."),
  })
  .refine(
    ({ confirmNewPassword, newPassword }) => confirmNewPassword === newPassword,
    {
      message: "Passwords do not match.",
      path: ["confirmNewPassword"],
    },
  );

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
type PasswordField = keyof ResetPasswordFormValues;
type ResetStatus = "expired-link" | "invalid-link" | "ready" | "success";

type ResetNotice = {
  key: string;
  message: string;
  tone: AuthAlertTone;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function initialStatus(
  token: string | undefined,
  reason: string | undefined,
): ResetStatus {
  if (reason === "expired" || reason === "expired-link") {
    return "expired-link";
  }

  if (reason === "invalid" || reason === "invalid-link") {
    return "invalid-link";
  }

  return token && token.length >= 32 && token.length <= 512
    ? "ready"
    : "invalid-link";
}

function requestNotice(error: unknown): ResetNotice {
  if (error instanceof AuthRequestError) {
    if (error.kind === "rate-limited") {
      return {
        key: "rate-limited",
        message:
          "Too many password-reset attempts. Please wait before trying again.",
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
    message: "Your password could not be reset. Please try again.",
    tone: "error",
  };
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    reason?: string | string[];
    token?: string | string[];
  }>();
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const [resetToken] = useState(() => firstParam(params.token)?.trim());
  const [status, setStatus] = useState<ResetStatus>(() =>
    initialStatus(resetToken, firstParam(params.reason)),
  );
  const [focusedField, setFocusedField] = useState<PasswordField | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [notice, setNotice] = useState<ResetNotice | null>(null);
  const { height, width } = useWindowDimensions();
  const {
    clearErrors,
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
  } = useForm<ResetPasswordFormValues>({
    defaultValues: { confirmNewPassword: "", newPassword: "" },
    mode: "onTouched",
    resolver: zodResolver(resetPasswordSchema),
  });

  const compact = height < 720;
  const desktop = Platform.OS === "web" && width >= 1024;
  const cardPadding = compact ? 24 : width < 600 ? 28 : 41;
  const glowSize = desktop ? 480 : Math.min(320, width * 0.82);
  const logoWidth = desktop ? 190 : width < 480 ? 136 : 150;
  const displayedNotice = status === "ready" ? notice : null;
  const formDisabled = isSubmitting || status !== "ready";

  useEffect(() => {
    if (!resetToken) {
      return;
    }

    // Retain the one-time token only in component memory after Expo Router
    // resolves the incoming URL, keeping it out of browser history thereafter.
    router.setParams({ token: undefined });
  }, [resetToken, router]);

  const handleFieldChange = (field: PasswordField) => {
    clearErrors(field);
    if (field === "newPassword") {
      clearErrors("confirmNewPassword");
    }
    setNotice(null);
  };

  const submit = handleSubmit(
    async ({ newPassword }) => {
      if (!resetToken || status !== "ready") {
        setStatus("invalid-link");
        return;
      }

      setNotice(null);

      try {
        await resetPassword({ newPassword, token: resetToken });
        reset({ confirmNewPassword: "", newPassword: "" });
        setIsPasswordVisible(false);
        setIsConfirmPasswordVisible(false);
        setStatus("success");
      } catch (error) {
        if (error instanceof AuthRequestError) {
          if (
            error.kind === "expired-action-token" ||
            error.kind === "invalid-action-token"
          ) {
            reset({ confirmNewPassword: "", newPassword: "" });
            setStatus(
              error.kind === "expired-action-token"
                ? "expired-link"
                : "invalid-link",
            );
            return;
          }

          if (error.fieldErrors.newPassword) {
            setError("newPassword", {
              message: "Use a valid password of at least 12 characters.",
              type: "server",
            });
            setNotice({
              key: "server-validation",
              message: "Check the highlighted fields and try again.",
              tone: "error",
            });
            return;
          }
        }

        setNotice(requestNotice(error));
      }
    },
    () => {
      setNotice({
        key: "validation",
        message: "Check the highlighted fields and try again.",
        tone: "error",
      });
    },
  );

  const title =
    status === "success"
      ? "Password updated"
      : status === "expired-link"
        ? "This reset link has expired"
        : status === "invalid-link"
          ? "This reset link is invalid"
          : "Create a new password";
  const description =
    status === "success"
      ? "Your password was updated and all previous sessions were signed out."
      : status === "expired-link"
        ? "Password-reset links are valid for 30 minutes. Request a new one to continue."
        : status === "invalid-link"
          ? "This password-reset link is invalid or has already been used. Request a new one to continue."
          : "Choose a password you haven’t used on Velori before.";

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
            testID="auth-reset-password-content"
          >
            <VeloriLogo testID="auth-reset-password-logo" width={logoWidth} />

            <View
              style={[styles.card, { padding: cardPadding }]}
              testID="auth-reset-password-card"
            >
              <View
                style={[
                  styles.header,
                  status !== "ready" && styles.headerCentered,
                  { gap: compact ? 6 : 8 },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    compact && styles.iconCircleCompact,
                    status === "success" && styles.iconCircleSuccess,
                    (status === "expired-link" || status === "invalid-link") &&
                      styles.iconCircleWarning,
                  ]}
                  accessibilityLabel={
                    status === "success"
                      ? "Password updated"
                      : status === "expired-link" || status === "invalid-link"
                        ? "Password-reset link unavailable"
                        : "Create a new password"
                  }
                  accessibilityRole="image"
                >
                  {status === "success" ? (
                    <MaterialCommunityIcons
                      color={colors.feedback.success}
                      name="check-circle-outline"
                      size={compact ? 24 : 28}
                    />
                  ) : status === "expired-link" || status === "invalid-link" ? (
                    <MaterialCommunityIcons
                      color="#8A5A00"
                      name="link-variant-off"
                      size={compact ? 24 : 28}
                    />
                  ) : (
                    <Image
                      accessible={false}
                      contentFit="contain"
                      source={require("@/assets/icons/auth-reset-password.svg")}
                      style={compact ? styles.iconCompact : styles.icon}
                    />
                  )}
                </View>

                <StylishText
                  accessibilityRole="header"
                  className={
                    status === "ready"
                      ? "text-ink-primary"
                      : "text-center text-ink-primary"
                  }
                  style={[styles.title, compact && styles.titleCompact]}
                  testID="auth-reset-password-title"
                  unstyled
                  variant="section-title"
                >
                  {title}
                </StylishText>
                <StylishText
                  className={
                    status === "ready"
                      ? "text-neutral-550"
                      : "text-center text-neutral-550"
                  }
                  style={styles.description}
                  testID="auth-reset-password-description"
                  unstyled
                  variant="body"
                >
                  {description}
                </StylishText>
              </View>

              {status === "ready" ? (
                <View
                  style={[styles.form, { marginTop: compact ? 16 : 24 }]}
                  testID={`auth-reset-password-state:${
                    isSubmitting ? "resetting" : "default"
                  }`}
                >
                  {displayedNotice ? (
                    <View key={displayedNotice.key}>
                      <AuthAlertBanner
                        compact
                        message={displayedNotice.message}
                        tone={displayedNotice.tone}
                      />
                    </View>
                  ) : null}

                  <Controller
                    control={control}
                    name="newPassword"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <AuthFormField
                        autoCapitalize="none"
                        autoComplete="new-password"
                        autoCorrect={false}
                        compact={compact}
                        editable={!formDisabled}
                        error={errors.newPassword?.message}
                        focused={focusedField === "newPassword"}
                        helper="Use at least 12 characters."
                        icon={require("@/assets/icons/auth-lock.svg")}
                        label="New password"
                        nativeID="reset-password-new-password"
                        onBlur={() => {
                          setFocusedField(null);
                          onBlur();
                        }}
                        onChangeText={(text) => {
                          handleFieldChange("newPassword");
                          onChange(text);
                        }}
                        onFocus={() => setFocusedField("newPassword")}
                        onSubmitEditing={() =>
                          confirmPasswordInputRef.current?.focus()
                        }
                        placeholder="Enter a new password"
                        placeholderTextColor="rgba(103, 103, 103, 0.8)"
                        returnKeyType="next"
                        secureTextEntry={!isPasswordVisible}
                        testID="auth-reset-password-new-password-input"
                        textContentType="newPassword"
                        trailing={
                          <Pressable
                            accessibilityLabel={
                              isPasswordVisible
                                ? "Hide new password"
                                : "Show new password"
                            }
                            accessibilityRole="button"
                            accessibilityState={{ disabled: formDisabled }}
                            disabled={formDisabled}
                            hitSlop={4}
                            onPress={() =>
                              setIsPasswordVisible((visible) => !visible)
                            }
                            style={[
                              styles.eyeButton,
                              formDisabled && styles.controlDisabled,
                            ]}
                            testID="auth-reset-password-new-password-visibility"
                          >
                            <Image
                              accessible={false}
                              contentFit="contain"
                              source={require("@/assets/icons/auth-eye.svg")}
                              style={styles.eyeIcon}
                            />
                          </Pressable>
                        }
                        value={value}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="confirmNewPassword"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <AuthFormField
                        ref={confirmPasswordInputRef}
                        autoCapitalize="none"
                        autoComplete="new-password"
                        autoCorrect={false}
                        compact={compact}
                        editable={!formDisabled}
                        error={errors.confirmNewPassword?.message}
                        focused={focusedField === "confirmNewPassword"}
                        icon={require("@/assets/icons/auth-lock.svg")}
                        label="Confirm new password"
                        nativeID="reset-password-confirm-password"
                        onBlur={() => {
                          setFocusedField(null);
                          onBlur();
                        }}
                        onChangeText={(text) => {
                          handleFieldChange("confirmNewPassword");
                          onChange(text);
                        }}
                        onFocus={() => setFocusedField("confirmNewPassword")}
                        onSubmitEditing={() => void submit()}
                        placeholder="Re-enter your new password"
                        placeholderTextColor="rgba(103, 103, 103, 0.8)"
                        returnKeyType="done"
                        secureTextEntry={!isConfirmPasswordVisible}
                        testID="auth-reset-password-confirm-password-input"
                        textContentType="newPassword"
                        trailing={
                          <Pressable
                            accessibilityLabel={
                              isConfirmPasswordVisible
                                ? "Hide confirmed password"
                                : "Show confirmed password"
                            }
                            accessibilityRole="button"
                            accessibilityState={{ disabled: formDisabled }}
                            disabled={formDisabled}
                            hitSlop={4}
                            onPress={() =>
                              setIsConfirmPasswordVisible((visible) => !visible)
                            }
                            style={[
                              styles.eyeButton,
                              formDisabled && styles.controlDisabled,
                            ]}
                            testID="auth-reset-password-confirm-password-visibility"
                          >
                            <Image
                              accessible={false}
                              contentFit="contain"
                              source={require("@/assets/icons/auth-eye.svg")}
                              style={styles.eyeIcon}
                            />
                          </Pressable>
                        }
                        value={value}
                      />
                    )}
                  />

                  <Pressable
                    accessibilityLabel={
                      isSubmitting ? "Resetting password" : "Reset Password"
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      busy: isSubmitting,
                      disabled: formDisabled,
                    }}
                    disabled={formDisabled}
                    onPress={() => void submit()}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && !formDisabled && styles.buttonPressed,
                      formDisabled && styles.primaryButtonDisabled,
                    ]}
                    testID="auth-reset-password-submit"
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
                          Resetting…
                        </StylishText>
                      </View>
                    ) : (
                      <StylishText className="text-neutral-0" variant="button">
                        Reset Password
                      </StylishText>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View
                  accessibilityLiveRegion="polite"
                  key={status}
                  style={[styles.form, { marginTop: compact ? 16 : 24 }]}
                  testID={`auth-reset-password-state:${status}`}
                >
                  <Pressable
                    accessibilityLabel={
                      status === "success"
                        ? "Continue to Sign In"
                        : "Request a new password-reset link"
                    }
                    accessibilityRole="button"
                    onPress={() =>
                      router.replace(
                        status === "success" ? "/sign-in" : "/forgot-password",
                      )
                    }
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                    testID="auth-reset-password-primary-action"
                  >
                    <StylishText className="text-neutral-0" variant="button">
                      {status === "success" ? "Sign In" : "Request a New Link"}
                    </StylishText>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  controlDisabled: { opacity: 0.45 },
  description: {
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodyMedium,
    lineHeight: typography.lineHeight.bodyMedium,
    minHeight: 24,
    width: "100%",
  },
  eyeButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  eyeIcon: { height: 18, width: 18 },
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
  iconCircleSuccess: { backgroundColor: "#EAF7EE" },
  iconCircleWarning: { backgroundColor: "#FFF6E6" },
  iconCompact: { height: 24, width: 24 },
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
});
