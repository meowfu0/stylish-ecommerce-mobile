import { Image, type ImageSource } from "expo-image";
import { forwardRef, type ReactNode } from "react";
import {
  StyleSheet,
  type TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { StylishText } from "@/components/typography/stylish-text";
import { colors, typography } from "@/constants/design-tokens";

type AuthFormFieldProps = Omit<TextInputProps, "style"> & {
  compact?: boolean;
  error?: string;
  focused: boolean;
  helper?: string;
  icon: ImageSource;
  label: string;
  labelSuffix?: string;
  trailing?: ReactNode;
};

export const AuthFormField = forwardRef<TextInput, AuthFormFieldProps>(
  function AuthFormField(
    {
      accessibilityState,
      compact = false,
      editable = true,
      error,
      focused,
      helper,
      icon,
      label,
      labelSuffix,
      nativeID,
      testID,
      trailing,
      ...inputProps
    },
    ref,
  ) {
    const labelId = nativeID ? `${nativeID}-label` : undefined;

    return (
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <StylishText
            className="text-ink-primary"
            nativeID={labelId}
            style={[styles.label, compact && styles.labelCompact]}
            unstyled
            variant="form-label"
          >
            {label}
          </StylishText>
          {labelSuffix ? (
            <StylishText
              className="text-neutral-550"
              style={[styles.labelSuffix, compact && styles.labelSuffixCompact]}
              unstyled
              variant="form-label"
            >
              {labelSuffix}
            </StylishText>
          ) : null}
        </View>
        <View
          style={[
            styles.inputShell,
            compact && styles.inputShellCompact,
            focused && styles.inputShellFocused,
            Boolean(error) && styles.inputShellInvalid,
            !editable && styles.inputShellDisabled,
          ]}
          testID={testID ? `${testID}-shell` : undefined}
        >
          <Image
            accessible={false}
            contentFit="contain"
            source={icon}
            style={[
              styles.leadingIcon,
              compact && styles.leadingIconCompact,
              !editable && styles.iconDisabled,
            ]}
          />
          <StylishTextInput
            {...inputProps}
            ref={ref}
            accessibilityHint={error}
            accessibilityLabel={label}
            accessibilityState={{
              ...accessibilityState,
              disabled: !editable,
            }}
            aria-invalid={Boolean(error)}
            aria-labelledby={labelId}
            editable={editable}
            nativeID={nativeID}
            style={[
              styles.input,
              compact && styles.inputCompact,
              !editable && styles.inputDisabled,
            ]}
            testID={testID}
          />
          {trailing}
        </View>
        {error ? (
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[styles.validation, compact && styles.validationCompact]}
            testID={testID ? `${testID}-error` : undefined}
          >
            <Image
              accessible={false}
              contentFit="contain"
              source={require("@/assets/icons/auth-field-error.svg")}
              style={styles.validationIcon}
            />
            <StylishText className="flex-1 text-[#C81E3E]" variant="helper">
              {error}
            </StylishText>
          </View>
        ) : helper ? (
          <StylishText
            className="text-neutral-550"
            style={[styles.helper, compact && styles.helperCompact]}
            testID={testID ? `${testID}-helper` : undefined}
            variant="helper"
          >
            {helper}
          </StylishText>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  field: { width: "100%" },
  iconDisabled: { opacity: 0.42 },
  input: {
    alignSelf: "stretch",
    color: colors.ink.primary,
    flex: 1,
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.input,
    lineHeight: typography.lineHeight.input,
    minWidth: 0,
    padding: 0,
  },
  inputCompact: {
    fontSize: typography.fontSize.bodySmall,
    lineHeight: typography.lineHeight.label,
  },
  inputDisabled: { color: colors.neutral[400] },
  inputShell: {
    alignItems: "center",
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    height: 56,
    marginTop: 8,
    overflow: "hidden",
    paddingLeft: 14,
    paddingRight: 6,
  },
  inputShellCompact: { height: 48, marginTop: 6 },
  inputShellDisabled: {
    backgroundColor: "rgba(243, 243, 243, 0.6)",
  },
  inputShellFocused: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.brand.primary,
    shadowColor: colors.brand.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  inputShellInvalid: {
    backgroundColor: colors.neutral[0],
    borderColor: "#C81E3E",
  },
  leadingIcon: { height: 18, marginRight: 15, width: 18 },
  leadingIconCompact: { marginRight: 12 },
  label: {
    fontFamily: typography.fontFamily.montserratMedium,
    fontSize: typography.fontSize.label,
    lineHeight: typography.lineHeight.label,
  },
  labelCompact: {
    fontSize: typography.fontSize.label,
    lineHeight: typography.lineHeight.caption,
  },
  labelRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  labelSuffix: {
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodySmall,
    lineHeight: typography.lineHeight.label,
  },
  labelSuffixCompact: {
    fontSize: typography.fontSize.label,
    lineHeight: typography.lineHeight.caption,
  },
  helper: { marginTop: 8 },
  helperCompact: { marginTop: 6 },
  validation: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  validationCompact: { marginTop: 6 },
  validationIcon: { height: 14, marginTop: 1, width: 14 },
});
