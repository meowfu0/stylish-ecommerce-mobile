/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { colors } from "@/constants/design-tokens";

const tintColorLight = colors.brand.primary;
const tintColorDark = colors.neutral[0];

export const Colors = {
  light: {
    text: colors.neutral[900],
    background: colors.neutral[0],
    tint: tintColorLight,
    icon: colors.neutral[500],
    tabIconDefault: colors.neutral[500],
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};
