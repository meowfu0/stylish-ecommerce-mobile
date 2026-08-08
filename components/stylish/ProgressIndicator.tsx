import { View } from "react-native";

type ProgressIndicatorProps = {
  current: number;
  total: number;
};

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  return (
    <View
      aria-label={`Step ${current} of ${total}`}
      className="flex-row items-center gap-[8px]"
      role="group"
    >
      {Array.from({ length: total }, (_, index) => {
        const active = index + 1 === current;

        return (
          <View
            aria-hidden
            className={`h-[8px] rounded-full transition-all duration-300 ${
              active ? "w-[40px] bg-brand-primary" : "w-[8px] bg-brand-pinkSoft"
            }`}
            key={index}
            testID="onboarding-progress-pill"
          />
        );
      })}
    </View>
  );
}
