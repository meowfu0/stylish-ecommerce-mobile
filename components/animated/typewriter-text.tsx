import { useEffect, useState } from "react";
import { type StyleProp, type ViewStyle, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import {
  StylishText,
  type StylishTextVariant,
} from "@/components/typography/stylish-text";

const CHARACTER_INTERVAL = 45;

type TypewriterTextProps = {
  className: string;
  containerStyle?: StyleProp<ViewStyle>;
  text: string;
  variant?: StylishTextVariant;
};

export function TypewriterText({
  className,
  containerStyle,
  text,
  variant = "section-title",
}: TypewriterTextProps) {
  const reduceMotion = useReducedMotion();
  const [visibleText, setVisibleText] = useState(reduceMotion ? text : "");

  useEffect(() => {
    if (reduceMotion) {
      setVisibleText(text);
      return;
    }

    let characterIndex = 0;
    setVisibleText("");

    const typingTimer = setInterval(() => {
      characterIndex += 1;
      setVisibleText(text.slice(0, characterIndex));

      if (characterIndex >= text.length) {
        clearInterval(typingTimer);
      }
    }, CHARACTER_INTERVAL);

    return () => clearInterval(typingTimer);
  }, [reduceMotion, text]);

  return (
    <View
      accessibilityLabel={text}
      accessibilityRole="header"
      accessible
      className="items-center"
      style={containerStyle}
    >
      <StylishText accessible={false} className={className} variant={variant}>
        {visibleText || "\u00A0"}
      </StylishText>
    </View>
  );
}
