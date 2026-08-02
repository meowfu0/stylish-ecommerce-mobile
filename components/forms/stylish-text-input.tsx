import { forwardRef } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import { colors } from "@/constants/design-tokens";

export type StylishTextInputProps = TextInputProps & {
  className?: string;
};

/**
 * The surrounding field shell owns its background, border, radius, and focus
 * treatment. Keeping the native control transparent prevents platform and web
 * autofill layers from splitting a field into differently colored sections.
 */
export const StylishTextInput = forwardRef<TextInput, StylishTextInputProps>(
  function StylishTextInput(
    {
      cursorColor = colors.brand.primary,
      selectionColor = colors.brand.primary,
      style,
      underlineColorAndroid = "transparent",
      ...inputProps
    },
    ref,
  ) {
    return (
      <TextInput
        {...inputProps}
        ref={ref}
        cursorColor={cursorColor}
        selectionColor={selectionColor}
        style={[style, styles.control]}
        underlineColorAndroid={underlineColorAndroid}
      />
    );
  },
);

const styles = StyleSheet.create({
  control: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    boxShadow: "none",
    outlineColor: "transparent",
  },
});
