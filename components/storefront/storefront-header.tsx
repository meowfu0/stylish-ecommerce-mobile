import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/design-tokens";

type HeaderIconName = ComponentProps<typeof MaterialIcons>["name"];

type HeaderActionProps = {
  accessibilityLabel: string;
  badge?: number;
  icon: HeaderIconName;
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
      className="h-[44px] w-[44px] items-center justify-center active:opacity-60"
      hitSlop={2}
      onPress={onPress}
    >
      <MaterialIcons color={colors.neutral[900]} name={icon} size={21} />
      {badge > 0 ? (
        <View className="absolute right-[1px] top-[1px] h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-brand-primary px-xxs">
          <Text className="font-montserrat-bold text-micro text-neutral-0">
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

type StorefrontHeaderProps = {
  cartQuantity: number;
  contentWidth: number;
  onAccountPress: () => void;
  onCartPress: () => void;
  onNewArrivalsPress: () => void;
  onSearchPress: () => void;
  onShopPress: () => void;
  onStoryPress: () => void;
  onTrendingPress: () => void;
  onWishlistPress: () => void;
};

export function StorefrontHeader({
  cartQuantity,
  contentWidth,
  onAccountPress,
  onCartPress,
  onNewArrivalsPress,
  onSearchPress,
  onShopPress,
  onStoryPress,
  onTrendingPress,
  onWishlistPress,
}: StorefrontHeaderProps) {
  const navigationItems = [
    { label: "New arrivals", onPress: onNewArrivalsPress },
    { label: "Shop", onPress: onShopPress },
    { label: "Trending", onPress: onTrendingPress },
    { label: "Our story", onPress: onStoryPress },
  ];

  return (
    <View className="items-center border-b border-neutral-200 bg-neutral-0">
      <View
        className="h-[88px] flex-row items-center justify-between"
        style={{ width: contentWidth }}
      >
        <View className="flex-1 flex-row items-center gap-[28px]">
          {navigationItems.map((item) => (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="link"
              className="min-h-[44px] justify-center active:opacity-60"
              key={item.label}
              onPress={item.onPress}
            >
              <Text className="font-montserrat-bold text-xs uppercase tracking-[1.4px] text-neutral-900">
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View
          accessibilityLabel="Stylish"
          accessibilityRole="header"
          className="absolute left-1/2"
          style={{ transform: [{ translateX: -65 }] }}
        >
          <Image
            accessible={false}
            contentFit="contain"
            source={require("@/assets/images/stylish-logo.svg")}
            style={{ height: 52, width: 130 }}
          />
        </View>

        <View className="flex-1 flex-row items-center justify-end gap-[4px]">
          <HeaderAction
            accessibilityLabel="Search products"
            icon="search"
            onPress={onSearchPress}
          />
          <HeaderAction
            accessibilityLabel="Open account"
            icon="person-outline"
            onPress={onAccountPress}
          />
          <HeaderAction
            accessibilityLabel="Open wishlist"
            icon="favorite-border"
            onPress={onWishlistPress}
          />
          <HeaderAction
            accessibilityLabel={`Open shopping cart, ${cartQuantity} ${cartQuantity === 1 ? "item" : "items"}`}
            badge={cartQuantity}
            icon="shopping-bag"
            onPress={onCartPress}
          />
        </View>
      </View>
    </View>
  );
}
