import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import {
  FlatList,
  Platform,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { CatalogProductCard } from "@/components/catalog/catalog-product-card";
import { FilterButton } from "@/components/catalog/filter-button";
import { SortButton } from "@/components/catalog/sort-button";
import { HomeHeader } from "@/components/home/home-header";
import { HomeSearchBar } from "@/components/home/home-search-bar";
import { spacing } from "@/constants/design-tokens";
import {
  TRENDING_CATALOG_PRODUCTS,
  type TrendingCatalogProduct,
} from "@/constants/trending-products-data";

const FIGMA_CONTENT_WIDTH = 343;
const COLUMN_GAP = spacing.md;
const PRODUCT_BANDS = [
  {
    id: "fashion-one",
    left: [
      { imageSize: "short", product: TRENDING_CATALOG_PRODUCTS[0] },
      { imageSize: "tall", product: TRENDING_CATALOG_PRODUCTS[2] },
    ],
    right: [
      { imageSize: "tall", product: TRENDING_CATALOG_PRODUCTS[1] },
      { imageSize: "short", product: TRENDING_CATALOG_PRODUCTS[3] },
    ],
  },
  {
    id: "fashion-two",
    left: [
      { imageSize: "short", product: TRENDING_CATALOG_PRODUCTS[4] },
      { imageSize: "tall", product: TRENDING_CATALOG_PRODUCTS[6] },
    ],
    right: [
      { imageSize: "tall", product: TRENDING_CATALOG_PRODUCTS[5] },
      { imageSize: "short", product: TRENDING_CATALOG_PRODUCTS[7] },
    ],
  },
  {
    id: "electronics-and-accessories",
    left: [
      { imageSize: "short", product: TRENDING_CATALOG_PRODUCTS[8] },
      { imageSize: "tall", product: TRENDING_CATALOG_PRODUCTS[10] },
    ],
    right: [
      { imageSize: "tall", product: TRENDING_CATALOG_PRODUCTS[9] },
      { imageSize: "short", product: TRENDING_CATALOG_PRODUCTS[11] },
    ],
  },
] as const;

type ProductBand = (typeof PRODUCT_BANDS)[number];

export default function TrendingProductsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const entranceProgress = useSharedValue(reduceMotion ? 1 : 0);
  const contentWidth = Math.min(
    FIGMA_CONTENT_WIDTH,
    Math.max(0, width - spacing.md * 2),
  );
  const horizontalInset = Math.max(spacing.md, (width - contentWidth) / 2);
  const cardWidth = (contentWidth - COLUMN_GAP) / 2;

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
    transform: [
      {
        translateY: interpolate(entranceProgress.value, [0, 1], [10, 0]),
      },
    ],
  }));

  useEffect(() => {
    entranceProgress.value = reduceMotion
      ? 1
      : withTiming(1, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        });
  }, [entranceProgress, reduceMotion]);

  const openSearch = useCallback(
    (mode?: "filter" | "sort") => {
      router.push({
        pathname: "/(tabs)/search",
        params: mode ? { mode } : undefined,
      });
    },
    [router],
  );

  const openSettings = useCallback(
    () => router.push("/(tabs)/settings"),
    [router],
  );

  const openProfile = useCallback(() => router.push("/profile"), [router]);

  const openProduct = useCallback(
    (product: TrendingCatalogProduct) => {
      router.push({
        pathname: "/(tabs)/product/[id]",
        params: { id: product.id },
      });
    },
    [router],
  );

  const renderProductBand = useCallback(
    ({ item }: { item: ProductBand }) => (
      <View
        className="flex-row"
        style={{
          columnGap: COLUMN_GAP,
          marginHorizontal: horizontalInset,
          width: contentWidth,
        }}
      >
        <View style={{ rowGap: COLUMN_GAP, width: cardWidth }}>
          {item.left.map((slot) => (
            <CatalogProductCard
              imageSize={slot.imageSize}
              key={slot.product.id}
              onPress={() => openProduct(slot.product)}
              product={slot.product}
              width={cardWidth}
            />
          ))}
        </View>
        <View style={{ rowGap: COLUMN_GAP, width: cardWidth }}>
          {item.right.map((slot) => (
            <CatalogProductCard
              imageSize={slot.imageSize}
              key={slot.product.id}
              onPress={() => openProduct(slot.product)}
              product={slot.product}
              width={cardWidth}
            />
          ))}
        </View>
      </View>
    ),
    [cardWidth, contentWidth, horizontalInset, openProduct],
  );

  const listHeader = (
    <View>
      <View className="bg-neutral-0">
          <HomeHeader
            onMenuPress={openSettings}
            onProfilePress={openProfile}
          />
      </View>

      <View className="items-center">
        <View className="mt-md">
          <HomeSearchBar onPress={() => openSearch()} width={contentWidth} />
        </View>

        <View
          className="mt-md h-[24px] flex-row items-center justify-between"
          style={{ width: contentWidth }}
        >
          <Text
            accessibilityRole="header"
            className="font-montserrat-semibold text-action text-neutral-1000"
          >
            52,082+ Items
          </Text>

          <View className="flex-row gap-[12px]">
            <SortButton onPress={() => openSearch("sort")} />
            <FilterButton onPress={() => openSearch("filter")} />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top"]}>
      <StatusBar style="dark" />

      <Animated.View style={[{ flex: 1 }, entranceStyle]}>
        <FlatList
          accessibilityLabel="Trending products"
          contentContainerStyle={{ paddingBottom: spacing.md }}
          data={PRODUCT_BANDS}
          decelerationRate="normal"
          initialNumToRender={2}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          ListHeaderComponent={listHeader}
          ListHeaderComponentStyle={{ marginBottom: spacing.md }}
          maxToRenderPerBatch={2}
          removeClippedSubviews={Platform.OS !== "web"}
          renderItem={renderProductBand}
          scrollsToTop
          showsVerticalScrollIndicator={false}
          updateCellsBatchingPeriod={40}
          windowSize={7}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
