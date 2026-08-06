import { forwardRef, useState } from "react";
import { Text, type TextInput, type TextInputProps, View } from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { colors } from "@/constants/design-tokens";

type ProfileFormFieldProps = TextInputProps & {
  error?: string;
  label: string;
};

export const ProfileFormField = forwardRef<TextInput, ProfileFormFieldProps>(
  function ProfileFormField(
    { error, label, onBlur, onFocus, ...inputProps },
    ref,
  ) {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View>
        <Text className="font-montserrat-regular text-xs text-neutral-1000">
          {label}
        </Text>
        <View
          className="mt-[12px] h-[48px] justify-center overflow-hidden rounded-sm border bg-neutral-0 px-[16px]"
          style={{
            borderColor: error
              ? colors.brand.primary
              : isFocused
                ? colors.brand.primary
                : colors.neutral[300],
          }}
        >
          <StylishTextInput
            {...inputProps}
            ref={ref}
            accessibilityHint={error || inputProps.accessibilityHint}
            className="h-full p-0 font-montserrat-semibold text-xs text-neutral-1000"
            onBlur={(event) => {
              setIsFocused(false);
              onBlur?.(event);
            }}
            onFocus={(event) => {
              setIsFocused(true);
              onFocus?.(event);
            }}
            placeholderTextColor={colors.neutral[475]}
            selectionColor={colors.brand.primary}
          />
        </View>
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            className="mt-[4px] font-montserrat-medium text-[11px] leading-[14px] text-brand-primary"
          >
            {error}
          </Text>
        ) : null}
      </View>
    );
  },
);
