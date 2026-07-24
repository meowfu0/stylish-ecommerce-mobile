import { zodResolver } from "@hookform/resolvers/zod";
import { Image, type ImageSource } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
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

const FIGMA_FRAME = {
  width: 375,
  titleTop: 63,
  contentWidth: 317,
} as const;

const signUpSchema = z
  .object({
    identifier: z.string().trim().min(1, "Enter your username or email"),
    password: z
      .string()
      .min(1, "Enter your password")
      .min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine(({ confirmPassword, password }) => confirmPassword === password, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;

const SOCIAL_OPTIONS: {
  accessibilityLabel: string;
  iconSize: number;
  source: ImageSource;
}[] = [
  {
    accessibilityLabel: "Continue with Google",
    iconSize: 24,
    source: require("@/assets/icons/social-google.svg"),
  },
  {
    accessibilityLabel: "Continue with Apple",
    iconSize: 25,
    source: require("@/assets/icons/social-apple.svg"),
  },
  {
    accessibilityLabel: "Continue with Facebook",
    iconSize: 26,
    source: require("@/assets/icons/social-facebook.svg"),
  },
];

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const { width } = useWindowDimensions();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    defaultValues: {
      confirmPassword: "",
      identifier: "",
      password: "",
    },
    mode: "onTouched",
    resolver: zodResolver(signUpSchema),
  });

  const widthScale = Math.min(1, width / FIGMA_FRAME.width);
  const contentWidth = FIGMA_FRAME.contentWidth * widthScale;
  const contentLeft = (width - contentWidth) / 2;
  const contentTop = Math.max(0, FIGMA_FRAME.titleTop - insets.top);

  const submitValidatedForm = (_values: SignUpFormValues) => {
    // Backend account creation will be connected in a later implementation.
  };

  const submitForm = () => {
    void handleSubmit(submitValidatedForm)();
  };

  const returnToSignIn = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/sign-in");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ android: "height", ios: "padding" })}
      className="flex-1 bg-neutral-0"
    >
      <StatusBar style="dark" />

      <SafeAreaView className="flex-1 bg-neutral-0">
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
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginLeft: contentLeft, width: contentWidth }}>
            <Text
              accessibilityRole="header"
              className="font-montserrat-bold text-authTitle text-neutral-1000"
            >
              {"Create an\naccount"}
            </Text>

            <View className="mt-[33px]">
              <Controller
                control={control}
                name="identifier"
                render={({ field: { onBlur, onChange, value } }) => (
                  <View
                    className="h-[55px] flex-row items-center gap-[4px] rounded-input border bg-neutral-150 pl-[11px] pr-[10px]"
                    style={{
                      borderColor: errors.identifier
                        ? colors.brand.primary
                        : colors.neutral[400],
                    }}
                  >
                    <Image
                      accessible={false}
                      contentFit="contain"
                      source={require("@/assets/icons/sign-in-user.svg")}
                      style={{ height: 24, width: 24 }}
                    />
                    <TextInput
                      accessibilityHint={errors.identifier?.message}
                      accessibilityLabel="Username or Email"
                      autoCapitalize="none"
                      autoComplete="username"
                      autoCorrect={false}
                      className="h-full flex-1 p-0 font-montserrat-medium text-authField text-neutral-550"
                      keyboardType="email-address"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                      placeholder="Username or Email"
                      placeholderTextColor={colors.neutral[550]}
                      returnKeyType="next"
                      textContentType="username"
                      value={value}
                    />
                  </View>
                )}
              />

              {errors.identifier ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="absolute left-0 top-[58px] font-montserrat-regular text-[11px] leading-[14px] text-brand-primary"
                >
                  {errors.identifier.message}
                </Text>
              ) : null}
            </View>

            <View className="mt-[31px]">
              <Controller
                control={control}
                name="password"
                render={({ field: { onBlur, onChange, value } }) => (
                  <View
                    className="h-[55px] flex-row items-center rounded-input border bg-neutral-150 pl-[14px] pr-[16px]"
                    style={{
                      borderColor: errors.password
                        ? colors.brand.primary
                        : colors.neutral[400],
                    }}
                  >
                    <Image
                      accessible={false}
                      contentFit="contain"
                      source={require("@/assets/icons/sign-in-lock.svg")}
                      style={{ height: 20, width: 16 }}
                    />
                    <TextInput
                      ref={passwordInputRef}
                      accessibilityHint={errors.password?.message}
                      accessibilityLabel="Password"
                      autoCapitalize="none"
                      autoComplete="new-password"
                      className="ml-[11px] h-full flex-1 p-0 font-montserrat-medium text-authField text-neutral-550"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      onSubmitEditing={() =>
                        confirmPasswordInputRef.current?.focus()
                      }
                      placeholder="Password"
                      placeholderTextColor={colors.neutral[550]}
                      returnKeyType="next"
                      secureTextEntry={!isPasswordVisible}
                      textContentType="newPassword"
                      value={value}
                    />
                    <Pressable
                      accessibilityLabel={
                        isPasswordVisible ? "Hide password" : "Show password"
                      }
                      accessibilityRole="button"
                      className="h-[44px] w-[44px] items-end justify-center"
                      hitSlop={4}
                      onPress={() =>
                        setIsPasswordVisible((isVisible) => !isVisible)
                      }
                    >
                      <Image
                        accessible={false}
                        contentFit="contain"
                        source={require("@/assets/icons/sign-in-eye.svg")}
                        style={{ height: 20, width: 20 }}
                      />
                    </Pressable>
                  </View>
                )}
              />

              {errors.password ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="absolute left-0 top-[58px] font-montserrat-regular text-[11px] leading-[14px] text-brand-primary"
                >
                  {errors.password.message}
                </Text>
              ) : null}
            </View>

            <View className="mt-[31px]">
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onBlur, onChange, value } }) => (
                  <View
                    className="h-[55px] flex-row items-center rounded-input border bg-neutral-150 pl-[14px] pr-[16px]"
                    style={{
                      borderColor: errors.confirmPassword
                        ? colors.brand.primary
                        : colors.neutral[400],
                    }}
                  >
                    <Image
                      accessible={false}
                      contentFit="contain"
                      source={require("@/assets/icons/sign-in-lock.svg")}
                      style={{ height: 20, width: 16 }}
                    />
                    <TextInput
                      ref={confirmPasswordInputRef}
                      accessibilityHint={errors.confirmPassword?.message}
                      accessibilityLabel="Confirm Password"
                      autoCapitalize="none"
                      autoComplete="new-password"
                      className="ml-[11px] h-full flex-1 p-0 font-montserrat-medium text-authField text-neutral-550"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      onSubmitEditing={submitForm}
                      placeholder="ConfirmPassword"
                      placeholderTextColor={colors.neutral[550]}
                      returnKeyType="done"
                      secureTextEntry={!isConfirmPasswordVisible}
                      textContentType="newPassword"
                      value={value}
                    />
                    <Pressable
                      accessibilityLabel={
                        isConfirmPasswordVisible
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      accessibilityRole="button"
                      className="h-[44px] w-[44px] items-end justify-center"
                      hitSlop={4}
                      onPress={() =>
                        setIsConfirmPasswordVisible((isVisible) => !isVisible)
                      }
                    >
                      <Image
                        accessible={false}
                        contentFit="contain"
                        source={require("@/assets/icons/sign-in-eye.svg")}
                        style={{ height: 20, width: 20 }}
                      />
                    </Pressable>
                  </View>
                )}
              />

              {errors.confirmPassword ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="absolute left-0 top-[58px] font-montserrat-regular text-[11px] leading-[14px] text-brand-primary"
                >
                  {errors.confirmPassword.message}
                </Text>
              ) : null}
            </View>

            <Text className="mt-[19px] w-[258px] font-montserrat-regular text-authField text-neutral-550">
              By clicking the <Text className="text-brand-offer">Register</Text>{" "}
              button, you agree to the public offer
            </Text>

            <Pressable
              accessibilityHint="Validates the account details"
              accessibilityLabel="Create Account"
              accessibilityRole="button"
              className="mt-[38px] h-[55px] items-center justify-center rounded-xs bg-brand-primary active:opacity-80"
              onPress={submitForm}
            >
              <Text className="font-montserrat-semibold text-authButton text-neutral-0">
                Create Account
              </Text>
            </Pressable>

            <View className="items-center">
              <Text className="mt-[40px] font-montserrat-medium text-authField text-neutral-600">
                - OR Continue with -
              </Text>

              <View className="mt-[20px] flex-row gap-[10px]">
                {SOCIAL_OPTIONS.map((option) => (
                  <Pressable
                    key={option.accessibilityLabel}
                    accessibilityHint="Social registration is not available yet"
                    accessibilityLabel={option.accessibilityLabel}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: true }}
                    className="h-[55px] w-[55px] items-center justify-center rounded-pill border border-brand-primary bg-brand-socialSurface"
                    disabled
                  >
                    <Image
                      accessible={false}
                      contentFit="contain"
                      source={option.source}
                      style={{
                        height: option.iconSize,
                        width: option.iconSize,
                      }}
                    />
                  </Pressable>
                ))}
              </View>

              <View className="mt-[29px] flex-row items-center gap-[5px]">
                <Text className="font-poppins-regular text-authBody text-neutral-600">
                  I Already Have an Account
                </Text>
                <Pressable
                  accessibilityHint="Returns to account login"
                  accessibilityLabel="Login"
                  accessibilityRole="link"
                  hitSlop={10}
                  onPress={returnToSignIn}
                >
                  <Text className="font-montserrat-semibold text-authBody text-brand-primary underline">
                    Login
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
