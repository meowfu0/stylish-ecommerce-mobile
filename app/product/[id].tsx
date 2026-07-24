import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { spacing } from "@/constants/design-tokens";
import { getTrendingCatalogProduct } from "@/constants/trending-products-data";

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const product = getTrendingCatalogProduct(id);
  const contentWidth = Math.min(480, width - spacing.md * 2);

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center px-md">
          <Text className="font-montserrat-semibold text-lg text-neutral-1000">
            Product not found
          </Text>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            className="mt-md rounded-sm bg-brand-primary px-lg py-sm active:opacity-70"
            onPress={() => router.back()}
          >
            <Text className="font-montserrat-semibold text-sm text-neutral-0">
              Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ alignItems: "center", paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="h-[56px] flex-row items-center"
          style={{ width: contentWidth }}
        >
          <Pressable
            accessibilityLabel="Back to trending products"
            accessibilityRole="button"
            className="rounded-sm px-xs py-sm active:opacity-60"
            hitSlop={8}
            onPress={() => router.back()}
          >
            <Text className="font-montserrat-semibold text-sm text-neutral-1000">
              Back
            </Text>
          </Pressable>
        </View>

        <Image
          accessibilityLabel={product.imageLabel}
          accessibilityRole="image"
          contentFit="cover"
          source={product.image}
          style={{
            borderRadius: 12,
            height: contentWidth,
            width: contentWidth,
          }}
          transition={120}
        />

        <View className="mt-lg" style={{ width: contentWidth }}>
          <Text
            accessibilityRole="header"
            className="font-montserrat-bold text-xl text-neutral-1000"
          >
            {product.title}
          </Text>
          <Text className="mt-xs font-montserrat-semibold text-lg text-brand-primary">
            {product.price}
          </Text>
          <Text className="mt-md font-montserrat-regular text-sm text-neutral-600">
            {product.description}
          </Text>
          <Text className="mt-md font-montserrat-regular text-xs text-neutral-475">
            {product.rating} out of 5 · {product.reviewCount} reviews
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
