import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

type SponsoredOfferProps = {
  onPress: () => void;
  width: number;
};

const FIGMA_WIDTH = 343;

export function SponsoredOffer({ onPress, width }: SponsoredOfferProps) {
  const scale = width / FIGMA_WIDTH;

  return (
    <View style={{ height: 358 * scale, width }}>
      <Text
        accessibilityRole="header"
        className="font-montserrat-medium text-neutral-1000"
        style={{ fontSize: 20 * scale, lineHeight: 22 * scale }}
      >
        Sponserd
      </Text>

      <Image
        accessibilityLabel="Sponsored brown shoes, up to 50 percent off"
        accessibilityRole="image"
        contentFit="cover"
        source={require("@/assets/images/home/sponsored-artwork.png")}
        style={{
          borderRadius: 8 * scale,
          height: 292 * scale,
          marginTop: 12 * scale,
          width,
        }}
      />

      <Pressable
        accessibilityHint="Opens the sponsored offer in Search"
        accessibilityLabel="Shop sponsored offer, up to 50 percent off"
        accessibilityRole="button"
        className="mt-[12px] h-[20px] flex-row items-center justify-between active:opacity-60"
        hitSlop={8}
        onPress={onPress}
      >
        <Text
          className="font-montserrat-bold text-neutral-1000"
          style={{ fontSize: 16 * scale, lineHeight: 20 * scale }}
        >
          up to 50% Off
        </Text>
        <Image
          accessible={false}
          contentFit="contain"
          source={require("@/assets/icons/home/deal-arrow.svg")}
          style={{ height: 20 * scale, width: 20 * scale }}
        />
      </Pressable>
    </View>
  );
}
