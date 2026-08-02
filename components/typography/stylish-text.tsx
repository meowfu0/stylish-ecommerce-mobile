import type { TextProps } from "react-native";
import { Text } from "react-native";

export type StylishTextVariant =
  | "bodyLarge"
  | "bodyMedium"
  | "bodySmall"
  | "caption"
  | "display"
  | "displayLarge"
  | "headingLarge"
  | "headingMedium"
  | "headingSmall"
  | "input"
  | "label"
  | "link"
  | "price"
  | "priceLarge"
  | "validation"
  | "body"
  | "button"
  | "eyebrow"
  | "form-label"
  | "helper"
  | "hero-title"
  | "navigation"
  | "navigation-strong"
  | "page-title"
  | "section-title";

type StylishTextProps = TextProps & {
  className?: string;
  unstyled?: boolean;
  variant: StylishTextVariant;
};

const variantClassNames: Record<StylishTextVariant, string> = {
  bodyLarge: "font-montserrat-regular text-bodyLarge",
  bodyMedium: "font-montserrat-regular text-bodyMedium",
  bodySmall: "font-montserrat-regular text-bodySmall",
  caption: "font-montserrat-regular text-caption",
  display: "font-montserrat-bold text-display tracking-[-0.8px]",
  displayLarge: "font-montserrat-bold text-displayLarge tracking-[-0.88px]",
  headingLarge: "font-montserrat-bold text-headingLarge tracking-[-0.45px]",
  headingMedium: "font-montserrat-bold text-headingMedium tracking-[-0.24px]",
  headingSmall: "font-montserrat-bold text-headingSmall",
  input: "font-montserrat-regular text-input",
  label: "font-montserrat-medium text-label",
  link: "font-montserrat-semibold text-link",
  price: "font-montserrat-semibold text-price",
  priceLarge: "font-montserrat-bold text-priceLarge",
  validation: "font-montserrat-regular text-validation",
  body: "font-montserrat-regular text-bodyMedium",
  button: "font-montserrat-semibold text-button",
  eyebrow: "font-montserrat-semibold text-label uppercase tracking-[1.82px]",
  "form-label": "font-montserrat-medium text-label",
  helper: "font-montserrat-regular text-caption",
  "hero-title": "font-montserrat-bold text-headingLarge tracking-[-0.45px]",
  navigation: "font-montserrat-medium text-navigation",
  "navigation-strong": "font-montserrat-semibold text-link",
  "page-title": "font-montserrat-bold text-display tracking-[-0.8px]",
  "section-title": "font-montserrat-bold text-headingLarge tracking-[-0.45px]",
};

export function StylishText({
  className = "",
  testID,
  unstyled = false,
  variant,
  ...props
}: StylishTextProps) {
  return (
    <Text
      {...props}
      className={`${unstyled ? "" : variantClassNames[variant]} ${className}`.trim()}
      testID={testID ?? `stylish-type-${variant}`}
    />
  );
}
