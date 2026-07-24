import type { Config } from "tailwindcss";

import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "./constants/design-tokens";

function toPixelValues(tokens: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [name, `${value}px`]),
  );
}

const fontSize = Object.fromEntries(
  Object.entries(typography.fontSize).map(
    ([name, value]): [string, [string, { lineHeight: string }]] => {
      const lineHeight =
        typography.lineHeight[name as keyof typeof typography.lineHeight];

      return [
        name,
        [
          `${value}px`,
          {
            lineHeight: `${lineHeight}px`,
          },
        ],
      ];
    },
  ),
);

export default {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      borderRadius: toPixelValues(borderRadius),
      colors,
      fontFamily: {
        sans: [typography.fontFamily.sans],
        serif: [typography.fontFamily.serif],
        "montserrat-semibold": [typography.fontFamily.montserratSemibold],
        "montserrat-extrabold": [typography.fontFamily.montserratExtrabold],
      },
      fontSize,
      fontWeight: typography.fontWeight,
      spacing: toPixelValues(spacing),
    },
  },
  plugins: [],
} satisfies Config;
