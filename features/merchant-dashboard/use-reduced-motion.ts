import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Tracks the platform's "reduce motion" preference so dashboard surfaces can
 * fall back to an instant state change instead of animating. Shared by the
 * sidebar and the shell that resizes around it, which have to agree: animating
 * one while the other jumps would be worse than not animating at all.
 */
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const updateReducedMotion = (enabled: boolean) => {
      if (!mounted || reducedMotionRef.current === enabled) return;
      reducedMotionRef.current = enabled;
      setReducedMotion(enabled);
    };

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      updateReducedMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      updateReducedMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}
