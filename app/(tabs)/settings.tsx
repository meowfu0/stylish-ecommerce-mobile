import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants/design-tokens";
import { MOCK_PROFILE } from "@/constants/profile-data";
import {
  getResponsiveContentWidth,
  isDesktopWeb,
} from "@/constants/responsive";
import {
  signOutAllSessions,
  signOutCurrentSession,
} from "@/services/auth/auth-session";
import { useAuthSessionStore } from "@/stores/auth-session-store";

const MAX_CONTENT_WIDTH = 343;

type SettingsIconName = ComponentProps<typeof MaterialIcons>["name"];

type SettingsRowProps = {
  accessibilityHint: string;
  detail?: string;
  icon: SettingsIconName;
  label: string;
  onPress: () => void;
  showDivider?: boolean;
  trailing?: ReactNode;
};

function SettingsRow({
  accessibilityHint,
  detail,
  icon,
  label,
  onPress,
  showDivider = true,
  trailing,
}: SettingsRowProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      accessibilityRole="button"
      className="min-h-[62px] flex-row items-center px-md active:bg-neutral-50"
      onPress={onPress}
    >
      <View className="h-[36px] w-[36px] items-center justify-center rounded-pill bg-brand-socialSurface">
        <MaterialIcons color={colors.brand.primary} name={icon} size={21} />
      </View>

      <View
        className={`ml-sm flex-1 flex-row items-center py-md ${
          showDivider ? "border-b border-neutral-200" : ""
        }`}
      >
        <View className="flex-1">
          <Text className="font-montserrat-medium text-sm text-neutral-900">
            {label}
          </Text>
          {detail ? (
            <Text
              className="mt-[2px] font-montserrat-regular text-xs text-neutral-500"
              numberOfLines={1}
            >
              {detail}
            </Text>
          ) : null}
        </View>

        {trailing ?? (
          <MaterialIcons
            color={colors.neutral[400]}
            name="chevron-right"
            size={24}
          />
        )}
      </View>
    </Pressable>
  );
}

type PreferenceSwitchProps = {
  icon: SettingsIconName;
  label: string;
  onValueChange: (value: boolean) => void;
  showDivider?: boolean;
  value: boolean;
};

