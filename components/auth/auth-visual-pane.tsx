import { Image } from "expo-image";
import { Platform, StyleSheet, type DimensionValue, View } from "react-native";

import { StylishLogo } from "@/components/brand/stylish-logo";
import { StylishText } from "@/components/typography/stylish-text";
import { colors, typography } from "@/constants/design-tokens";

type AuthVisualPaneProps = {
  compact?: boolean;
  desktop: boolean;
  editorialTop: DimensionValue;
  minHeight: number;
  split: boolean;
  width: DimensionValue;
};

export function AuthVisualPane({
  compact = false,
  desktop,
  editorialTop,
  minHeight,
  split,
  width,
}: AuthVisualPaneProps) {
  const logoScale = desktop ? (compact ? 0.86 : 1) : split ? 0.74 : 0.64;
  const photoWidth: DimensionValue = desktop ? "46%" : "100%";

  return (
    <View
      style={[
        styles.visualPane,
        {
          height: split ? undefined : 200,
          minHeight: split ? minHeight : undefined,
          width,
        },
      ]}
      testID="auth-visual-pane"
    >
      {desktop ? (
        <View
          pointerEvents="none"
          style={styles.brandShapes}
          testID="auth-brand-shapes"
        >
          <View
            style={[
              styles.brandShape,
              styles.brandShapePink,
              {
                filter:
                  Platform.OS === "web" ? "blur(94.461px)" : [{ blur: 94.461 }],
              },
            ]}
          />
          <View
            style={[
              styles.brandShape,
              styles.brandShapeBlue,
              {
                filter:
                  Platform.OS === "web"
                    ? "blur(104.957px)"
                    : [{ blur: 104.957 }],
              },
            ]}
          />
          <View
            style={[
              styles.brandShape,
              styles.brandShapeSoft,
              {
                filter: Platform.OS === "web" ? "blur(120px)" : [{ blur: 120 }],
              },
            ]}
          />
        </View>
      ) : null}

      <Image
        accessible={false}
        contentFit="cover"
        contentPosition="center"
        source={require("@/assets/images/auth-sign-in-fashion.jpg")}
        style={[
          styles.fashionImage,
          { opacity: desktop ? 1 : 0.58, width: photoWidth },
        ]}
        testID="auth-fashion-image"
        transition={250}
      />
      <View
        pointerEvents="none"
        style={[styles.photoFade, { width: photoWidth }]}
        testID="auth-photo-fade"
      />

      <StylishLogo
        style={[
          styles.logo,
          {
            left: desktop ? (compact ? 48 : 64) : split ? 32 : 24,
            top: desktop ? (compact ? 32 : 56) : split ? 32 : 18,
          },
        ]}
        testID="auth-brand-logo"
        width={217 * logoScale}
      />

      {desktop ? (
        <View
          style={[
            styles.editorialCopy,
            compact && styles.editorialCopyCompact,
            { top: editorialTop },
          ]}
          testID="auth-editorial-copy"
        >
          <StylishText
            accessibilityRole="header"
            className="text-ink-primary"
            style={styles.editorialTitle}
            testID="auth-editorial-title"
            unstyled
            variant="page-title"
          >
            Authentic style, made easy.
          </StylishText>
          <StylishText
            className="mt-[20px] max-w-[440px] text-neutral-550"
            style={styles.editorialDescription}
            testID="auth-editorial-description"
            unstyled
            variant="body"
          >
            Discover products you&apos;ll love and manage every part of your
            Stylish experience in one secure place.
          </StylishText>
          <View
            accessibilityLabel="First of three highlights"
            style={styles.progress}
          >
            <View style={styles.progressActive} />
            <View style={styles.progressBlue} />
            <View style={styles.progressPink} />
          </View>
        </View>
      ) : null}

      {desktop ? (
        <StylishText
          className="text-neutral-550"
          style={[styles.footerCopy, compact && styles.footerCopyCompact]}
          unstyled
          variant="helper"
        >
          Stylish — multi-vendor fashion marketplace
        </StylishText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brandShape: { borderRadius: 999, position: "absolute" },
  brandShapeBlue: {
    backgroundColor: "rgba(207, 226, 252, 0.6)",
    height: 483,
    right: -131,
    top: "68.7%",
    width: 483,
  },
  brandShapePink: {
    backgroundColor: "rgba(248, 188, 198, 0.45)",
    height: 441,
    left: -150,
    top: -145,
    width: 441,
  },
  brandShapeSoft: {
    backgroundColor: "rgba(252, 243, 246, 0.7)",
    height: 560,
    left: 154,
    top: "23.1%",
    width: 560,
  },
  brandShapes: {
    bottom: 0,
    left: 0,
    opacity: 0.9,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  editorialCopy: {
    left: 64,
    maxWidth: 520,
    position: "absolute",
    right: 32,
    zIndex: 2,
  },
  editorialCopyCompact: { left: 48 },
  editorialDescription: {
    alignSelf: "flex-start",
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodyLarge,
    lineHeight: typography.lineHeight.bodyLarge,
    maxWidth: 440,
    width: "100%",
  },
  editorialTitle: {
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: typography.fontSize.displayLarge,
    letterSpacing: typography.letterSpacing.displayLarge,
    lineHeight: typography.lineHeight.displayLarge,
    maxWidth: 520,
    width: "100%",
  },
  fashionImage: {
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  footerCopy: {
    bottom: 56,
    fontFamily: typography.fontFamily.montserratMedium,
    fontSize: typography.fontSize.caption,
    left: 64,
    lineHeight: typography.lineHeight.caption,
    position: "absolute",
    zIndex: 2,
  },
  footerCopyCompact: { bottom: 24, left: 48 },
  logo: {
    position: "absolute",
    zIndex: 3,
  },
  photoFade: {
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1,
  },
  progress: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 40,
  },
  progressActive: {
    backgroundColor: colors.brand.primary,
    borderRadius: 999,
    height: 8,
    width: 40,
  },
  progressBlue: {
    backgroundColor: colors.brand.blue,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  progressPink: {
    backgroundColor: colors.brand.pinkSoft,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  visualPane: {
    backgroundColor: "#FCF3F6",
    overflow: "hidden",
    position: "relative",
  },
});
