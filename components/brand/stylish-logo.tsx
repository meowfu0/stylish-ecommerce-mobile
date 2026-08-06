import { Image } from "expo-image";
import { StyleSheet, type StyleProp, View, type ViewStyle } from "react-native";

const LOGO_MARK_SIZE = 52;
const LOGO_WORDMARK_WIDTH = 155;
const LOGO_WORDMARK_HEIGHT = 50;
const LOGO_GAP = 8;

export const STYLISH_LOGO_ASPECT_RATIO =
  (LOGO_MARK_SIZE + LOGO_GAP + LOGO_WORDMARK_WIDTH) / LOGO_MARK_SIZE;

type StylishLogoProps = {
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  width: number;
};

export function StylishLogo({
  accessibilityLabel = "Stylish",
  style,
  testID,
  width,
}: StylishLogoProps) {
  const safeWidth = Math.max(0, width);
  const height = safeWidth / STYLISH_LOGO_ASPECT_RATIO;
  const scale = height / LOGO_MARK_SIZE;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      accessible
      style={[styles.container, style, { height, width: safeWidth }]}
      testID={testID}
    >
      <Image
        accessible={false}
        contentFit="contain"
        source={require("@/assets/images/stylish-auth-logo-mark.png")}
        style={{ height, width: height }}
      />
      <Image
        accessible={false}
        contentFit="contain"
        source={require("@/assets/images/stylish-auth-logo-wordmark.png")}
        style={{
          height: LOGO_WORDMARK_HEIGHT * scale,
          marginLeft: LOGO_GAP * scale,
          width: LOGO_WORDMARK_WIDTH * scale,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    overflow: "visible",
  },
});