function PreferenceSwitch({
  icon,
  label,
  onValueChange,
  showDivider = true,
  value,
}: PreferenceSwitchProps) {
  return (
    <View className="min-h-[62px] flex-row items-center px-md">
      <View className="h-[36px] w-[36px] items-center justify-center rounded-pill bg-brand-socialSurface">
        <MaterialIcons color={colors.brand.primary} name={icon} size={21} />
      </View>

      <View
        className={`ml-sm flex-1 flex-row items-center py-sm ${
          showDivider ? "border-b border-neutral-200" : ""
        }`}
      >
        <Text className="flex-1 font-montserrat-medium text-sm text-neutral-900">
          {label}
        </Text>
        <Switch
          accessibilityLabel={label}
          accessibilityRole="switch"
          accessibilityState={{ checked: value }}
          ios_backgroundColor={colors.neutral[300]}
          onValueChange={onValueChange}
          thumbColor={colors.neutral[0]}
          trackColor={{
            false: colors.neutral[300],
            true: colors.brand.primary,
          }}
          value={value}
        />
      </View>
    </View>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text className="mb-xs mt-lg font-montserrat-semibold text-sm text-neutral-900">
      {children}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const entranceProgress = useSharedValue(reduceMotion ? 1 : 0);
  const [orderUpdatesEnabled, setOrderUpdatesEnabled] = useState(true);
  const [offersEnabled, setOffersEnabled] = useState(false);
  const [signOutMode, setSignOutMode] = useState<"all" | "current" | null>(
    null,
  );
  const authUser = useAuthSessionStore((state) => state.user);
  const desktopWeb = isDesktopWeb(width);
  const contentWidth = getResponsiveContentWidth({
    desktopMax: 960,
    mobileMax: MAX_CONTENT_WIDTH,
    width,
  });

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
    transform: [
      {
        translateY: interpolate(entranceProgress.value, [0, 1], [10, 0]),
      },
    ],
  }));

  useEffect(() => {
    entranceProgress.value = reduceMotion
      ? 1
      : withTiming(1, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        });
  }, [entranceProgress, reduceMotion]);

  const showInformation = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  const profileName =
    authUser?.profile?.displayName ?? MOCK_PROFILE.accountHolderName;
  const profileEmail = authUser?.email ?? MOCK_PROFILE.email;

  const completeSignOut = async (allSessions: boolean) => {
    if (signOutMode) {
      return;
    }

    setSignOutMode(allSessions ? "all" : "current");
    try {
      if (allSessions) {
        await signOutAllSessions();
      } else {
        await signOutCurrentSession();
      }
    } finally {
      router.replace("/sign-in");
    }
  };

  const confirmSignOut = (allSessions = false) => {
    const continueToSignIn = () => void completeSignOut(allSessions);

    if (Platform.OS === "web") {
      continueToSignIn();
      return;
    }

    Alert.alert(
      "Sign out?",
      allSessions
        ? "This signs you out from every active Velori session."
        : "This signs you out from this device.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: continueToSignIn,
          style: "destructive",
          text: "Sign out",
        },
      ],
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-50"
      edges={desktopWeb ? [] : ["top"]}
    >
      <StatusBar style="dark" />

      <Animated.View
        className="flex-1"
        style={[{ minHeight: 0, minWidth: 0 }, entranceStyle]}
      >
        <ScrollView
          accessibilityLabel="Settings"
          className="flex-1"
          contentContainerStyle={{
            alignItems: "center",
            paddingBottom: desktopWeb ? spacing.xxl : spacing.xl,
          }}
          contentInsetAdjustmentBehavior="never"
          decelerationRate="normal"
          directionalLockEnabled
          overScrollMode="never"
          showsVerticalScrollIndicator={desktopWeb}
        >
          <View style={{ width: contentWidth }}>
            <View className={desktopWeb ? "pb-lg pt-xl" : "pb-md pt-lg"}>
              <Text
                accessibilityRole="header"
                className={`font-montserrat-semibold text-neutral-1000 ${
                  desktopWeb ? "text-[32px] leading-[40px]" : "text-xl"
                }`}
              >
                Settings
              </Text>
              <Text className="mt-xxs font-montserrat-regular text-xs text-neutral-500">
                Manage your account and shopping preferences.
              </Text>
            </View>

            <Pressable
              accessibilityHint="Opens your profile and account details"
              accessibilityLabel={`Profile for ${profileName}`}
              accessibilityRole="button"
              className="flex-row items-center rounded-lg border border-neutral-200 bg-neutral-0 p-md shadow-sm active:opacity-70"
              onPress={() => router.push("/profile")}
            >
              <Image
                accessibilityLabel="Profile photo"
                contentFit="cover"
                source={require("@/assets/images/profile/profile-avatar.jpg")}
                style={{
                  borderRadius: 28,
                  height: 56,
                  width: 56,
                }}
              />
              <View className="ml-sm flex-1">
                <Text
                  className="font-montserrat-semibold text-md text-neutral-900"
                  numberOfLines={1}
                >
                  {profileName}
                </Text>
                <Text
                  className="mt-[2px] font-montserrat-regular text-xs text-neutral-500"
                  numberOfLines={1}
                >
                  {profileEmail}
                </Text>
                <Text className="mt-xxs font-montserrat-medium text-xs text-brand-primary">
                  View profile
                </Text>
              </View>
              <MaterialIcons
                color={colors.neutral[400]}
                name="chevron-right"
                size={24}
              />
            </Pressable>

            <SectionTitle>Account</SectionTitle>
            <View className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm">
              <SettingsRow
                accessibilityHint="Opens profile and account details"
                detail="Personal, address, and account information"
                icon="person-outline"
                label="Profile & account details"
                onPress={() => router.push("/profile")}
                showDivider={false}
              />
            </View>

            <SectionTitle>Preferences</SectionTitle>
            <View className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm">
              <PreferenceSwitch
                icon="notifications-none"
                label="Order notifications"
                onValueChange={setOrderUpdatesEnabled}
                value={orderUpdatesEnabled}
              />
              <PreferenceSwitch
                icon="local-offer"
                label="Offers and promotions"
                onValueChange={setOffersEnabled}
                value={offersEnabled}
              />
              <SettingsRow
                accessibilityHint="Shows the selected shopping currency"
                detail="Philippine Peso (₱)"
                icon="payments"
                label="Currency"
                onPress={() =>
                  showInformation(
                    "Currency",
                    "Prices are displayed in Philippine pesos (₱).",
                  )
                }
              />
              <SettingsRow
                accessibilityHint="Shows the selected app language"
                detail="English"
                icon="language"
                label="Language"
                onPress={() =>
                  showInformation(
                    "Language",
                    "English is currently selected for this frontend demo.",
                  )
                }
                showDivider={false}
              />
            </View>

            <SectionTitle>Support & information</SectionTitle>
            <View className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm">
              <SettingsRow
                accessibilityHint="Shows help and support information"
                icon="help-outline"
                label="Help & support"
                onPress={() =>
                  showInformation(
                    "Help & support",
                    "Customer support will be connected when backend services are available.",
                  )
                }
              />
              <SettingsRow
                accessibilityHint="Shows privacy and security information"
                icon="privacy-tip"
                label="Privacy & security"
                onPress={() =>
                  showInformation(
                    "Privacy & security",
                    "This demo keeps settings on the device and does not submit personal or payment data.",
                  )
                }
              />
              <SettingsRow
                accessibilityHint="Shows the current app version"
                detail="Version 1.0.0"
                icon="info-outline"
                label="About Velori"
                onPress={() =>
                  showInformation(
                    "About Velori",
                    "Velori is a responsive Expo e-commerce frontend demo.",
                  )
                }
                showDivider={false}
              />
            </View>

            <Pressable
              accessibilityHint="Returns to the Sign In screen"
              accessibilityLabel="Sign out"
              accessibilityRole="button"
              className="mt-lg min-h-[50px] flex-row items-center justify-center rounded-md border border-brand-primary bg-neutral-0 px-md active:opacity-60"
              disabled={signOutMode !== null}
              onPress={() => confirmSignOut(false)}
            >
              {signOutMode === "current" ? (
                <ActivityIndicator color={colors.brand.primary} size="small" />
              ) : (
                <MaterialIcons
                  color={colors.brand.primary}
                  name="logout"
                  size={20}
                />
              )}
              <Text className="ml-xs font-montserrat-semibold text-sm text-brand-primary">
                {signOutMode === "current" ? "Signing out…" : "Sign out"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityHint="Signs this account out from every active device"
              accessibilityLabel="Sign out all devices"
              accessibilityRole="button"
              className="mt-sm min-h-[46px] items-center justify-center rounded-md px-md active:opacity-60"
              disabled={signOutMode !== null}
              onPress={() => confirmSignOut(true)}
            >
              <Text className="font-montserrat-medium text-xs text-neutral-600">
                {signOutMode === "all"
                  ? "Signing out all devices…"
                  : "Sign out all devices"}
              </Text>
            </Pressable>

            <Text className="mb-sm mt-md text-center font-montserrat-regular text-micro text-neutral-400">
              Your authentication session is protected by secure token storage.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}
