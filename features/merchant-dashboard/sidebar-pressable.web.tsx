import {
  forwardRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  StyleSheet,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type SidebarPressableProps = {
  "aria-controls"?: string;
  "aria-current"?: "page";
  "aria-disabled"?: boolean;
  "aria-expanded"?: boolean;
  accessibilityHint?: string;
  accessibilityLabel: string;
  accessibilityRole?: "button";
  accessibilityState?: AccessibilityState;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  nativeID?: string;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: StyleProp<ViewStyle>;
  tabIndex?: number;
  testID?: string;
  title?: string;
};

const browserButtonReset: CSSProperties = {
  appearance: "none",
  backgroundColor: "transparent",
  border: 0,
  boxSizing: "border-box",
  color: "inherit",
  display: "flex",
  font: "inherit",
  margin: 0,
  minWidth: 0,
  padding: 0,
  textAlign: "left",
};

function normalizeReactNativeStyle(style: StyleProp<ViewStyle>): CSSProperties {
  const flattened = StyleSheet.flatten(style) ?? {};
  const {
    marginHorizontal,
    marginVertical,
    paddingHorizontal,
    paddingVertical,
    ...browserStyle
  } = flattened;

  return {
    ...(browserStyle as CSSProperties),
    marginBottom: (flattened.marginBottom ??
      marginVertical) as CSSProperties["marginBottom"],
    marginLeft: (flattened.marginLeft ??
      marginHorizontal) as CSSProperties["marginLeft"],
    marginRight: (flattened.marginRight ??
      marginHorizontal) as CSSProperties["marginRight"],
    marginTop: (flattened.marginTop ??
      marginVertical) as CSSProperties["marginTop"],
    paddingBottom: (flattened.paddingBottom ??
      paddingVertical) as CSSProperties["paddingBottom"],
    paddingLeft: (flattened.paddingLeft ??
      paddingHorizontal) as CSSProperties["paddingLeft"],
    paddingRight: (flattened.paddingRight ??
      paddingHorizontal) as CSSProperties["paddingRight"],
    paddingTop: (flattened.paddingTop ??
      paddingVertical) as CSSProperties["paddingTop"],
  };
}

export const SidebarPressable = forwardRef<
  HTMLButtonElement,
  SidebarPressableProps
>(function SidebarPressable(
  {
    "aria-controls": ariaControls,
    "aria-current": ariaCurrent,
    "aria-disabled": ariaDisabled,
    "aria-expanded": ariaExpanded,
    accessibilityHint,
    accessibilityLabel,
    accessibilityState,
    children,
    className,
    disabled,
    nativeID,
    onHoverIn,
    onHoverOut,
    onPress,
    onPressIn,
    onPressOut,
    style,
    tabIndex,
    testID,
    title,
  },
  ref,
) {
  const [pressed, setPressed] = useState(false);
  const normalizedStyle = normalizeReactNativeStyle(style);

  const endPress = () => {
    if (!pressed) return;
    setPressed(false);
    onPressOut?.();
  };

  return (
    <button
      aria-controls={ariaControls}
      aria-current={ariaCurrent}
      aria-description={accessibilityHint}
      aria-disabled={ariaDisabled ?? accessibilityState?.disabled}
      aria-expanded={ariaExpanded ?? accessibilityState?.expanded}
      aria-label={accessibilityLabel}
      aria-selected={accessibilityState?.selected}
      className={className}
      data-testid={testID}
      disabled={disabled}
      id={nativeID}
      onBlur={endPress}
      onClick={onPress}
      onMouseEnter={onHoverIn}
      onMouseLeave={() => {
        onHoverOut?.();
        endPress();
      }}
      onPointerDown={() => {
        if (disabled) return;
        setPressed(true);
        onPressIn?.();
      }}
      onPointerUp={endPress}
      ref={ref}
      style={{ ...browserButtonReset, ...normalizedStyle }}
      tabIndex={tabIndex}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
});
