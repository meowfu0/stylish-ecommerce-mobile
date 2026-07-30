import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Platform, useWindowDimensions } from "react-native";

import {
  BottomNavigation,
  type BottomNavigationRoute,
} from "@/components/navigation/bottom-navigation";
import { selectCartQuantity, useCartStore } from "@/stores/cart-store";

export function HomeTabBar({ navigation, state }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const cartQuantity = useCartStore(selectCartQuantity);
  const activeRouteName = state.routes[state.index]?.name;
  const activeRoute: BottomNavigationRoute =
    activeRouteName === "product/[id]"
      ? "cart"
      : activeRouteName === "home" ||
          activeRouteName === "wishlist" ||
          activeRouteName === "cart" ||
          activeRouteName === "search" ||
          activeRouteName === "settings"
        ? activeRouteName
        : "home";

  const findRoute = (routeName: BottomNavigationRoute) =>
    state.routes.find((route) => route.name === routeName);

  const openRoute = (routeName: BottomNavigationRoute) => {
    const route = findRoute(routeName);
    if (!route) {
      return;
    }

    const focused = state.routes[state.index]?.key === route.key;
    const event = navigation.emit({
      canPreventDefault: true,
      target: route.key,
      type: "tabPress",
    });

    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const longPressRoute = (routeName: BottomNavigationRoute) => {
    const route = findRoute(routeName);
    if (route) {
      navigation.emit({
        target: route.key,
        type: "tabLongPress",
      });
    }
  };

  if (Platform.OS === "web" && width >= 1024) {
    return null;
  }

  return (
    <BottomNavigation
      activeRoute={activeRoute}
      cartQuantity={cartQuantity}
      onLongPress={longPressRoute}
      onNavigate={openRoute}
    />
  );
}
