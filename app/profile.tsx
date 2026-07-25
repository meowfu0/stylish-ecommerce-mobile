import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { z } from "zod";

import { ChangePasswordModal } from "@/components/profile/change-password-modal";
import { ProfileDropdownField } from "@/components/profile/profile-dropdown-field";
import { ProfileFormField } from "@/components/profile/profile-form-field";
import { colors, spacing } from "@/constants/design-tokens";
import {
  MOCK_PROFILE,
  MOCK_STATE_OPTIONS,
  type ProfileFormValues,
} from "@/constants/profile-data";

const FIGMA_CONTENT_WIDTH = 327;

const profileSchema = z.object({
  accountHolderName: z
    .string()
    .trim()
    .min(2, "Enter the mock account holder name"),
  address: z.string().trim().min(5, "Enter an address"),
  bankAccountNumber: z
    .string()
    .trim()
    .regex(/^\d{8,18}$/, "Use 8 to 18 digits"),
  city: z.string().trim().min(2, "Enter a city"),
  country: z.string().trim().min(2, "Enter a country"),
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address")
    .email("Enter a valid email address"),
  ifscCode: z
    .string()
    .trim()
    .min(6, "Use at least 6 characters")
    .max(14, "Use no more than 14 characters")
    .regex(/^[A-Z0-9]+$/, "Use uppercase letters and numbers only"),
  password: z.string().min(8, "Use at least 8 characters"),
  pincode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9 -]{3,10}$/, "Enter a valid postal code"),
  state: z.string().trim().min(2, "Choose a state or region"),
});

type SubmissionStatus = "idle" | "success" | "error";
type PhotoStatus = "idle" | "success" | "error";

