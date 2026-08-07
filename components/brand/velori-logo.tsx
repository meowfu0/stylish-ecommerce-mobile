import { Image } from "expo-image";
import {
  type ImageStyle,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";

import { BRAND } from "@/constants/brand";

/**
 * `assets/images/velori-logo.svg` is the single source of truth for the brand.
 * It is a masked export whose transparency comes from an `feColorMatrix` filter
 * chain, which browsers honour but the SVG renderers behind `expo-image` on iOS
 * and Android do not — rendering it directly risks a black plate behind the
 * logo on device. `scripts/derive-brand-assets.mjs` flattens that source into
 * the two rasters used here, so web and native draw identical pixels.
 *
 * Both ratios below are the measured ink bounds of that source. Callers pass a
 * width or a height and the artwork supplies the other dimension, so no surface
 * restates the logo's proportions, and `contain` means neither can be stretched.
 */
export const VELORI_LOGO_ASPECT_RATIO = 3.5019;
const MARK_ASPECT_RATIO = 1.1815;

/** Standalone mark: collapsed rails, compact navigation, small surfaces. */
export function VeloriMark({
  accessibilityLabel = BRAND.name,
  size,
  style,
  testID,
}: {
  accessibilityLabel?: string;
  /** Rendered height; width follows the artwork's own aspect ratio. */
  size: number;
  style?: StyleProp<ImageStyle>;
  testID?: string;
}) {
  const height = Math.max(0, size);

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      contentFit="contain"
      source={require("@/assets/images/velori-mark.png")}
      style={[{ height, width: height * MARK_ASPECT_RATIO }, style]}
      testID={testID}
    />
  );
}

/** Full horizontal lockup: mark plus wordmark, as one accessible image. */
export function VeloriLogo({
  accessibilityLabel = BRAND.name,
  maxWidth,
  style,
  testID,
  width,
}: {
  accessibilityLabel?: string;
  /** Caps the fluid width. Ignored when `width` is given. */
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Fixed width. Omit to fill the container, capped by `maxWidth`. */
  width?: number;
}) {
  // Either the caller fixes the width and the artwork supplies the height, or
  // the lockup fills its container and `aspectRatio` supplies the height. The
  // fluid form lets a surface cap the logo instead of measuring it, which is
  // what keeps it clear of neighbouring controls when the container resizes.
  const sizing: ViewStyle =
    width === undefined
      ? { aspectRatio: VELORI_LOGO_ASPECT_RATIO, maxWidth, width: "100%" }
      : {
          height: Math.max(0, width) / VELORI_LOGO_ASPECT_RATIO,
          width: Math.max(0, width),
        };

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      accessible
      style={[styles.container, style, sizing]}
      testID={testID}
    >
      <Image
        accessible={false}
        contentFit="contain"
        source={require("@/assets/images/velori-logo.png")}
        style={styles.artwork}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: { height: "100%", width: "100%" },
  container: { flexShrink: 0 },
});
