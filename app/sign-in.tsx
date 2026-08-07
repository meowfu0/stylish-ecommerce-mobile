import { zodResolver } from "@hookform/resolvers/zod";
import { Image, type ImageSource } from "expo-image";
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
  Text,
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
import {
  AuthRequestError,
  resendVerificationEmail,
  type AuthErrorKind,
} from "@/services/auth/auth-api";
import { getLastAuthEmail } from "@/services/auth/auth-storage";
import { authenticateWithPassword } from "@/services/auth/auth-session";
import {
  destinationForWorkspace,
  workspacesFromAuthContext,
} from "@/services/auth/auth-workspaces";
import { useAuthWorkspaceStore } from "@/stores/auth-workspace-store";

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(128),
});

type SignInFormValues = z.infer<typeof signInSchema>;

type SignInNoticeKind = AuthErrorKind | "resend-accepted" | "session-expired";

type SignInNotice = {
  kind: SignInNoticeKind;
  message: string;
  tone: AuthAlertTone;
};

const SOCIAL_OPTIONS: {
  label: string;
  source: ImageSource;
}[] = [
  {
    label: "Google sign-in — coming soon",
    source: require("@/assets/icons/social-google.svg"),
  },
  {
    label: "Apple sign-in — coming soon",
    source: require("@/assets/icons/social-apple.svg"),
  },
  {
    label: "Facebook sign-in — coming soon",
    source: require("@/assets/icons/social-facebook.svg"),
  },
];

