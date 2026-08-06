import { useEffect, useState } from "react";
import { type StyleProp, Text, type TextStyle, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors, typography } from "@/constants/design-tokens";

const FIRST_LINE = "A little more";
const ACCENT_TEXT = "lovely";
const SECOND_LINE_END = " every day.";
const FULL_TEXT = `${FIRST_LINE}\n${ACCENT_TEXT}${SECOND_LINE_END}`;
const CHARACTER_INTERVAL = 74;
const LINE_BREAK_DELAY = 240;
const START_DELAY = 400;
const REPLAY_INTERVAL = 15_000;
const REPLAY_FADE_DURATION = 240;

type HeroWritingHeadlineProps = {
  style: StyleProp<TextStyle>;
};

export function HeroWritingHeadline({ style }: HeroWritingHeadlineProps) {
  const reduceMotion = useReducedMotion();
  const caretOpacity = useSharedValue(1);
  const writingOpacity = useSharedValue(1);
  const [visibleCharacters, setVisibleCharacters] = useState(
    reduceMotion ? FULL_TEXT.length : 0,
  );
  const typingComplete = visibleCharacters >= FULL_TEXT.length;

  useEffect(() => {
    if (reduceMotion) {
      setVisibleCharacters(FULL_TEXT.length);
      return;
    }

    if (typingComplete) {
      return;
    }

    const nextCharacter = FULL_TEXT[visibleCharacters];
    const delay =
      visibleCharacters === 0
        ? START_DELAY
        : nextCharacter === "\n"
          ? LINE_BREAK_DELAY
          : CHARACTER_INTERVAL;
    const timer = setTimeout(
      () => setVisibleCharacters((current) => current + 1),
      delay,
    );

    return () => clearTimeout(timer);
  }, [reduceMotion, typingComplete, visibleCharacters]);

  useEffect(() => {
    if (reduceMotion || typingComplete) {
      cancelAnimation(caretOpacity);
      caretOpacity.value = 0;
      return;
    }

    caretOpacity.value = 1;
    caretOpacity.value = withRepeat(
      withTiming(0.16, {
        duration: 480,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );

    return () => cancelAnimation(caretOpacity);
  }, [caretOpacity, reduceMotion, typingComplete]);

  useEffect(() => {
    if (reduceMotion || !typingComplete) {
      return;
    }

    let restartTimer: ReturnType<typeof setTimeout> | undefined;
    const replayTimer = setTimeout(() => {
      writingOpacity.value = withTiming(0, {
        duration: REPLAY_FADE_DURATION,
        easing: Easing.out(Easing.quad),
      });
      restartTimer = setTimeout(() => {
        setVisibleCharacters(0);
        writingOpacity.value = withTiming(1, {
          duration: REPLAY_FADE_DURATION,
          easing: Easing.in(Easing.quad),
        });
      }, REPLAY_FADE_DURATION);
    }, REPLAY_INTERVAL);

    return () => {
      clearTimeout(replayTimer);
      if (restartTimer) {
        clearTimeout(restartTimer);
      }
    };
  }, [reduceMotion, typingComplete, writingOpacity]);

  const caretStyle = useAnimatedStyle(() => ({
    opacity: caretOpacity.value,
  }));
  const writingStyle = useAnimatedStyle(() => ({
    opacity: writingOpacity.value,
  }));
  const visibleFirstLine = FIRST_LINE.slice(
    0,
    Math.min(visibleCharacters, FIRST_LINE.length),
  );
  const secondLineCharacters = Math.max(
    0,
    visibleCharacters - FIRST_LINE.length - 1,
  );
  const visibleAccent = ACCENT_TEXT.slice(
    0,
    Math.min(secondLineCharacters, ACCENT_TEXT.length),
  );
  const visibleSecondLineEnd = SECOND_LINE_END.slice(
    0,
    Math.max(0, secondLineCharacters - ACCENT_TEXT.length),
  );
  const secondLineStarted = visibleCharacters > FIRST_LINE.length;

  return (
    <View
      accessibilityLabel="A little more lovely every day."
      accessibilityRole="header"
      accessible
      className="mt-md self-stretch"
      style={{ position: "relative" }}
    >
      <Text
        accessibilityElementsHidden
        accessible={false}
        className="text-ink-editorial"
        importantForAccessibility="no-hide-descendants"
        style={[
          style,
          {
            fontFamily: typography.fontFamily.montserratBold,
            opacity: 0,
          },
        ]}
      >
        {FIRST_LINE}
        {"\n"}
        <Text
          className="text-brand-editorialAccent"
          style={{
            fontFamily: typography.fontFamily.montserratSemibold,
          }}
        >
          {ACCENT_TEXT}
        </Text>
        {SECOND_LINE_END}
      </Text>

      <Animated.View className="absolute inset-0" style={writingStyle}>
        <Text
          accessible={false}
          className="text-ink-editorial"
          style={[style, { fontFamily: typography.fontFamily.montserratBold }]}
        >
          {visibleFirstLine}
          {secondLineStarted ? "\n" : null}
          {secondLineStarted ? (
            <Text
              className="text-brand-editorialAccent"
              style={{
                fontFamily: typography.fontFamily.montserratSemibold,
              }}
            >
              {visibleAccent}
            </Text>
          ) : null}
          {visibleSecondLineEnd}
          {!typingComplete && !reduceMotion ? (
            <Animated.Text
              style={[
                caretStyle,
                {
                  color: colors.brand.editorialAccent,
                  fontFamily: typography.fontFamily.montserratBold,
                },
              ]}
            >
              |
            </Animated.Text>
          ) : null}
        </Text>
      </Animated.View>
    </View>
  );
}
