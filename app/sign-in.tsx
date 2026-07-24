import { Image, type ImageSource } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
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

import { colors, spacing } from "@/constants/design-tokens";

const FIGMA_FRAME = {
  width: 375,
  titleTop: 63,
  fieldLeft: 32,
  fieldWidth: 317,
  buttonLeft: 29,
} as const;

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

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const passwordInputRef = useRef<TextInput>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { width } = useWindowDimensions();

  const widthScale = Math.min(1, width / FIGMA_FRAME.width);
  const fieldWidth = FIGMA_FRAME.fieldWidth * widthScale;
  const fieldLeft = FIGMA_FRAME.fieldLeft * widthScale;
  const buttonOffset =
    (FIGMA_FRAME.fieldLeft - FIGMA_FRAME.buttonLeft) * widthScale;
  const contentTop = Math.max(0, FIGMA_FRAME.titleTop - insets.top);

  const openGetStarted = () => {
    router.push("/get-started");
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
          <View style={{ marginLeft: fieldLeft, width: fieldWidth }}>
            <Text
              accessibilityRole="header"
              className="font-montserrat-bold text-authTitle text-neutral-1000"
            >
              {"Welcome\nBack!"}
            </Text>

            <View className="mt-[33px]">
              <View className="h-[55px] flex-row items-center gap-[4px] rounded-input border border-neutral-400 bg-neutral-150 pl-[11px] pr-[10px]">
                <Image
                  accessible={false}
                  contentFit="contain"
                  source={require("@/assets/icons/sign-in-user.svg")}
                  style={{ height: 24, width: 24 }}
                />
                <TextInput
                  accessibilityLabel="Username or Email"
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  className="h-full flex-1 p-0 font-montserrat-medium text-authField text-neutral-550"
                  keyboardType="email-address"
                  onChangeText={setIdentifier}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  placeholder="Username or Email"
                  placeholderTextColor={colors.neutral[550]}
                  returnKeyType="next"
                  textContentType="username"
                  value={identifier}
                />
              </View>
            </View>

            <View className="mt-[31px]">
              <View className="h-[55px] flex-row items-center rounded-input border border-neutral-400 bg-neutral-150 pl-[14px] pr-[15px]">
                <Image
                  accessible={false}
                  contentFit="contain"
                  source={require("@/assets/icons/sign-in-lock.svg")}
                  style={{ height: 20, width: 16 }}
                />
                <TextInput
                  ref={passwordInputRef}
                  accessibilityLabel="Password"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  className="ml-[11px] h-full flex-1 p-0 font-montserrat-medium text-authField text-neutral-550"
                  onChangeText={setPassword}
                  onSubmitEditing={openGetStarted}
                  placeholder="Password"
                  placeholderTextColor={colors.neutral[550]}
                  returnKeyType="done"
                  secureTextEntry={!isPasswordVisible}
                  textContentType="password"
                  value={password}
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
            </View>

            <View className="mt-[9px] h-[15px] items-end">
              <Pressable
                accessibilityHint="Opens password recovery"
                accessibilityLabel="Forgot Password"
                accessibilityRole="link"
                hitSlop={10}
                onPress={() => router.push("/forgot-password")}
              >
                <Text className="font-montserrat-regular text-authField text-brand-primary">
                  Forgot Password?
                </Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityHint="Opens the Get Started screen"
              accessibilityLabel="Login"
              accessibilityRole="button"
              className="mt-[52px] h-[55px] items-center justify-center rounded-xs bg-brand-primary active:opacity-80"
              onPress={openGetStarted}
              style={{ marginLeft: -buttonOffset, width: fieldWidth }}
            >
              <Text className="font-montserrat-semibold text-authButton text-neutral-0">
                Login
              </Text>
            </Pressable>

            <View
              className="items-center"
              style={{ marginLeft: -fieldLeft, width }}
            >
              <Text className="mt-[75px] font-montserrat-medium text-authField text-neutral-600">
                - OR Continue with -
              </Text>

              <View className="mt-[20px] flex-row gap-[10px]">
                {SOCIAL_OPTIONS.map((option) => (
                  <Pressable
                    key={option.accessibilityLabel}
                    accessibilityHint="Social login is not available yet"
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
                <Text className="font-montserrat-regular text-authBody text-neutral-600">
                  Create An Account
                </Text>
                <Pressable
                  accessibilityHint="Opens account registration"
                  accessibilityLabel="Sign Up"
                  accessibilityRole="link"
                  hitSlop={10}
                  onPress={() => router.push("/sign-up")}
                >
                  <Text className="font-montserrat-semibold text-authBody text-brand-primary underline">
                    Sign Up
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