function noticeForAuthError(error: AuthRequestError): SignInNotice {
  switch (error.kind) {
    case "unverified-email":
      return {
        kind: error.kind,
        message: "Verify your email before signing in.",
        tone: "warning",
      };
    case "disabled-account":
      return {
        kind: error.kind,
        message:
          "This account is currently unavailable. Contact support if you need help.",
        tone: "error",
      };
    case "rate-limited":
      return { kind: error.kind, message: error.message, tone: "warning" };
    case "network":
    case "server":
    case "service-unavailable":
      return { kind: error.kind, message: error.message, tone: "error" };
    case "session-expired":
      return { kind: error.kind, message: error.message, tone: "info" };
    case "permission-denied":
      return { kind: error.kind, message: error.message, tone: "warning" };
    case "session-limit":
      return { kind: error.kind, message: error.message, tone: "warning" };
    case "invalid-credentials":
    default:
      return {
        kind: "invalid-credentials",
        message: "The email or password is incorrect.",
        tone: "error",
      };
  }
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function SignInScreen() {
  const router = useRouter();
  const selectWorkspace = useAuthWorkspaceStore(
    (state) => state.selectWorkspace,
  );
  const params = useLocalSearchParams<{
    reason?: string | string[];
  }>();
  const passwordInputRef = useRef<TextInput>(null);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(
    null,
  );
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [notice, setNotice] = useState<SignInNotice | null>(null);
  const routeReason = firstParam(params.reason);
  const { height, width } = useWindowDimensions();
  const {
    control,
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    resetField,
    setValue,
    trigger,
  } = useForm<SignInFormValues>({
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
    resolver: zodResolver(signInSchema),
  });

  const splitLayout = Platform.OS === "web" && width >= 1100;
  const desktopLayout = splitLayout;
  const compactLayout = splitLayout && height < 860;
  const denseLayout = splitLayout && height < 740;
  const pageMinHeight = height;
  const visualWidth = splitLayout ? "55%" : "100%";
  const photoWidth = desktopLayout ? "46%" : "100%";
  const logoScale = desktopLayout ? (compactLayout ? 0.86 : 1) : 0.64;
  const formHorizontalPadding = splitLayout
    ? Math.min(32, Math.max(20, width * 0.02))
    : 16;
  const formVerticalPadding = denseLayout ? 12 : compactLayout ? 20 : 48;
  const cardPadding = denseLayout ? 20 : compactLayout ? 28 : 41;
  const desktopCardWidth = Math.min(
    520,
    width * 0.45 - formHorizontalPadding * 2,
  );

  useEffect(() => {
    if (routeReason === "session-expired") {
      setNotice({
        kind: "session-expired",
        message: "Your session expired. Sign in again to continue.",
        tone: "info",
      });
      let active = true;
      void (async () => {
        const previousEmail = await getLastAuthEmail().catch(() => null);
        if (active && previousEmail) {
          setValue("email", previousEmail, { shouldValidate: false });
        }
      })();

      return () => {
        active = false;
      };
    }

    if (routeReason === "email-not-verified") {
      setNotice({
        kind: "unverified-email",
        message: "Verify your email before signing in.",
        tone: "warning",
      });
      return;
    }

    if (routeReason === "disabled-account") {
      setNotice({
        kind: "disabled-account",
        message:
          "This account is currently unavailable. Contact support if you need help.",
        tone: "error",
      });
    }
  }, [routeReason, setValue]);

  const clearRequestNotice = () => {
    setNotice((current) =>
      current?.kind === "session-expired" ? current : null,
    );
  };

  const submit = handleSubmit(async (values) => {
    setNotice(null);

    try {
      const context = await authenticateWithPassword(values);
      const workspaces = workspacesFromAuthContext(context);

      if (workspaces.length === 1) {
        selectWorkspace(workspaces[0]);
        router.replace(destinationForWorkspace(workspaces[0]));
      } else {
        router.replace("/auth/choose-workspace");
      }
    } catch (error) {
      resetField("password", { defaultValue: "" });
      setIsPasswordVisible(false);

      if (error instanceof AuthRequestError) {
        setNotice(noticeForAuthError(error));
        return;
      }

      setNotice({
        kind: "server",
        message:
          "Your secure session could not be saved. Please try signing in again.",
        tone: "error",
      });
    }
  });

  const resendVerification = async () => {
    const emailValid = await trigger("email");
    if (!emailValid) {
      return;
    }

    setIsResending(true);
    try {
      await resendVerificationEmail(getValues("email"));
      setNotice({
        kind: "resend-accepted",
        message:
          "If the account is eligible, a verification email will be sent.",
        tone: "info",
      });
    } catch (error) {
      setNotice(
        error instanceof AuthRequestError
          ? noticeForAuthError(error)
          : {
              kind: "server",
              message:
                "The verification request could not be completed. Please try again.",
              tone: "error",
            },
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ android: "height", ios: "padding" })}
      style={styles.flex}
    >
      <StatusBar style="dark" />

      <SafeAreaView edges={splitLayout ? [] : ["top"]} style={styles.page}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ flexGrow: 1 }}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.pageContent,
              {
                flexDirection: splitLayout ? "row" : "column",
                minHeight: pageMinHeight,
              },
            ]}
          >
            <View
              style={[
                styles.visualPane,
                {
                  height: splitLayout ? undefined : 200,
                  minHeight: splitLayout ? pageMinHeight : undefined,
                  width: visualWidth,
                },
              ]}
              testID="auth-visual-pane"
            >
              {desktopLayout ? (
                <View
                  pointerEvents="none"
                  style={styles.brandShapes}
                  testID="auth-brand-shapes"
                >
                  <View
                    style={[
                      styles.brandShape,
                      styles.brandShapePink,
                      {
                        filter:
                          Platform.OS === "web"
                            ? "blur(92.747px)"
                            : [{ blur: 92.747 }],
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.brandShape,
                      styles.brandShapeBlue,
                      {
                        filter:
                          Platform.OS === "web"
                            ? "blur(103.052px)"
                            : [{ blur: 103.052 }],
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.brandShape,
                      styles.brandShapeSoft,
                      {
                        filter:
                          Platform.OS === "web"
                            ? "blur(120px)"
                            : [{ blur: 120 }],
                      },
                    ]}
                  />
                </View>
              ) : null}

              <Image
                accessible={false}
                contentFit="cover"
                contentPosition="center"
                source={require("@/assets/images/auth-sign-in-fashion.jpg")}
                style={[
                  styles.fashionImage,
                  {
                    opacity: desktopLayout ? 1 : 0.58,
                    width: photoWidth,
                  },
                ]}
                testID="auth-fashion-image"
                transition={250}
              />
              <View
                pointerEvents="none"
                style={[styles.photoFade, { width: photoWidth }]}
                testID="auth-photo-fade"
              />

              <VeloriLogo
                style={[
                  styles.logo,
                  {
                    left: desktopLayout ? (compactLayout ? 48 : 64) : 24,
                    top: desktopLayout ? (compactLayout ? 32 : 56) : 18,
                  },
                ]}
                testID="auth-brand-logo"
                width={217 * logoScale}
              />

              {desktopLayout ? (
                <View
                  style={[
                    styles.editorialCopy,
                    compactLayout && styles.editorialCopyCompact,
                  ]}
                  testID="auth-editorial-copy"
                >
                  <StylishText
                    accessibilityRole="header"
                    className="text-ink-primary"
                    style={styles.editorialTitle}
                    testID="auth-editorial-title"
                    unstyled
                    variant="page-title"
                  >
                    Authentic style, made easy.
                  </StylishText>
                  <StylishText
                    className="mt-[20px] max-w-[440px] text-neutral-550"
                    style={styles.editorialDescription}
                    testID="auth-editorial-description"
                    unstyled
                    variant="body"
                  >
                    Discover products you&apos;ll love and manage every part of
                    your Velori experience in one secure place.
                  </StylishText>
                  <View
                    accessibilityLabel="First of three highlights"
                    style={styles.progress}
                  >
                    <View style={styles.progressActive} />
                    <View style={styles.progressBlue} />
                    <View style={styles.progressPink} />
                  </View>
                </View>
              ) : null}

              {desktopLayout ? (
                <StylishText
                  className="text-neutral-550"
                  style={[
                    styles.footerCopy,
                    compactLayout && styles.footerCopyCompact,
                  ]}
                  unstyled
                  variant="helper"
                >
                  Velori — multi-vendor fashion marketplace
                </StylishText>
              ) : null}
            </View>

            <View
              style={[
                styles.formPane,
                {
                  justifyContent: splitLayout ? "center" : "flex-start",
                  minHeight: splitLayout ? pageMinHeight : undefined,
                  paddingHorizontal: formHorizontalPadding,
                  paddingBottom: splitLayout ? formVerticalPadding : 24,
                  paddingTop: splitLayout ? formVerticalPadding : 24,
                },
              ]}
            >
              <View
                style={[
                  styles.authCard,
                  {
                    padding: splitLayout ? cardPadding : 24,
                    width: desktopLayout
                      ? desktopCardWidth
                      : splitLayout
                        ? "100%"
                        : Math.min(520, width - 32),
                  },
                ]}
                testID="auth-sign-in-card"
              >
                <View testID="auth-sign-in-content">
                  <StylishText
                    accessibilityRole="header"
                    className="text-ink-primary"
                    style={[
                      styles.cardTitle,
                      compactLayout && styles.cardTitleCompact,
                    ]}
                    testID="auth-card-title"
                    unstyled
                    variant="section-title"
                  >
                    Welcome back!
                  </StylishText>
                  <StylishText
                    className="mt-[8px] text-neutral-550"
                    variant="body"
                  >
                    Sign in to continue to your Velori account.
                  </StylishText>
                </View>

                <View
                  style={[styles.form, compactLayout && styles.formCompact]}
                  testID="auth-sign-in-form"
                >
                  {notice ? (
                    <View
                      key={notice.kind}
                      style={[
                        styles.alertSpacing,
                        compactLayout && styles.alertSpacingCompact,
                      ]}
                    >
                      <AuthAlertBanner
                        actionLabel={
                          notice.kind === "unverified-email"
                            ? "Resend verification email"
                            : undefined
                        }
                        busy={isResending}
                        message={notice.message}
                        onAction={
                          notice.kind === "unverified-email"
                            ? () => void resendVerification()
                            : undefined
                        }
                        tone={notice.tone}
                      />
                    </View>
                  ) : null}

                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <AuthFormField
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        compact={compactLayout}
                        editable={!isSubmitting}
                        error={errors.email?.message}
                        focused={focusedField === "email"}
                        icon={require("@/assets/icons/auth-email.svg")}
                        keyboardType="email-address"
                        label="Email address"
                        nativeID="sign-in-email"
                        onBlur={() => {
                          setFocusedField(null);
                          onBlur();
                        }}
                        onChangeText={(text) => {
                          clearRequestNotice();
                          onChange(text);
                        }}
                        onFocus={() => setFocusedField("email")}
                        onSubmitEditing={() =>
                          passwordInputRef.current?.focus()
                        }
                        placeholder="you@example.com"
                        placeholderTextColor="rgba(103, 103, 103, 0.8)"
                        returnKeyType="next"
                        testID="auth-email-input"
                        textContentType="emailAddress"
                        value={value}
                      />
                    )}
                  />

                  <View
                    style={[
                      styles.passwordGroup,
                      compactLayout && styles.passwordGroupCompact,
                    ]}
                  >
                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onBlur, onChange, value } }) => (
                        <AuthFormField
                          ref={passwordInputRef}
                          autoCapitalize="none"
                          autoComplete="current-password"
                          compact={compactLayout}
                          editable={!isSubmitting}
                          error={errors.password?.message}
                          focused={focusedField === "password"}
                          icon={require("@/assets/icons/auth-lock.svg")}
                          label="Password"
                          nativeID="sign-in-password"
                          onBlur={() => {
                            setFocusedField(null);
                            onBlur();
                          }}
                          onChangeText={(text) => {
                            clearRequestNotice();
                            onChange(text);
                          }}
                          onFocus={() => setFocusedField("password")}
                          onSubmitEditing={() => void submit()}
                          placeholder="Enter your password"
                          placeholderTextColor="rgba(103, 103, 103, 0.8)"
                          returnKeyType="done"
                          secureTextEntry={!isPasswordVisible}
                          testID="auth-password-input"
                          textContentType="password"
                          trailing={
                            <Pressable
                              accessibilityLabel={
                                isPasswordVisible
                                  ? "Hide password"
                                  : "Show password"
                              }
                              accessibilityRole="button"
                              accessibilityState={{ disabled: isSubmitting }}
                              disabled={isSubmitting}
                              hitSlop={4}
                              onPress={() =>
                                setIsPasswordVisible((isVisible) => !isVisible)
                              }
                              style={styles.eyeButton}
                              testID="auth-password-visibility"
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
                      accessibilityHint="Opens password recovery"
                      accessibilityRole="link"
                      accessibilityState={{ disabled: isSubmitting }}
                      disabled={isSubmitting}
                      hitSlop={6}
                      onPress={() => router.push("/forgot-password")}
                      style={[
                        styles.forgotLink,
                        compactLayout && styles.forgotLinkCompact,
                      ]}
                      testID="auth-forgot-password"
                    >
                      <StylishText
                        className="text-brand-primary underline"
                        style={styles.linkText}
                        unstyled
                        variant="navigation-strong"
                      >
                        Forgot password?
                      </StylishText>
                    </Pressable>
                  </View>

                  <Pressable
                    accessibilityLabel={isSubmitting ? "Signing in" : "Sign in"}
                    accessibilityRole="button"
                    accessibilityState={{
                      busy: isSubmitting,
                      disabled: isSubmitting,
                    }}
                    disabled={isSubmitting}
                    onPress={() => void submit()}
                    style={({ pressed }) => [
                      styles.signInButton,
                      compactLayout && styles.signInButtonCompact,
                      pressed && !isSubmitting && styles.signInButtonPressed,
                      isSubmitting && styles.signInButtonLoading,
                    ]}
                    testID="auth-sign-in-submit"
                  >
                    {isSubmitting ? (
                      <View style={styles.loadingContent}>
                        <ActivityIndicator
                          color={colors.neutral[0]}
                          size="small"
                        />
                        <StylishText
                          className="text-neutral-0"
                          style={styles.buttonLabel}
                          unstyled
                          variant="button"
                        >
                          Signing in…
                        </StylishText>
                      </View>
                    ) : (
                      <StylishText
                        className="text-neutral-0"
                        style={styles.buttonLabel}
                        unstyled
                        variant="button"
                      >
                        Sign In
                      </StylishText>
                    )}
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.divider,
                    compactLayout && styles.dividerCompact,
                  ]}
                />

                <StylishText
                  className="text-center text-neutral-525"
                  style={styles.socialLabel}
                  testID="auth-social-label"
                  unstyled
                  variant="form-label"
                >
                  Social sign-in{" "}
                  <Text style={styles.socialMuted}>— coming soon</Text>
                </StylishText>
                <View
                  style={[
                    styles.socialRow,
                    compactLayout && styles.socialRowCompact,
                  ]}
                >
                  {SOCIAL_OPTIONS.map((option) => (
                    <Pressable
                      key={option.label}
                      accessibilityLabel={option.label}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: true }}
                      disabled
                      style={[
                        styles.socialButton,
                        compactLayout && styles.socialButtonCompact,
                      ]}
                    >
                      <Image
                        accessible={false}
                        contentFit="contain"
                        source={option.source}
                        style={styles.socialIcon}
                      />
                    </Pressable>
                  ))}
                </View>

                <View
                  style={[
                    styles.createAccountRow,
                    compactLayout && styles.createAccountRowCompact,
                  ]}
                >
                  <StylishText
                    className="text-neutral-525"
                    style={styles.createAccountPrompt}
                    unstyled
                    variant="navigation"
                  >
                    New to Velori?
                  </StylishText>
                  <Pressable
                    accessibilityHint="Opens account registration"
                    accessibilityRole="link"
                    hitSlop={8}
                    onPress={() => router.push("/sign-up")}
                    testID="auth-create-account"
                  >
                    <StylishText
                      className="text-brand-primary underline"
                      style={styles.linkText}
                      unstyled
                      variant="navigation-strong"
                    >
                      Create an account
                    </StylishText>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  alertSpacing: { marginBottom: 20 },
  alertSpacingCompact: { marginBottom: 14 },
  authCard: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#11223B",
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: typography.fontSize.headingLarge,
    letterSpacing: typography.letterSpacing.headingLarge,
    lineHeight: typography.lineHeight.headingLarge,
  },
  cardTitleCompact: { fontSize: 28, lineHeight: 34 },
  brandShape: {
    borderRadius: 9999,
    position: "absolute",
  },
  brandShapeBlue: {
    backgroundColor: "rgba(207, 226, 252, 0.6)",
    height: 474.039,
    left: 521.42,
    top: 579.82,
    width: 474.039,
  },
  brandShapePink: {
    backgroundColor: "rgba(248, 188, 198, 0.45)",
    height: 432.818,
    left: -146.41,
    top: -135.56,
    width: 432.818,
  },
  brandShapeSoft: {
    backgroundColor: "rgba(252, 243, 246, 0.7)",
    height: 560,
    left: 154.22,
    top: 168,
    width: 560,
  },
  brandShapes: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  buttonLabel: {
    fontFamily: typography.fontFamily.montserratSemibold,
    fontSize: typography.fontSize.button,
    lineHeight: typography.lineHeight.button,
  },
  createAccountPrompt: {
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
  },
  createAccountRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: 24,
    minHeight: 44,
  },
  createAccountRowCompact: { marginTop: 12, minHeight: 40 },
  divider: {
    backgroundColor: colors.neutral[200],
    height: 1,
    marginBottom: 24,
    marginTop: 24,
  },
  dividerCompact: { marginBottom: 16, marginTop: 16 },
  editorialCopy: {
    left: 64,
    maxWidth: 520,
    position: "absolute",
    right: 32,
    top: "39.4%",
    zIndex: 2,
  },
  editorialCopyCompact: { left: 48, top: "37%" },
  editorialTitle: {
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: typography.fontSize.displayLarge,
    letterSpacing: typography.letterSpacing.displayLarge,
    lineHeight: typography.lineHeight.displayLarge,
    maxWidth: 520,
    width: "100%",
  },
  editorialDescription: {
    alignSelf: "flex-start",
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodyLarge,
    lineHeight: typography.lineHeight.bodyLarge,
    maxWidth: 440,
    width: "100%",
  },
  eyeButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  eyeIcon: { height: 18, opacity: 0.72, width: 18 },
  fashionImage: {
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  flex: { flex: 1 },
  forgotLink: {
    alignItems: "center",
    alignSelf: "flex-end",
    justifyContent: "center",
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  forgotLinkCompact: { marginTop: 4, minHeight: 40 },
  form: { marginTop: 24 },
  formCompact: { marginTop: 16 },
  formPane: {
    alignItems: "center",
    backgroundColor: colors.neutral[0],
    flex: 1,
  },
  linkText: {
    fontFamily: typography.fontFamily.montserratSemibold,
    fontSize: typography.fontSize.button,
    lineHeight: typography.lineHeight.button,
  },
  loadingContent: { alignItems: "center", flexDirection: "row", gap: 10 },
  logo: {
    position: "absolute",
    zIndex: 3,
  },
  page: { backgroundColor: colors.neutral[0], flex: 1 },
  pageContent: { flexGrow: 1 },
  passwordGroup: { marginTop: 20 },
  passwordGroupCompact: { marginTop: 14 },
  photoFade: {
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1,
  },
  progress: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 40,
  },
  progressActive: {
    backgroundColor: colors.brand.primary,
    borderRadius: 999,
    height: 8,
    width: 40,
  },
  progressBlue: {
    backgroundColor: colors.brand.blue,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  progressPink: {
    backgroundColor: colors.brand.pinkSoft,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  signInButton: {
    alignItems: "center",
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    height: 56,
    justifyContent: "center",
    marginTop: 20,
    shadowColor: colors.brand.primary,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 8,
  },
  signInButtonLoading: {
    backgroundColor: "rgba(248, 55, 88, 0.4)",
    shadowOpacity: 0,
  },
  signInButtonCompact: { height: 50, marginTop: 14 },
  signInButtonPressed: { shadowOpacity: 0.18, transform: [{ scale: 0.992 }] },
  socialButton: {
    alignItems: "center",
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: 999,
    borderWidth: 1,
    height: 55,
    justifyContent: "center",
    opacity: 0.45,
    width: 55,
  },
  socialButtonCompact: { height: 44, width: 44 },
  socialIcon: { height: 20, width: 20 },
  socialLabel: {
    fontFamily: typography.fontFamily.montserratMedium,
    fontSize: typography.fontSize.label,
    lineHeight: typography.lineHeight.label,
  },
  socialMuted: { color: colors.neutral[400] },
  socialRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    marginTop: 16,
  },
  socialRowCompact: { marginTop: 10 },
  footerCopy: {
    bottom: 56,
    fontFamily: typography.fontFamily.montserratMedium,
    fontSize: typography.fontSize.caption,
    left: 64,
    lineHeight: typography.lineHeight.caption,
    position: "absolute",
    zIndex: 2,
  },
  footerCopyCompact: { bottom: 24, left: 48 },
  visualPane: {
    backgroundColor: "#FCF3F6",
    overflow: "hidden",
    position: "relative",
  },
});
