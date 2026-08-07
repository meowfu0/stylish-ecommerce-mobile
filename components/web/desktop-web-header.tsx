import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { VeloriLogo } from "@/components/brand/velori-logo";
import { colors } from "@/constants/design-tokens";
import { selectCartQuantity, useCartStore } from "@/stores/cart-store";

type HeaderActionProps = {
  accessibilityLabel: string;
  badge?: number;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
};

function HeaderAction({
  accessibilityLabel,
  badge = 0,
  icon,
  onPress,
}: HeaderActionProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className="relative h-[44px] w-[44px] items-center justify-center rounded-pill active:bg-neutral-100"
      onPress={onPress}
      style={{ cursor: "pointer" }}
    >
      <MaterialIcons color={colors.neutral[900]} name={icon} size={21} />
      {badge > 0 ? (
        <View className="absolute right-0 top-0 h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-brand-primary px-xxs">
          <Text className="font-montserrat-bold text-micro text-neutral-0">
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function DesktopWebHeader() {
  const router = useRouter();
  const cartQuantity = useCartStore(selectCartQuantity);

  const navigationItems = [
    {
      label: "New arrivals",
      onPress: () =>
        router.push({
          pathname: "/(tabs)/search",
          params: { query: "new arrivals" },
        }),
    },
    { label: "Shop", onPress: () => router.push("/(tabs)/search") },
    { label: "Trending", onPress: () => router.push("/(tabs)/wishlist") },
    { label: "Settings", onPress: () => router.push("/(tabs)/settings") },
  ];

  return (
    <View className="border-b border-neutral-200 bg-neutral-0">
      <View className="h-[32px] items-center justify-center bg-brand-primary px-lg">
        <Text className="font-montserrat-bold text-micro uppercase tracking-[1.5px] text-neutral-0">
          Free shipping on orders over ₱3,000 · Easy 30-day returns
        </Text>
      </View>

      <View className="mx-auto h-[76px] w-full max-w-[1280px] flex-row items-center justify-between px-xl">
        <View className="flex-1 flex-row items-center gap-[28px]">
          {navigationItems.map((item) => (
            <Pressable
              accessibilityRole="link"
              className="min-h-[44px] justify-center active:opacity-60"
              key={item.label}
              onPress={item.onPress}
              style={{ cursor: "pointer" }}
            >
              <Text className="font-montserrat-bold text-xs uppercase tracking-[1.3px] text-neutral-900">
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityLabel="Open Velori home"
          accessibilityRole="link"
          className="absolute left-1/2 active:opacity-70"
          onPress={() => router.push("/(tabs)/home")}
          style={{
            cursor: "pointer",
            transform: [{ translateX: -65 }],
          }}
        >
          <VeloriLogo width={130} />
        </Pressable>

        <View className="flex-1 flex-row items-center justify-end gap-xs">
          <HeaderAction
            accessibilityLabel="Search products"
            icon="search"
            onPress={() => router.push("/(tabs)/search")}
          />
          <HeaderAction
            accessibilityLabel="Open wishlist"
            icon="favorite-border"
            onPress={() => router.push("/(tabs)/wishlist")}
          />
          <HeaderAction
            accessibilityLabel="Open profile"
            icon="person-outline"
            onPress={() => router.push("/profile")}
          />
          <HeaderAction
            accessibilityLabel={`Open shopping cart, ${cartQuantity} items`}
            badge={cartQuantity}
            icon="shopping-bag"
            onPress={() => router.push("/(tabs)/cart")}
          />
        </View>
      </View>
    </View>
  );
}
