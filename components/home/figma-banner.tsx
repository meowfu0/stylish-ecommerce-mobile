import { Image } from "expo-image";
import { Pressable } from "react-native";

type FigmaBannerProps = {
  accessibilityHint: string;
  accessibilityLabel: string;
  aspectRatio: number;
  image: number;
  onPress: () => void;
  width: number;
};

export function FigmaBanner({
  accessibilityHint,
  accessibilityLabel,
  aspectRatio,
  image,
  onPress,
  width,
}: FigmaBannerProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className="overflow-hidden active:opacity-90"
      onPress={onPress}
      style={{ height: width / aspectRatio, width }}
    >
      <Image
        accessible={false}
        contentFit="contain"
        source={image}
        style={{ height: "100%", width: "100%" }}
      />
    </Pressable>
  );
}
