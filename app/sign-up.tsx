import { zodResolver } from "@hookform/resolvers/zod";
import { Image, type ImageSource } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
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
import { AuthVisualPane } from "@/components/auth/auth-visual-pane";
import { StylishText } from "@/components/typography/stylish-text";
import { colors, typography } from "@/constants/design-tokens";
import {
  AuthRequestError,
  register,
  type AuthErrorKind,
} from "@/services/auth/auth-api";
import { savePendingVerificationEmail } from "@/services/auth/auth-storage";

const signUpSchema = z
  .object({
    confirmPassword: z
      .string()
      .min(1, "Re-enter your password.")
      .max(128, "Password must be 128 characters or fewer."),
    displayName: z
      .string()
      .trim()
      .max(120, "Display name must be 120 characters or fewer."),
    email: z
      .string()
      .trim()
      .min(1, "Enter your email address.")
      .email("Enter a valid email address.")
      .max(320, "Email address must be 320 characters or fewer."),
    password: z
      .string()
      .min(1, "Create a password.")
      .min(12, "Use at least 12 characters.")
      .max(128, "Password must be 128 characters or fewer."),
    termsAccepted: z.boolean().refine(Boolean, {
      message: "Accept the Terms of Service and Privacy Policy to continue.",
    }),
  })
  .refine(({ confirmPassword, password }) => confirmPassword === password, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;
type SignUpField = keyof SignUpFormValues;

type RegistrationNotice = {
  kind: AuthErrorKind;
  message: string;
  tone: AuthAlertTone;
};

const SOCIAL_OPTIONS: { label: string; source: ImageSource }[] = [
  {
    label: "Google sign-up — coming soon",
    source: require("@/assets/icons/social-google.svg"),
  },
  {
    label: "Apple sign-up — coming soon",
    source: require("@/assets/icons/social-apple.svg"),
  },
  {
    label: "Facebook sign-up — coming soon",
    source: require("@/assets/icons/social-facebook.svg"),
  },
];

const SERVER_FIELDS: Readonly<Record<string, SignUpField>> = {
  displayName: "displayName",
  email: "email",
  password: "password",
};

const SAFE_SERVER_FIELD_MESSAGES: Readonly<
  Partial<Record<SignUpField, string>>
> = {
  displayName: "Check your display name and try again.",
  email: "Enter a valid email address.",
  password: "Use a valid password of at least 12 characters.",
};

function noticeForRegistrationError(
  error: AuthRequestError,
): RegistrationNotice {
  switch (error.kind) {
    case "duplicate-registration":
      return {
        kind: error.kind,
        message:
          "We couldn't create an account using that information. Check your details and try again.",
        tone: "error",
      };
    case "rate-limited":
      return {
        kind: error.kind,
        message:
          "Too many account-creation attempts. Please wait a moment and try again.",
        tone: "warning",
      };
    case "network":
      return {
        kind: error.kind,
        message:
          "We couldn't connect to Velori. Check your connection and try again.",
        tone: "error",
      };
    case "server":
    case "service-unavailable":
      return {
        kind: error.kind,
        message:
          "Account creation is temporarily unavailable. Please try again shortly.",
        tone: "error",
      };
    case "validation":
      return {
        kind: error.kind,
        message: "Check the highlighted fields and try again.",
        tone: "error",
      };
    default:
      return {
        kind: "server",
        message: "Account creation could not be completed. Please try again.",
        tone: "error",
      };
  }
}

function showLegalNotice(title: string) {
  Alert.alert(
    title,
    `${title} content will be published before the marketplace launches.`,
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const displayNameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const [focusedField, setFocusedField] = useState<
    "displayName" | "email" | "password" | "confirmPassword" | null
  >(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [notice, setNotice] = useState<RegistrationNotice | null>(null);
  const { height, width } = useWindowDimensions();
  const {
    clearErrors,
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
    setValue,
    watch,
  } = useForm<SignUpFormValues>({
    defaultValues: {
      confirmPassword: "",
      displayName: "",
      email: "",
      password: "",
      termsAccepted: false,
    },
    mode: "onTouched",
    resolver: zodResolver(signUpSchema),
  });

  const splitLayout = Platform.OS === "web" && width >= 1100;
  const desktopLayout = splitLayout;
  const compactLayout = splitLayout && height < 1000;
  const denseLayout = splitLayout && height < 800;
  const pageMinHeight = height;
  const visualWidth = splitLayout ? "55%" : "100%";
  const formHorizontalPadding = splitLayout
    ? Math.min(32, Math.max(20, width * 0.02))
    : 16;
  const formVerticalPadding = denseLayout ? 12 : compactLayout ? 20 : 48;
  const cardPadding = denseLayout ? 16 : compactLayout ? 24 : 41;
  const cardWidth = splitLayout
    ? Math.min(520, width * 0.45 - formHorizontalPadding * 2)
    : Math.min(520, width - 32);
  const termsAccepted = watch("termsAccepted");

  const clearRequestNotice = () => setNotice(null);

  const submit = handleSubmit(async (values) => {
    setNotice(null);

    try {
      const result = await register({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
      });

      await savePendingVerificationEmail(result.user.email).catch(
        () => undefined,
      );

      router.replace({
        pathname: "/auth/verify-email",
        params: { email: result.user.email },
      });
    } catch (error) {
      setIsPasswordVisible(false);
      setIsConfirmPasswordVisible(false);

      if (error instanceof AuthRequestError) {
        let hasMappedFieldError = false;

        if (error.kind === "validation") {
          for (const serverField of Object.keys(error.fieldErrors)) {
            const field = SERVER_FIELDS[serverField];
            if (field) {
              hasMappedFieldError = true;
              setError(field, {
                message:
                  SAFE_SERVER_FIELD_MESSAGES[field] ??
                  "Check this field and try again.",
                type: "server",
              });
            }
          }
        }

        if (error.kind === "duplicate-registration") {
          setValue("password", "", {
            shouldDirty: true,
            shouldTouch: false,
            shouldValidate: false,
          });
          setValue("confirmPassword", "", {
            shouldDirty: true,
            shouldTouch: false,
            shouldValidate: false,
          });
          clearErrors(["password", "confirmPassword"]);
        }

        setNotice(
          error.kind === "validation" && hasMappedFieldError
            ? null
            : noticeForRegistrationError(error),
        );
        return;
      }

      setNotice({
        kind: "server",
        message: "Account creation could not be completed. Please try again.",
        tone: "error",
      });
    }
  });

  const submitForm = () => void submit();

  const onFieldChange = (field: SignUpField) => {
    clearRequestNotice();
    clearErrors(field === "password" ? ["password", "confirmPassword"] : field);
  };

  const toggleTerms = () => {
    if (isSubmitting) return;
    clearRequestNotice();
    clearErrors("termsAccepted");
    setValue("termsAccepted", !termsAccepted, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
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
          contentContainerStyle={styles.pageContent}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.shell,
              {
                flexDirection: splitLayout ? "row" : "column",
                minHeight: pageMinHeight,
              },
            ]}
            testID="auth-create-account-page"
          >
            <AuthVisualPane
              compact={compactLayout}
              desktop={desktopLayout}
              editorialTop={compactLayout ? "37%" : "40.9%"}
              minHeight={pageMinHeight}
              split={splitLayout}
              width={visualWidth}
            />

            <View
              style={[
                styles.formPane,
                {
                  paddingHorizontal: formHorizontalPadding,
                  paddingVertical: splitLayout ? formVerticalPadding : 24,
                },
              ]}
            >
              <View
                style={[
                  styles.card,
                  {
                    padding: splitLayout ? cardPadding : 24,
                    width: cardWidth,
                  },
                ]}
                testID="auth-create-account-card"
              >
                <View testID="auth-create-account-content">
                  <StylishText
                    accessibilityRole="header"
                    className="text-ink-primary"
                    style={[
                      styles.cardTitle,
                      compactLayout && styles.cardTitleCompact,
                      denseLayout && styles.cardTitleDense,
                    ]}
                    unstyled
                    variant="section-title"
                  >
                    Create your account
                  </StylishText>
                  <StylishText
                    className="mt-[8px] text-neutral-550"
                    style={[
                      styles.cardSubtitle,
                      denseLayout && styles.cardSubtitleDense,
                    ]}
                    unstyled
                    variant="body"
                  >
                    Start shopping and unlock your Velori experience.
                  </StylishText>

                  {notice ? (
                    <View
                      style={[
                        styles.alertSpacing,
                        compactLayout && styles.alertSpacingCompact,
                        denseLayout && styles.alertSpacingDense,
                      ]}
                    >
                      <AuthAlertBanner
                        message={notice.message}
                        tone={notice.tone}
                      />
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.form,
                      compactLayout && styles.formCompact,
                      denseLayout && styles.formDense,
                    ]}
                    testID="auth-create-account-form"
                  >
                    <Controller
                      control={control}
                      name="displayName"
                      render={({ field: { onBlur, onChange, value } }) => (
                        <AuthFormField
                          ref={displayNameInputRef}
                          autoCapitalize="words"
                          autoComplete="name"
                          compact={compactLayout}
                          editable={!isSubmitting}
                          error={errors.displayName?.message}
                          focused={focusedField === "displayName"}
                          icon={require("@/assets/icons/auth-user.svg")}
                          label="Display name"
                          labelSuffix="(optional)"
                          nativeID="sign-up-display-name"
                          onBlur={() => {
                            setFocusedField(null);
                            onBlur();
                          }}
                          onChangeText={(text) => {
                            onFieldChange("displayName");
                            onChange(text);
                          }}
                          onFocus={() => setFocusedField("displayName")}
                          onSubmitEditing={() => emailInputRef.current?.focus()}
                          placeholder="How should we greet you?"
                          placeholderTextColor="rgba(103, 103, 103, 0.8)"
                          returnKeyType="next"
                          testID="auth-register-display-name-input"
                          textContentType="name"
                          value={value}
                        />
                      )}
                    />

                    <View
                      style={[
                        styles.fieldSpacing,
                        compactLayout && styles.fieldSpacingCompact,
                        denseLayout && styles.fieldSpacingDense,
                      ]}
                    >
                      <Controller
                        control={control}
                        name="email"
                        render={({ field: { onBlur, onChange, value } }) => (
                          <AuthFormField
                            ref={emailInputRef}
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
                            nativeID="sign-up-email"
                            onBlur={() => {
                              setFocusedField(null);
                              onBlur();
                            }}
                            onChangeText={(text) => {
                              onFieldChange("email");
                              onChange(text);
                            }}
                            onFocus={() => setFocusedField("email")}
                            onSubmitEditing={() =>
                              passwordInputRef.current?.focus()
                            }
                            placeholder="you@example.com"
                            placeholderTextColor="rgba(103, 103, 103, 0.8)"
                            returnKeyType="next"
                            testID="auth-register-email-input"
                            textContentType="emailAddress"
                            value={value}
                          />
                        )}
                      />
                    </View>

                    <View
                      style={[
                        styles.fieldSpacing,
                        compactLayout && styles.fieldSpacingCompact,
                        denseLayout && styles.fieldSpacingDense,
                      ]}
                    >
                      <Controller
                        control={control}
                        name="password"
                        render={({ field: { onBlur, onChange, value } }) => (
                          <AuthFormField
                            ref={passwordInputRef}
                            autoCapitalize="none"
                            autoComplete="new-password"
                            autoCorrect={false}
                            compact={compactLayout}
                            editable={!isSubmitting}
                            error={errors.password?.message}
                            focused={focusedField === "password"}
                            helper="Use at least 12 characters."
                            icon={require("@/assets/icons/auth-lock.svg")}
                            label="Password"
                            nativeID="sign-up-password"
                            onBlur={() => {
                              setFocusedField(null);
                              onBlur();
                            }}
                            onChangeText={(text) => {
                              onFieldChange("password");
                              onChange(text);
                            }}
                            onFocus={() => setFocusedField("password")}
                            onSubmitEditing={() =>
                              confirmPasswordInputRef.current?.focus()
                            }
                            placeholder="Create a password"
                            placeholderTextColor="rgba(103, 103, 103, 0.8)"
                            returnKeyType="next"
                            secureTextEntry={!isPasswordVisible}
                            testID="auth-register-password-input"
                            textContentType="newPassword"
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
                                  setIsPasswordVisible((visible) => !visible)
                                }
                                style={[
                                  styles.eyeButton,
                                  isSubmitting && styles.controlDisabled,
                                ]}
                                testID="auth-register-password-visibility"
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
                    </View>

                    <View
                      style={[
                        styles.fieldSpacing,
                        compactLayout && styles.fieldSpacingCompact,
                        denseLayout && styles.fieldSpacingDense,
                      ]}
                    >
                      <Controller
                        control={control}
                        name="confirmPassword"
                        render={({ field: { onBlur, onChange, value } }) => (
                          <AuthFormField
                            ref={confirmPasswordInputRef}
                            autoCapitalize="none"
                            autoComplete="new-password"
                            autoCorrect={false}
                            compact={compactLayout}
                            editable={!isSubmitting}
                            error={errors.confirmPassword?.message}
                            focused={focusedField === "confirmPassword"}
                            icon={require("@/assets/icons/auth-lock.svg")}
                            label="Confirm password"
                            nativeID="sign-up-confirm-password"
                            onBlur={() => {
                              setFocusedField(null);
                              onBlur();
                            }}
                            onChangeText={(text) => {
                              onFieldChange("confirmPassword");
                              onChange(text);
                            }}
                            onFocus={() => setFocusedField("confirmPassword")}
                            onSubmitEditing={submitForm}
                            placeholder="Re-enter your password"
                            placeholderTextColor="rgba(103, 103, 103, 0.8)"
                            returnKeyType="done"
                            secureTextEntry={!isConfirmPasswordVisible}
                            testID="auth-register-confirm-password-input"
                            textContentType="newPassword"
                            trailing={
                              <Pressable
                                accessibilityLabel={
                                  isConfirmPasswordVisible
                                    ? "Hide confirm password"
                                    : "Show confirm password"
                                }
                                accessibilityRole="button"
                                accessibilityState={{ disabled: isSubmitting }}
                                disabled={isSubmitting}
                                hitSlop={4}
                                onPress={() =>
                                  setIsConfirmPasswordVisible(
                                    (visible) => !visible,
                                  )
                                }
                                style={[
                                  styles.eyeButton,
                                  isSubmitting && styles.controlDisabled,
                                ]}
                                testID="auth-register-confirm-password-visibility"
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
                    </View>

                    <View
                      style={[
                        styles.termsBlock,
                        compactLayout && styles.termsBlockCompact,
                        denseLayout && styles.termsBlockDense,
                      ]}
                    >
                      <View
                        style={[
                          styles.termsRow,
                          denseLayout && styles.termsRowDense,
                          isSubmitting && styles.controlDisabled,
                        ]}
                      >
                        <Pressable
                          accessibilityHint={errors.termsAccepted?.message}
                          accessibilityLabel="Accept the Terms of Service and Privacy Policy"
                          accessibilityRole="checkbox"
                          accessibilityState={{
                            checked: termsAccepted,
                            disabled: isSubmitting,
                          }}
                          disabled={isSubmitting}
                          hitSlop={8}
                          onPress={toggleTerms}
                          style={({ pressed }) => [
                            styles.checkbox,
                            termsAccepted && styles.checkboxChecked,
                            Boolean(errors.termsAccepted) &&
                              styles.checkboxInvalid,
                            pressed && !isSubmitting && styles.checkboxPressed,
                          ]}
                          testID="auth-register-terms-checkbox"
                        >
                          {termsAccepted ? (
                            <StylishText
                              className="text-neutral-0"
                              style={styles.checkmark}
                              unstyled
                              variant="navigation"
                            >
                              ✓
                            </StylishText>
                          ) : null}
                        </Pressable>

                        <View style={styles.termsCopy}>
                          <StylishText
                            className="text-neutral-550"
                            style={styles.termsText}
                            unstyled
                            variant="navigation"
                          >
                            I agree to the
                          </StylishText>
                          <Pressable
                            accessibilityState={{ disabled: isSubmitting }}
                            accessibilityRole="link"
                            disabled={isSubmitting}
                            hitSlop={4}
                            onPress={() => showLegalNotice("Terms of Service")}
                            testID="auth-register-terms-link"
                          >
                            <StylishText
                              className="text-[#C81E3E] underline"
                              style={styles.termsLink}
                              unstyled
                              variant="navigation"
                            >
                              Terms of Service
                            </StylishText>
                          </Pressable>
                          <StylishText
                            className="text-neutral-550"
                            style={styles.termsText}
                            unstyled
                            variant="navigation"
                          >
                            and
                          </StylishText>
                          <Pressable
                            accessibilityState={{ disabled: isSubmitting }}
                            accessibilityRole="link"
                            disabled={isSubmitting}
                            hitSlop={4}
                            onPress={() => showLegalNotice("Privacy Policy")}
                            testID="auth-register-privacy-link"
                          >
                            <StylishText
                              className="text-[#C81E3E] underline"
                              style={styles.termsLink}
                              unstyled
                              variant="navigation"
                            >
                              Privacy Policy
                            </StylishText>
                          </Pressable>
                          <StylishText
                            className="text-neutral-550"
                            style={styles.termsText}
                            unstyled
                            variant="navigation"
                          >
                            .
                          </StylishText>
                        </View>
                      </View>

                      {errors.termsAccepted ? (
                        <View
                          accessibilityLiveRegion="polite"
                          accessibilityRole="alert"
                          style={styles.termsError}
                          testID="auth-register-terms-error"
                        >
                          <Image
                            accessible={false}
                            contentFit="contain"
                            source={require("@/assets/icons/auth-field-error.svg")}
                            style={styles.termsErrorIcon}
                          />
                          <StylishText
                            className="flex-1 text-[#C81E3E]"
                            variant="helper"
                          >
                            {errors.termsAccepted.message}
                          </StylishText>
                        </View>
                      ) : null}
                    </View>

                    <Pressable
                      accessibilityLabel={
                        isSubmitting ? "Creating account" : "Create Account"
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        busy: isSubmitting,
                        disabled: isSubmitting,
                      }}
                      disabled={isSubmitting}
                      onPress={submitForm}
                      style={({ pressed }) => [
                        styles.submitButton,
                        compactLayout && styles.submitButtonCompact,
                        denseLayout && styles.submitButtonDense,
                        pressed && !isSubmitting && styles.submitButtonPressed,
                        isSubmitting && styles.submitButtonLoading,
                      ]}
                      testID="auth-create-account-submit"
                    >
                      {isSubmitting ? (
                        <View style={styles.loadingContent}>
                          <ActivityIndicator color={colors.neutral[0]} />
                          <StylishText
                            className="text-neutral-0"
                            variant="button"
                          >
                            Creating account…
                          </StylishText>
                        </View>
                      ) : (
                        <StylishText
                          className="text-neutral-0"
                          variant="button"
                        >
                          Create Account
                        </StylishText>
                      )}
                    </Pressable>
                  </View>

                  <View
                    style={[
                      styles.divider,
                      compactLayout && styles.dividerCompact,
                      denseLayout && styles.dividerDense,
                    ]}
                  />

                  <View
                    style={[
                      styles.socialArea,
                      denseLayout && styles.socialAreaDense,
                    ]}
                  >
                    <StylishText
                      className="text-neutral-550"
                      style={styles.socialLabel}
                      unstyled
                      variant="navigation"
                    >
                      Social sign-in{" "}
                      <StylishText
                        className="text-neutral-400"
                        style={styles.socialLabel}
                        unstyled
                        variant="navigation"
                      >
                        — coming soon
                      </StylishText>
                    </StylishText>
                    <View
                      style={[
                        styles.socialRow,
                        compactLayout && styles.socialRowCompact,
                        denseLayout && styles.socialRowDense,
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
                            denseLayout && styles.socialButtonDense,
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
                  </View>

                  <View
                    style={[
                      styles.signInRow,
                      compactLayout && styles.signInRowCompact,
                      denseLayout && styles.signInRowDense,
                    ]}
                  >
                    <StylishText
                      className="text-neutral-550"
                      style={styles.signInPrompt}
                      unstyled
                      variant="navigation"
                    >
                      Already have an account?
                    </StylishText>
                    <Pressable
                      accessibilityLabel="Sign In"
                      accessibilityRole="link"
                      hitSlop={8}
                      onPress={() => router.replace("/sign-in")}
                      style={({ pressed }) => [
                        styles.signInLink,
                        pressed && styles.linkPressed,
                      ]}
                    >
                      <StylishText
                        className="text-[#C81E3E] underline"
                        style={styles.linkText}
                        unstyled
                        variant="navigation-strong"
                      >
                        Sign In
                      </StylishText>
                    </Pressable>
                  </View>
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
  alertSpacing: { marginTop: 20 },
  alertSpacingCompact: { marginTop: 16 },
  alertSpacingDense: { marginTop: 10 },
  card: {
    alignSelf: "center",
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 520,
    shadowColor: colors.ink.primary,
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
  },
  cardSubtitle: {
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodyMedium,
    lineHeight: typography.lineHeight.bodyMedium,
  },
  cardSubtitleDense: { fontSize: 14, lineHeight: 20 },
  cardTitle: {
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: typography.fontSize.headingLarge,
    letterSpacing: typography.letterSpacing.headingLarge,
    lineHeight: typography.lineHeight.headingLarge,
  },
  cardTitleCompact: { fontSize: 28, lineHeight: 34 },
  cardTitleDense: { fontSize: 26, lineHeight: 32 },
  checkbox: {
    alignItems: "center",
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[400],
    borderRadius: 6,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  checkboxInvalid: { borderColor: "#C81E3E" },
  checkboxPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  checkmark: {
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: typography.fontSize.bodySmall,
    lineHeight: typography.lineHeight.caption,
  },
  controlDisabled: { opacity: 0.5 },
  divider: {
    backgroundColor: colors.neutral[200],
    height: 1,
    marginBottom: 24,
    marginTop: 24,
  },
  dividerCompact: { marginBottom: 16, marginTop: 16 },
  dividerDense: { marginBottom: 10, marginTop: 10 },
  eyeButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  eyeIcon: { height: 18, opacity: 0.72, width: 18 },
  fieldSpacing: { marginTop: 20 },
  fieldSpacingCompact: { marginTop: 14 },
  fieldSpacingDense: { marginTop: 10 },
  flex: { flex: 1 },
  form: { marginTop: 24 },
  formCompact: { marginTop: 16 },
  formDense: { marginTop: 10 },
  formPane: {
    alignItems: "center",
    backgroundColor: colors.neutral[0],
    flex: 1,
    justifyContent: "center",
  },
  linkPressed: { opacity: 0.68 },
  linkText: {
    fontFamily: typography.fontFamily.montserratSemibold,
    fontSize: typography.fontSize.button,
    lineHeight: typography.lineHeight.button,
  },
  loadingContent: { alignItems: "center", flexDirection: "row", gap: 10 },
  page: { backgroundColor: colors.neutral[0], flex: 1 },
  pageContent: { flexGrow: 1 },
  shell: { flexGrow: 1, width: "100%" },
  signInLink: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 4,
  },
  signInPrompt: {
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
  },
  signInRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: 24,
    minHeight: 44,
  },
  signInRowCompact: { marginTop: 12, minHeight: 40 },
  signInRowDense: { marginTop: 8 },
  socialArea: { alignItems: "center" },
  socialAreaDense: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
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
  socialButtonDense: { height: 40, width: 40 },
  socialIcon: { height: 20, width: 20 },
  socialLabel: {
    fontFamily: typography.fontFamily.montserratMedium,
    fontSize: typography.fontSize.label,
    lineHeight: typography.lineHeight.label,
  },
  socialRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    marginTop: 16,
  },
  socialRowCompact: { marginTop: 10 },
  socialRowDense: { gap: 10, marginTop: 0 },
  submitButton: {
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
  submitButtonLoading: {
    backgroundColor: "rgba(248, 55, 88, 0.4)",
    shadowOpacity: 0,
  },
  submitButtonCompact: { height: 50, marginTop: 14 },
  submitButtonDense: { height: 48, marginTop: 10 },
  submitButtonPressed: {
    shadowOpacity: 0.18,
    transform: [{ scale: 0.992 }],
  },
  termsBlock: { marginTop: 20 },
  termsBlockCompact: { marginTop: 14 },
  termsBlockDense: { marginTop: 10 },
  termsCopy: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    minWidth: 0,
  },
  termsError: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  termsErrorIcon: { height: 14, marginTop: 1, width: 14 },
  termsLink: {
    fontFamily: typography.fontFamily.montserratMedium,
    fontSize: typography.fontSize.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
  },
  termsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 44,
  },
  termsRowDense: { minHeight: 40 },
  termsText: {
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
  },
});
