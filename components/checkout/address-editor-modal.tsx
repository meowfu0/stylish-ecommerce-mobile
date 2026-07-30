import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import type { CheckoutAddress } from "@/constants/checkout-data";
import { colors } from "@/constants/design-tokens";
import { isDesktopWeb } from "@/constants/responsive";

type AddressEditorMode = "add" | "edit";

type AddressEditorModalProps = {
  address: CheckoutAddress | null;
  mode: AddressEditorMode;
  onClose: () => void;
  onSave: (address: CheckoutAddress) => void;
  visible: boolean;
};

type FieldName = "addressLine" | "contact" | "label";

const EMPTY_ADDRESS: CheckoutAddress = {
  addressLine: "",
  contact: "",
  id: "temporary-delivery-address",
  label: "Address",
};

function AddressField({
  accessibilityLabel,
  error,
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  accessibilityLabel: string;
  error?: string;
  keyboardType?: "default" | "phone-pad";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View className="mt-md">
      <Text className="font-montserrat-medium text-xs text-neutral-1000">
        {label}
      </Text>
      <TextInput
        accessibilityHint={error}
        accessibilityLabel={accessibilityLabel}
        className={`mt-[7px] min-h-[48px] rounded-sm border bg-neutral-0 px-[12px] font-montserrat-regular text-xs text-neutral-1000 ${
          multiline ? "py-[12px]" : "py-0"
        }`}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral[475]}
        selectionColor={colors.brand.primary}
        style={{
          borderColor: error ? colors.brand.primary : colors.neutral[300],
          textAlignVertical: multiline ? "top" : "center",
        }}
        value={value}
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-[4px] font-montserrat-medium text-[11px] leading-[14px] text-brand-primary"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function AddressEditorModal({
  address,
  mode,
  onClose,
  onSave,
  visible,
}: AddressEditorModalProps) {
  const { width } = useWindowDimensions();
  const desktopWeb = isDesktopWeb(width);
  const [draft, setDraft] = useState<CheckoutAddress>(EMPTY_ADDRESS);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  useEffect(() => {
    if (visible) {
      setDraft(address ?? EMPTY_ADDRESS);
      setErrors({});
    }
  }, [address, visible]);

  const updateField = (field: FieldName, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const saveAddress = () => {
    const nextErrors: Partial<Record<FieldName, string>> = {};

    if (!draft.label.trim()) {
      nextErrors.label = "Enter an address label";
    }
    if (!draft.addressLine.trim()) {
      nextErrors.addressLine = "Enter a delivery address";
    }
    if (!draft.contact.trim()) {
      nextErrors.contact = "Enter a contact number";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      ...draft,
      addressLine: draft.addressLine.trim(),
      contact: draft.contact.trim(),
      id: mode === "add" ? `temporary-address-${Date.now()}` : draft.id,
      label: draft.label.trim(),
    });
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
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
          accessibilityLabel="Close address editor"
          accessibilityRole="button"
          className="absolute inset-0 bg-neutral-1000/40"
          onPress={onClose}
        />

        <View
          className={`max-h-[88%] bg-neutral-0 px-lg pb-xl pt-lg ${
            desktopWeb ? "rounded-lg shadow-lg" : "rounded-t-lg"
          }`}
          style={{ width: desktopWeb ? 560 : width }}
        >
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text
              accessibilityRole="header"
              className="font-montserrat-semibold text-lg text-neutral-1000"
            >
              {mode === "edit" ? "Edit Delivery Address" : "Add Address"}
            </Text>
            <Text className="mt-[6px] font-montserrat-regular text-xs text-neutral-600">
              This address is temporary and is not saved to a backend.
            </Text>

            <AddressField
              accessibilityLabel="Address label"
              error={errors.label}
              label="Label"
              onChangeText={(value) => updateField("label", value)}
              placeholder="Home"
              value={draft.label}
            />
            <AddressField
              accessibilityLabel="Full delivery address"
              error={errors.addressLine}
              label="Delivery Address"
              multiline
              onChangeText={(value) => updateField("addressLine", value)}
              placeholder="Enter the full delivery address"
              value={draft.addressLine}
            />
            <AddressField
              accessibilityLabel="Delivery contact number"
              error={errors.contact}
              keyboardType="phone-pad"
              label="Contact Number"
              onChangeText={(value) => updateField("contact", value)}
              placeholder="+63 900 000 0000"
              value={draft.contact}
            />

            <View className="mt-lg flex-row gap-[12px]">
              <Pressable
                accessibilityLabel="Cancel address changes"
                accessibilityRole="button"
                className="h-[48px] flex-1 items-center justify-center rounded-sm border border-neutral-300 active:opacity-70"
                onPress={onClose}
              >
                <Text className="font-montserrat-semibold text-sm text-neutral-1000">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={
                  mode === "edit"
                    ? "Save delivery address"
                    : "Use new delivery address"
                }
                accessibilityRole="button"
                className="h-[48px] flex-1 items-center justify-center rounded-sm bg-brand-primary active:opacity-80"
                onPress={saveAddress}
              >
                <Text className="font-montserrat-semibold text-sm text-neutral-0">
                  {mode === "edit" ? "Save" : "Use Address"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
