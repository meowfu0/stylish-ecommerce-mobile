import {
  Modal,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isDesktopWeb } from "@/constants/responsive";

export type SelectionSheetOption = {
  description?: string;
  label: string;
  value: string;
};

type SelectionSheetProps = {
  onClose: () => void;
  onSelect: (value: string) => void;
  options: readonly SelectionSheetOption[];
  selectedValue: string;
  title: string;
  visible: boolean;
};

export function SelectionSheet({
  onClose,
  onSelect,
  options,
  selectedValue,
  title,
  visible,
}: SelectionSheetProps) {
  const { width } = useWindowDimensions();
  const desktopWeb = isDesktopWeb(width);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View
        className={`flex-1 ${
          desktopWeb ? "items-center justify-center px-lg" : "justify-end"
        }`}
      >
        <Pressable
          accessibilityLabel={`Close ${title}`}
          accessibilityRole="button"
          className="absolute inset-0 bg-neutral-1000/40"
          onPress={onClose}
        />
        <SafeAreaView
          className={`bg-neutral-0 px-lg pb-lg pt-lg ${
            desktopWeb ? "rounded-lg shadow-lg" : "rounded-t-lg"
          }`}
          edges={desktopWeb ? [] : ["bottom"]}
          style={{ width: desktopWeb ? 480 : width }}
        >
          <Text
            accessibilityRole="header"
            className="font-montserrat-semibold text-lg text-neutral-1000"
          >
            {title}
          </Text>

          <View className="mt-md gap-[8px]">
            {options.map((option) => {
              const selected = option.value === selectedValue;

              return (
                <Pressable
                  accessibilityLabel={
                    option.description
                      ? `${option.label}. ${option.description}`
                      : option.label
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={`min-h-[52px] justify-center rounded-sm border px-md py-[9px] active:opacity-70 ${
                    selected
                      ? "border-brand-primary bg-brand-socialSurface"
                      : "border-neutral-200 bg-neutral-0"
                  }`}
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  <View className="flex-row items-center">
                    <View
                      className={`h-[18px] w-[18px] items-center justify-center rounded-pill border ${
                        selected ? "border-brand-primary" : "border-neutral-300"
                      }`}
                    >
                      {selected ? (
                        <View className="h-[10px] w-[10px] rounded-pill bg-brand-primary" />
                      ) : null}
                    </View>
                    <Text className="ml-[10px] font-montserrat-semibold text-sm text-neutral-1000">
                      {option.label}
                    </Text>
                  </View>
                  {option.description ? (
                    <Text className="ml-[28px] mt-[3px] font-montserrat-regular text-xs text-neutral-600">
                      {option.description}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
