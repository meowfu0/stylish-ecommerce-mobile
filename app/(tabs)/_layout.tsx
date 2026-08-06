import { Tabs } from "expo-router";

import { HomeTabBar } from "@/components/home/home-tab-bar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <HomeTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="wishlist" options={{ title: "Wishlist" }} />
      <Tabs.Screen name="cart" options={{ title: "Cart" }} />
      <Tabs.Screen
        name="product/[id]"
        options={{ animation: "fade", href: null, title: "Product Details" }}
      />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="settings" options={{ title: "Setting" }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
