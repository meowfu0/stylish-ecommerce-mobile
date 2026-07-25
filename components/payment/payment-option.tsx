import { Image } from "expo-image";
import { Pressable, Text } from "react-native";

import type { PaymentMethod } from "@/constants/payment-data";

type PaymentOptionProps = {
  disabled?: boolean;
  method: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  selected: boolean;
};

export function PaymentOption({
  disabled = false,
  method,
  onSelect,
  selected,
}: PaymentOptionProps) {
  return (
    <Pressable
      accessibilityHint={`Selects ${method.label} for this frontend-only order`}
      accessibilityLabel={`${method.label}, account ending in ${method.endingIn}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled, selected }}
      className={`h-[59px] flex-row items-center rounded-sm border-[1.5px] bg-neutral-75 px-[16px] active:opacity-70 ${
        selected ? "border-brand-primary" : "border-neutral-75"
      }`}
      disabled={disabled}
      onPress={() => onSelect(method)}
    >
      <Image
        accessible={false}
        contentFit="contain"
        source={method.logo}
        style={{ height: method.logoHeight, width: method.logoWidth }}
      />
      <Text className="ml-auto font-montserrat-medium text-[15px] leading-[29px] text-neutral-525">
        {method.maskedNumber}
      </Text>
    </Pressable>
  );
}
