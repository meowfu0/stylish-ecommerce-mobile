import { MaterialIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { z } from "zod";

import { colors, spacing } from "@/constants/design-tokens";
import { isDesktopWeb } from "@/constants/responsive";

const FIGMA_FRAME = {
  width: 375,
  titleTop: 72,
  contentWidth: 317,
} as const;

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .email("Enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type SubmissionStatus = "idle" | "success" | "error";

function waitForFrontendSubmission() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 650);
  });
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatus>("idle");
  const { width } = useWindowDimensions();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
    resolver: zodResolver(forgotPasswordSchema),
  });

  const desktopWeb = isDesktopWeb(width);
  const widthScale = Math.min(1, width / FIGMA_FRAME.width);
  const contentWidth = desktopWeb ? 440 : FIGMA_FRAME.contentWidth * widthScale;
  const cardWidth = desktopWeb ? 520 : contentWidth;
  const contentLeft = (width - cardWidth) / 2;
  const contentTop = desktopWeb
    ? spacing.xl
    : Math.max(0, FIGMA_FRAME.titleTop - insets.top);

  const returnToSignIn = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/sign-in");
  };

  const submitValidatedForm = async (_values: ForgotPasswordFormValues) => {
    setSubmissionStatus("idle");

    try {
      // This delay exposes the loading UI until a backend reset endpoint exists.
      await waitForFrontendSubmission();
      setSubmissionStatus("success");
    } catch {
      setSubmissionStatus("error");
    }
  };

  const handlePrimaryAction = () => {
    if (submissionStatus === "success") {
      returnToSignIn();
      return;
    }

    void handleSubmit(submitValidatedForm)();
  };

  const buttonLabel =
    submissionStatus === "success"
      ? "Back to Sign In"
      : submissionStatus === "error"
        ? "Try Again"
        : "Submit";

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ android: "height", ios: "padding" })}
      className={`flex-1 ${desktopWeb ? "bg-neutral-50" : "bg-neutral-0"}`}
    >
      <StatusBar style="dark" />

      <SafeAreaView
        className={`flex-1 ${desktopWeb ? "bg-neutral-50" : "bg-neutral-0"}`}
        edges={desktopWeb ? [] : undefined}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            paddingTop: contentTop,
          }}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          showsVerticalScrollIndicator={desktopWeb}
        >
          <View
            className={
              desktopWeb
                ? "rounded-lg border border-neutral-200 bg-neutral-0 p-[40px] shadow-sm"
                : ""
            }
            style={{ marginLeft: contentLeft, width: cardWidth }}
          >
            <Text
              accessibilityRole="header"
              className="font-montserrat-bold text-authTitle text-neutral-1000"
            >
              {desktopWeb ? "Forgot your password?" : "Forgot\npassword?"}
            </Text>

            <View className="mt-[24px]">
              <Controller
                control={control}
                name="email"
                render={({ field: { onBlur, onChange, value } }) => (
                  <View
                    className="h-[55px] flex-row items-center rounded-input border bg-neutral-150 pl-[12px] pr-[12px]"
                    style={{
                      borderColor: errors.email
                        ? colors.brand.primary
                        : colors.neutral[400],
                    }}
                  >
                    <MaterialIcons
                      accessibilityElementsHidden
                      color={colors.neutral[550]}
                      importantForAccessibility="no-hide-descendants"
                      name="email"
                      size={19}
                    />
                    <TextInput
                      accessibilityHint={errors.email?.message}
                      accessibilityLabel="Email address"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      className="ml-[9px] h-full flex-1 p-0 font-montserrat-medium text-authField text-neutral-550"
                      editable={!isSubmitting}
                      keyboardType="email-address"
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        if (submissionStatus !== "idle") {
                          setSubmissionStatus("idle");
                        }

                        onChange(text);
                      }}
                      onSubmitEditing={handlePrimaryAction}
                      placeholder="Enter your email address"
                      placeholderTextColor={colors.neutral[550]}
                      returnKeyType="send"
                      textContentType="emailAddress"
                      value={value}
                    />
                  </View>
                )}
              />

              {errors.email ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="absolute left-0 top-[58px] font-montserrat-regular text-[11px] leading-[14px] text-brand-primary"
                >
                  {errors.email.message}
                </Text>
              ) : null}
            </View>

            <Text className="mt-[27px] w-[280px] font-montserrat-regular text-authField text-neutral-550">
              <Text className="text-brand-primary">*</Text> We will send you a
              message to set or reset your new password
            </Text>

            <Pressable
              accessibilityHint={
                submissionStatus === "success"
                  ? "Returns to the Sign In screen"
                  : "Validates your email address"
              }
              accessibilityLabel={isSubmitting ? "Submitting" : buttonLabel}
              accessibilityRole="button"
              accessibilityState={{
                busy: isSubmitting,
                disabled: isSubmitting,
              }}
              className="mt-[42px] h-[55px] flex-row items-center justify-center gap-[8px] rounded-xs bg-brand-primary active:opacity-80 disabled:opacity-70"
              disabled={isSubmitting}
              onPress={handlePrimaryAction}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator
                    accessibilityElementsHidden
                    color={colors.neutral[0]}
                    importantForAccessibility="no-hide-descendants"
                    size="small"
                  />
                  <Text className="font-montserrat-semibold text-authButton text-neutral-0">
                    Submitting...
                  </Text>
                </>
              ) : (
                <Text className="font-montserrat-semibold text-authButton text-neutral-0">
                  {buttonLabel}
                </Text>
              )}
            </Pressable>

            {submissionStatus === "success" ? (
              <Text
                accessibilityLiveRegion="polite"
                className="mt-[12px] font-montserrat-medium text-authField text-feedback-success"
              >
                Request validated. No email was sent in this frontend-only
                version.
              </Text>
            ) : null}

            {submissionStatus === "error" ? (
              <Text
                accessibilityLiveRegion="assertive"
                className="mt-[12px] font-montserrat-medium text-authField text-brand-primary"
              >
                We could not prepare the reset request. Please try again.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
