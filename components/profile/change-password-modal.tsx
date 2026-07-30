import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { z } from "zod";

import { ProfileFormField } from "@/components/profile/profile-form-field";
import { colors } from "@/constants/design-tokens";
import { isDesktopWeb } from "@/constants/responsive";

const changePasswordSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirm the new password"),
    newPassword: z
      .string()
      .min(1, "Enter a new password")
      .min(8, "Use at least 8 characters"),
  })
  .refine(
    ({ confirmPassword, newPassword }) => confirmPassword === newPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    },
  );

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

type ChangePasswordModalProps = {
  onClose: () => void;
  onPasswordChange: (password: string) => void;
  visible: boolean;
};

function waitForLocalUpdate() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 400);
  });
}

export function ChangePasswordModal({
  onClose,
  onPasswordChange,
  visible,
}: ChangePasswordModalProps) {
  const { width } = useWindowDimensions();
  const desktopWeb = isDesktopWeb(width);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordValues>({
    defaultValues: {
      confirmPassword: "",
      newPassword: "",
    },
    mode: "onTouched",
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [reset, visible]);

  const closeModal = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const submitPassword = async (values: ChangePasswordValues) => {
    await waitForLocalUpdate();
    onPasswordChange(values.newPassword);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={closeModal}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding" })}
        className={`flex-1 ${
          desktopWeb ? "items-center justify-center px-lg" : "justify-end"
        }`}
      >
        <Pressable
          accessibilityLabel="Close change password dialog"
          accessibilityRole="button"
          className="absolute inset-0 bg-neutral-1000/40"
          disabled={isSubmitting}
          onPress={closeModal}
        />

        <View
          accessibilityLabel="Change password"
          accessibilityRole="summary"
          className={`bg-neutral-0 px-lg pb-xl pt-lg ${
            desktopWeb ? "rounded-lg shadow-lg" : "rounded-t-lg"
          }`}
          style={{ width: desktopWeb ? 520 : width }}
        >
          <Text
            accessibilityRole="header"
            className="font-montserrat-semibold text-lg text-neutral-1000"
          >
            Change Password
          </Text>
          <Text className="mt-[6px] font-montserrat-regular text-xs text-neutral-600">
            This updates the temporary form only. Nothing is stored.
          </Text>

          <View className="mt-lg">
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onBlur, onChange, value } }) => (
                <ProfileFormField
                  accessibilityLabel="New password"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!isSubmitting}
                  error={errors.newPassword?.message}
                  label="New Password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Enter a new password"
                  returnKeyType="next"
                  secureTextEntry
                  textContentType="newPassword"
                  value={value}
                />
              )}
            />
          </View>

          <View className="mt-md">
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onBlur, onChange, value } }) => (
                <ProfileFormField
                  accessibilityLabel="Confirm new password"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!isSubmitting}
                  error={errors.confirmPassword?.message}
                  label="Confirm New Password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  onSubmitEditing={() => void handleSubmit(submitPassword)()}
                  placeholder="Re-enter the new password"
                  returnKeyType="done"
                  secureTextEntry
                  textContentType="newPassword"
                  value={value}
                />
              )}
            />
          </View>

          <View className="mt-lg flex-row gap-[12px]">
            <Pressable
              accessibilityLabel="Cancel password change"
              accessibilityRole="button"
              className="h-[48px] flex-1 items-center justify-center rounded-sm border border-neutral-300 active:opacity-70"
              disabled={isSubmitting}
              onPress={closeModal}
            >
              <Text className="font-montserrat-semibold text-sm text-neutral-1000">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={
                isSubmitting ? "Updating password" : "Update password"
              }
              accessibilityRole="button"
              accessibilityState={{
                busy: isSubmitting,
                disabled: isSubmitting,
              }}
              className="h-[48px] flex-1 flex-row items-center justify-center rounded-sm bg-brand-primary active:opacity-80 disabled:opacity-70"
              disabled={isSubmitting}
              onPress={() => void handleSubmit(submitPassword)()}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.neutral[0]} size="small" />
              ) : (
                <Text className="font-montserrat-semibold text-sm text-neutral-0">
                  Update
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
