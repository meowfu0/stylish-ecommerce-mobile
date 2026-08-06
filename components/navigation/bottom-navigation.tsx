import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/design-tokens";

export type BottomNavigationRoute =
  "cart" | "home" | "search" | "settings" | "wishlist";

type BottomNavigationProps = {
  activeRoute: BottomNavigationRoute;
  cartQuantity?: number;
  onLongPress?: (route: BottomNavigationRoute) => void;
  onNavigate: (route: BottomNavigationRoute) => void;
};

const TAB_ITEMS = [
  {
    icon: require("@/assets/icons/home/nav-heart.svg"),
    label: "Home",
    route: "home",
  },
  {
    icon: require("@/assets/icons/home/nav-settings.svg"),
    label: "Wishlist",
    route: "wishlist",
  },
  {
    icon: require("@/assets/icons/home/nav-home.svg"),
    label: "Search",
    route: "search",
  },
  {
    icon: require("@/assets/icons/home/nav-search.svg"),
    label: "Setting",
    route: "settings",
  },
] as const satisfies readonly {
  icon: number;
  label: string;
  route: Exclude<BottomNavigationRoute, "cart">;
}[];

export function BottomNavigation({
  activeRoute,
  cartQuantity = 0,
  onLongPress,
  onNavigate,
}: BottomNavigationProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabHeight = 58 + insets.bottom;
  const webClientWidth =
    Platform.OS === "web" && typeof document !== "undefined"
      ? document.documentElement.clientWidth
      : undefined;

  const renderTab = (item: (typeof TAB_ITEMS)[number]) => {
    const selected = activeRoute === item.route;
    const tintColor = selected ? colors.brand.primary : colors.neutral[1000];

    return (
      <Pressable
        accessibilityLabel={item.label}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        className="h-[58px] flex-1 items-center justify-center active:opacity-60"
        key={item.route}
        onLongPress={() => onLongPress?.(item.route)}
        onPress={() => onNavigate(item.route)}
      >
        <Image
          accessible={false}
          contentFit="contain"
          source={item.icon}
          style={{ height: 24, tintColor, width: 24 }}
        />
        <Text
          className="mt-[2px] font-montserrat-medium text-xs"
          style={{ color: tintColor }}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-t border-neutral-200 bg-neutral-0 shadow-lg"
      style={{
        alignSelf: "center",
        height: tabHeight,
        paddingBottom: insets.bottom,
        width: webClientWidth,
      }}
    >
      {renderTab(TAB_ITEMS[0])}
      {renderTab(TAB_ITEMS[1])}

      <View className="h-[58px] flex-1 items-center">
        <Pressable
          accessibilityHint="Opens your shopping cart"
          accessibilityLabel="Shopping cart"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeRoute === "cart" }}
          className="-mt-[6px] h-[56px] w-[56px] items-center justify-center rounded-pill shadow-lg active:opacity-60"
          hitSlop={10}
          onLongPress={() => onLongPress?.("cart")}
          onPress={() => router.push("/(tabs)/cart")}
          style={{
            backgroundColor:
              activeRoute === "cart" ? colors.brand.cart : colors.neutral[0],
          }}
        >
          <Image
            accessible={false}
            contentFit="contain"
            source={require("@/assets/icons/home/nav-cart.svg")}
            style={{
              height: 24,
              tintColor:
                activeRoute === "cart"
                  ? colors.neutral[0]
                  : colors.neutral[1000],
              width: 24,
            }}
          />
          {cartQuantity > 0 ? (
            <View className="absolute right-[2px] top-[2px] h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-brand-discount px-[4px]">
              <Text className="font-montserrat-bold text-micro text-neutral-0">
                {cartQuantity > 99 ? "99+" : cartQuantity}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {renderTab(TAB_ITEMS[2])}
      {renderTab(TAB_ITEMS[3])}
    </View>
  );
}
