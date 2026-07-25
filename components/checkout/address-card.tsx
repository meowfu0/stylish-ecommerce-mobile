import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import type { CheckoutAddress } from "@/constants/checkout-data";

type AddressCardProps = {
  address: CheckoutAddress;
  onEdit: () => void;
};

export function AddressCard({ address, onEdit }: AddressCardProps) {
  return (
    <View
      accessibilityLabel={`${address.label}: ${address.addressLine}. Contact ${address.contact}`}
      className="h-[79px] flex-1 rounded-[6px] bg-neutral-0 px-[12px] py-[10px] shadow-sm"
    >
      <Text className="font-montserrat-medium text-xs text-neutral-1000">
        {address.label} :
      </Text>
      <Text
        className="mt-[4px] pr-[24px] font-montserrat-regular text-xs leading-[14px] text-neutral-1000"
        numberOfLines={2}
      >
        {address.addressLine}
        {"\n"}Contact : {address.contact}
      </Text>
      <Pressable
        accessibilityHint="Opens the temporary delivery-address editor"
        accessibilityLabel="Edit delivery address"
        accessibilityRole="button"
        className="absolute right-[8px] top-[8px] h-[32px] w-[32px] items-end justify-start active:opacity-60"
        hitSlop={4}
        onPress={onEdit}
      >
        <Image
          accessible={false}
          contentFit="contain"
          source={require("@/assets/icons/checkout/edit.svg")}
          style={{ height: 12, width: 12 }}
        />
      </Pressable>
    </View>
  );
}
