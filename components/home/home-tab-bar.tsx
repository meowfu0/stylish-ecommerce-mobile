import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/design-tokens";
import {
  selectCartQuantity,
  useCartStore,
} from "@/stores/cart-store";

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
] as const;

export function HomeTabBar({
  navigation,
  state,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabHeight = 58 + insets.bottom;
  const cartRoute = state.routes.find((route) => route.name === "cart");
  const cartRouteIndex = cartRoute ? state.routes.indexOf(cartRoute) : -1;
  const cartFocused = state.index === cartRouteIndex;
  const activeRouteName = state.routes[state.index]?.name;
  const cartHighlighted =
    cartFocused || activeRouteName === "product/[id]";
  const cartQuantity = useCartStore(selectCartQuantity);

  const renderTab = (item: (typeof TAB_ITEMS)[number]) => {
    const route = state.routes.find((candidate) => candidate.name === item.route);
    if (!route) {
      return null;
    }

    const routeIndex = state.routes.indexOf(route);
    const focused = state.index === routeIndex;
    const tintColor = focused ? colors.brand.primary : colors.neutral[1000];

    const openTab = () => {
      const event = navigation.emit({
        canPreventDefault: true,
        target: route.key,
        type: "tabPress",
      });

      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    return (
      <Pressable
        accessibilityLabel={item.label}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        className="h-[58px] flex-1 items-center justify-center active:opacity-60"
        key={item.route}
        onLongPress={() =>
          navigation.emit({ target: route.key, type: "tabLongPress" })
        }
        onPress={openTab}
      >
        <Image
          accessible={false}
          contentFit="contain"
          source={item.icon}
          style={{ height: 24, tintColor, width: 24 }}
        />
        <Text
          className="mt-[2px] font-sans text-xs"
          style={{ color: tintColor }}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  const openCart = () => {
    if (!cartRoute) {
      return;
    }

    const event = navigation.emit({
      canPreventDefault: true,
      target: cartRoute.key,
      type: "tabPress",
    });

    if (!cartFocused && !event.defaultPrevented) {
      navigation.navigate(cartRoute.name, cartRoute.params);
    }
  };

  return (
    <View
      className="flex-row bg-neutral-0 shadow-lg"
      style={{ height: tabHeight, paddingBottom: insets.bottom }}
    >
      {renderTab(TAB_ITEMS[0])}
      {renderTab(TAB_ITEMS[1])}

      <Pressable
        accessibilityLabel="Shopping cart"
        accessibilityRole="tab"
        accessibilityState={{ selected: cartHighlighted }}
        className="h-[58px] flex-1 items-center"
        disabled={!cartRoute}
        onLongPress={() => {
          if (cartRoute) {
            navigation.emit({
              target: cartRoute.key,
              type: "tabLongPress",
            });
          }
        }}
        onPress={openCart}
      >
        <View
          className="-mt-[6px] h-[56px] w-[56px] items-center justify-center rounded-pill shadow-lg active:opacity-60"
          style={{
            backgroundColor: cartHighlighted
              ? colors.brand.primary
              : colors.neutral[0],
          }}
        >
          <Image
            accessible={false}
            contentFit="contain"
            source={require("@/assets/icons/home/nav-cart.svg")}
            style={{
              height: 24,
              tintColor: cartHighlighted
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
        </View>
      </Pressable>

      {renderTab(TAB_ITEMS[2])}
      {renderTab(TAB_ITEMS[3])}
    </View>
  );
}