function waitForFrontendSave() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 650);
  });
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const entranceProgress = useSharedValue(reduceMotion ? 1 : 0);
  const [profileImageUri, setProfileImageUri] = useState<string>();
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>("idle");
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatus>("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [statePickerVisible, setStatePickerVisible] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<ProfileFormValues>({
    defaultValues: MOCK_PROFILE,
    mode: "onTouched",
    resolver: zodResolver(profileSchema),
  });
  const contentWidth = Math.min(
    FIGMA_CONTENT_WIDTH,
    Math.max(0, width - spacing.xl * 1.5),
  );
  const horizontalInset = Math.max(spacing.lg, (width - contentWidth) / 2);

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

  const returnToPreviousScreen = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)/home");
  };

  const resetStatusAndChange =
    (onChange: (value: string) => void) => (value: string) => {
      setSubmissionStatus("idle");
      setSubmissionMessage("");
      onChange(value);
    };

  const pickProfileImage = async () => {
    setPhotoStatus("idle");

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImageUri(result.assets[0].uri);
        setPhotoStatus("success");
      }
    } catch {
      setPhotoStatus("error");
    }
  };

  const saveProfile = async (_values: ProfileFormValues) => {
    setSubmissionStatus("idle");

    try {
      await waitForFrontendSave();
      setSubmissionMessage(
        "Profile validated locally. Nothing was uploaded or stored.",
      );
      setSubmissionStatus("success");
    } catch {
      setSubmissionMessage(
        "The profile update could not be prepared. Please try again.",
      );
      setSubmissionStatus("error");
    }
  };

  const showValidationError = () => {
    setSubmissionMessage(
      "Please correct the highlighted fields and try again.",
    );
    setSubmissionStatus("error");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ android: "height", ios: "padding" })}
      className="flex-1 bg-neutral-0"
    >
      <StatusBar style="dark" />

      <SafeAreaView className="flex-1 bg-neutral-0" edges={["top", "bottom"]}>
        <Animated.View style={[{ flex: 1 }, entranceStyle]}>
          <View className="h-[56px] items-center justify-center">
            <Pressable
              accessibilityHint="Returns to the previous screen"
              accessibilityLabel="Go back"
              accessibilityRole="button"
              className="absolute h-[44px] w-[44px] items-start justify-center active:opacity-60"
              hitSlop={4}
              onPress={returnToPreviousScreen}
              style={{ left: horizontalInset }}
            >
              <Image
                accessible={false}
                contentFit="contain"
                source={require("@/assets/icons/profile/back.png")}
                style={{ height: 21, width: 11 }}
              />
            </Pressable>
            <Text
              accessibilityRole="header"
              className="font-montserrat-semibold text-action text-neutral-1000"
            >
              Profile
            </Text>
          </View>

          <ScrollView
            accessibilityLabel="Profile and account details"
            automaticallyAdjustKeyboardInsets
            className="flex-1"
            contentContainerStyle={{
              alignItems: "center",
              paddingBottom: Math.max(insets.bottom, spacing.xl),
            }}
            contentInsetAdjustmentBehavior="never"
            decelerationRate="normal"
            directionalLockEnabled
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            overScrollMode="never"
            scrollsToTop
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              accessibilityHint="Opens the image library to choose a temporary profile picture"
              accessibilityLabel="Edit profile picture"
              accessibilityRole="button"
              className="mt-[19px] h-[104px] w-[104px] active:opacity-80"
              onPress={() => void pickProfileImage()}
            >
              <Image
                accessibilityLabel="Profile picture"
                accessibilityRole="image"
                contentFit="cover"
                source={
                  profileImageUri
                    ? { uri: profileImageUri }
                    : require("@/assets/images/profile/profile-avatar.jpg")
                }
                style={{ borderRadius: 48, height: 96, width: 96 }}
                transition={120}
              />
              <Image
                accessible={false}
                contentFit="contain"
                source={require("@/assets/icons/profile/edit-profile.png")}
                style={{
                  bottom: 0,
                  height: 32,
                  position: "absolute",
                  right: 0,
                  width: 32,
                }}
              />
            </Pressable>

            {photoStatus === "success" ? (
              <Text
                accessibilityLiveRegion="polite"
                className="mt-[6px] font-montserrat-medium text-[11px] leading-[14px] text-feedback-success"
              >
                Photo selected for this session.
              </Text>
            ) : null}
            {photoStatus === "error" ? (
              <Text
                accessibilityLiveRegion="assertive"
                className="mt-[6px] font-montserrat-medium text-[11px] leading-[14px] text-brand-primary"
              >
                The image picker could not be opened.
              </Text>
            ) : null}

            <View className="mt-lg" style={{ width: contentWidth }}>
              <Text
                accessibilityRole="header"
                className="font-montserrat-semibold text-md text-neutral-1000"
              >
                Personal Details
              </Text>

              <View className="mt-[20px]">
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <ProfileFormField
                      accessibilityLabel="Email address"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      editable={!isSubmitting}
                      error={errors.email?.message}
                      keyboardType="email-address"
                      label="Email Address"
                      onBlur={onBlur}
                      onChangeText={resetStatusAndChange(onChange)}
                      placeholder="Enter your email address"
                      returnKeyType="next"
                      textContentType="emailAddress"
                      value={value}
                    />
                  )}
                />
              </View>

              <View className="mt-[22px]">
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { value } }) => (
                    <ProfileFormField
                      accessibilityHint="Password is masked. Use Change Password to update it."
                      accessibilityLabel="Masked password"
                      autoComplete="off"
                      editable={false}
                      error={errors.password?.message}
                      label="Password"
                      secureTextEntry
                      textContentType="password"
                      value={value}
                    />
                  )}
                />
              </View>

              <Pressable
                accessibilityHint="Opens the temporary change password form"
                accessibilityLabel="Change password"
                accessibilityRole="button"
                className="mt-[10px] self-end py-[4px] active:opacity-60"
                disabled={isSubmitting}
                onPress={() => setPasswordModalVisible(true)}
              >
                <Text className="font-montserrat-medium text-xs text-brand-primary underline">
                  Change Password
                </Text>
              </Pressable>

              <View className="mt-[32px] h-px bg-neutral-200" />

              <Text
                accessibilityRole="header"
                className="mt-lg font-montserrat-semibold text-md text-neutral-1000"
              >
                Business Address Details
              </Text>

              <View className="mt-[20px]">
                <Controller
                  control={control}
                  name="pincode"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <ProfileFormField
                      accessibilityLabel="Pincode"
                      autoComplete="postal-code"
                      editable={!isSubmitting}
                      error={errors.pincode?.message}
                      label="Pincode"
                      onBlur={onBlur}
                      onChangeText={resetStatusAndChange(onChange)}
                      placeholder="Enter your postal code"
                      returnKeyType="next"
                      textContentType="postalCode"
                      value={value}
                    />
                  )}
                />
              </View>

              <View className="mt-[22px]">
                <Controller
                  control={control}
                  name="address"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <ProfileFormField
                      accessibilityLabel="Address"
                      autoComplete="street-address"
                      editable={!isSubmitting}
                      error={errors.address?.message}
                      label="Address"
                      onBlur={onBlur}
                      onChangeText={resetStatusAndChange(onChange)}
                      placeholder="Enter your address"
                      returnKeyType="next"
                      textContentType="streetAddressLine1"
                      value={value}
                    />
                  )}
                />
              </View>

              <View className="mt-[22px]">
                <Controller
                  control={control}
                  name="city"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <ProfileFormField
                      accessibilityLabel="City"
                      autoComplete="address-line2"
                      editable={!isSubmitting}
                      error={errors.city?.message}
                      label="City"
                      onBlur={onBlur}
                      onChangeText={resetStatusAndChange(onChange)}
                      placeholder="Enter your city"
                      returnKeyType="next"
                      textContentType="addressCity"
                      value={value}
                    />
                  )}
                />
              </View>

              <View className="mt-[22px]">
                <Controller
                  control={control}
                  name="state"
                  render={({ field: { value } }) => (
                    <ProfileDropdownField
                      disabled={isSubmitting}
                      error={errors.state?.message}
                      expanded={statePickerVisible}
                      label="State"
                      onPress={() => setStatePickerVisible(true)}
                      value={value}
                    />
                  )}
                />
              </View>

              <View className="mt-[22px]">
                <Controller
                  control={control}
                  name="country"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <ProfileFormField
                      accessibilityLabel="Country"
                      autoComplete="country"
                      editable={!isSubmitting}
                      error={errors.country?.message}
                      label="Country"
                      onBlur={onBlur}
                      onChangeText={resetStatusAndChange(onChange)}
                      placeholder="Enter your country"
                      returnKeyType="next"
                      textContentType="countryName"
                      value={value}
                    />
                  )}
                />
              </View>

              <View className="mt-[32px] h-px bg-neutral-200" />

              <Text
                accessibilityRole="header"
                className="mt-lg font-montserrat-semibold text-md text-neutral-1000"
              >
                Bank Account Details
              </Text>

              <View className="mt-[20px]">
                <Controller
                  control={control}
                  name="bankAccountNumber"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <ProfileFormField
                      accessibilityHint="Temporary mock bank account number. The value is masked."
                      accessibilityLabel="Masked bank account number"
                      autoComplete="off"
                      editable={!isSubmitting}
                      error={errors.bankAccountNumber?.message}
                      keyboardType="number-pad"
                      label="Bank Account Number"
                      onBlur={onBlur}
                      onChangeText={resetStatusAndChange(onChange)}
                      placeholder="Enter a mock account number"
                      returnKeyType="next"
                      secureTextEntry
                      value={value}
                    />
                  )}
                />
              </View>

              <View className="mt-[22px]">
                <Controller
                  control={control}
                  name="accountHolderName"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <ProfileFormField
                      accessibilityLabel="Account holder name"
                      autoCapitalize="words"
                      autoComplete="name"
                      editable={!isSubmitting}
                      error={errors.accountHolderName?.message}
                      label="Account Holder’s Name"
                      onBlur={onBlur}
                      onChangeText={resetStatusAndChange(onChange)}
                      placeholder="Enter a mock account holder name"
                      returnKeyType="next"
                      textContentType="name"
                      value={value}
                    />
                  )}
                />
              </View>

              <View className="mt-[22px]">
                <Controller
                  control={control}
                  name="ifscCode"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <ProfileFormField
                      accessibilityHint="Temporary mock bank code. The value is masked."
                      accessibilityLabel="Masked bank code"
                      autoCapitalize="characters"
                      autoComplete="off"
                      autoCorrect={false}
                      editable={!isSubmitting}
                      error={errors.ifscCode?.message}
                      label="IFSC Code"
                      onBlur={onBlur}
                      onChangeText={(text) =>
                        resetStatusAndChange(onChange)(text.toUpperCase())
                      }
                      onSubmitEditing={() =>
                        void handleSubmit(saveProfile, showValidationError)()
                      }
                      placeholder="Enter a mock bank code"
                      returnKeyType="done"
                      secureTextEntry
                      value={value}
                    />
                  )}
                />
              </View>

              <Pressable
                accessibilityHint="Validates the form locally without storing or uploading it"
                accessibilityLabel={isSubmitting ? "Saving profile" : "Save profile"}
                accessibilityRole="button"
                accessibilityState={{
                  busy: isSubmitting,
                  disabled: isSubmitting,
                }}
                className="mt-[32px] h-[52px] flex-row items-center justify-center rounded-sm bg-brand-primary active:opacity-80 disabled:opacity-70"
                disabled={isSubmitting}
                onPress={() =>
                  void handleSubmit(saveProfile, showValidationError)()
                }
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator color={colors.neutral[0]} size="small" />
                    <Text className="ml-[8px] font-montserrat-semibold text-sm text-neutral-0">
                      Saving...
                    </Text>
                  </>
                ) : (
                  <Text className="font-montserrat-semibold text-sm text-neutral-0">
                    Save
                  </Text>
                )}
              </Pressable>

              {submissionStatus === "success" ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="mt-[10px] text-center font-montserrat-medium text-xs text-feedback-success"
                >
                  {submissionMessage}
                </Text>
              ) : null}
              {submissionStatus === "error" ? (
                <Text
                  accessibilityLiveRegion="assertive"
                  className="mt-[10px] text-center font-montserrat-medium text-xs text-brand-primary"
                >
                  {submissionMessage}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>

      <ChangePasswordModal
        onClose={() => setPasswordModalVisible(false)}
        onPasswordChange={(password) => {
          setValue("password", password, {
            shouldDirty: true,
            shouldValidate: true,
          });
          setSubmissionMessage(
            "Password updated in this temporary form. Nothing was stored.",
          );
          setSubmissionStatus("success");
        }}
        visible={passwordModalVisible}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setStatePickerVisible(false)}
        statusBarTranslucent
        transparent
        visible={statePickerVisible}
      >
        <View className="flex-1 items-center justify-center bg-neutral-1000/40 px-lg">
          <Pressable
            accessibilityLabel="Close state picker"
            accessibilityRole="button"
            className="absolute inset-0"
            onPress={() => setStatePickerVisible(false)}
          />
          <View
            accessibilityLabel="Select a state or region"
            className="w-full max-w-[327px] rounded-md bg-neutral-0 p-md"
          >
            <Text
              accessibilityRole="header"
              className="font-montserrat-semibold text-md text-neutral-1000"
            >
              Select State
            </Text>
            {MOCK_STATE_OPTIONS.map((option) => (
              <Pressable
                accessibilityLabel={option}
                accessibilityRole="button"
                className="mt-[8px] h-[48px] justify-center rounded-sm border border-neutral-200 px-md active:bg-neutral-100"
                key={option}
                onPress={() => {
                  setValue("state", option, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setSubmissionStatus("idle");
                  setSubmissionMessage("");
                  setStatePickerVisible(false);
                }}
              >
                <Text className="font-montserrat-medium text-sm text-neutral-1000">
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
