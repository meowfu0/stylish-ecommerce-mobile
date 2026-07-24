import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  ScrollView,
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

import { FilterButton } from "@/components/catalog/filter-button";
import { SortButton } from "@/components/catalog/sort-button";
import { CategoryItem } from "@/components/home/category-item";
import { FigmaBanner } from "@/components/home/figma-banner";
import { FlatHeelsBanner } from "@/components/home/flat-heels-banner";
import { HomeHeader } from "@/components/home/home-header";
import { HomePromoBanner } from "@/components/home/home-promo-banner";
import { HomeSearchBar } from "@/components/home/home-search-bar";
import { NewArrivalsBanner } from "@/components/home/new-arrivals-banner";
import { ProductCard } from "@/components/home/product-card";
import { SectionHeader } from "@/components/home/section-header";
import { SponsoredOffer } from "@/components/home/sponsored-offer";
import { spacing } from "@/constants/design-tokens";
import {
  FEATURED_PRODUCTS,
  HOME_CATEGORIES,
  TRENDING_PRODUCTS,
} from "@/constants/home-data";

const FIGMA_FRAME = {
  contentWidth: 343,
} as const;

const SPECIAL_OFFER = require("@/assets/images/home/special-offer.png");

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const entranceProgress = useSharedValue(reduceMotion ? 1 : 0);

  const contentWidth = Math.min(
    FIGMA_FRAME.contentWidth,
    Math.max(0, width - spacing.md * 2),
  );

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

  const openSearch = () => router.push("/(tabs)/search");
  const openSettings = () => router.push("/(tabs)/settings");
  const openTrendingProducts = () => router.push("/(tabs)/wishlist");

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top"]}>
      <StatusBar style="dark" />

      <Animated.View style={[{ flex: 1 }, entranceStyle]}>
        <ScrollView
          accessibilityLabel="Stylish Home"
          className="flex-1 bg-neutral-50"
          contentContainerStyle={{ paddingBottom: spacing.md }}
          decelerationRate="normal"
          directionalLockEnabled
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          scrollsToTop
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-neutral-0">
            <HomeHeader
              onMenuPress={openSettings}
              onProfilePress={openSettings}
            />
          </View>

          <View className="items-center">
            <View className="mt-md">
              <HomeSearchBar onPress={openSearch} width={contentWidth} />
            </View>

            <View
              className="mt-md h-[24px] flex-row items-center justify-between"
              style={{ width: contentWidth }}
            >
              <Text
                accessibilityRole="header"
                className="font-montserrat-semibold text-action text-neutral-1000"
              >
                All Featured
              </Text>

              <View className="flex-row gap-[12px]">
                <SortButton onPress={openSearch} />
                <FilterButton onPress={openSearch} />
              </View>
            </View>

            <View
              className="mt-md h-[87px] overflow-hidden rounded-input bg-neutral-0 py-[8px]"
              style={{ width: contentWidth }}
            >
              <ScrollView
                accessibilityLabel="Product categories"
                contentContainerStyle={{
                  columnGap: spacing.md,
                  paddingHorizontal: spacing.xs,
                }}
                decelerationRate="normal"
                directionalLockEnabled
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
              >
                {HOME_CATEGORIES.map((category) => (
                  <CategoryItem
                    category={category}
                    key={category.id}
                    onPress={openSearch}
                  />
                ))}
              </ScrollView>
            </View>

            <View className="mt-md">
              <HomePromoBanner onShopNow={openSearch} width={contentWidth} />
            </View>

            <View className="mt-md">
              <SectionHeader
                onViewAll={openSearch}
                subtitle="22h 55m 20s remaining"
                title="Deal of the Day"
                tone="deal"
                width={contentWidth}
              />
            </View>

            <ScrollView
              accessibilityLabel="Deal of the Day products"
              contentContainerStyle={{ columnGap: spacing.sm }}
              decelerationRate="normal"
              directionalLockEnabled
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: spacing.md, width: contentWidth }}
            >
              {FEATURED_PRODUCTS.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ScrollView>

            <View className="mt-md">
              <FigmaBanner
                accessibilityHint="Opens special offers in Search"
                accessibilityLabel="Special offers"
                aspectRatio={343 / 84}
                image={SPECIAL_OFFER}
                onPress={openSearch}
                width={contentWidth}
              />
            </View>

            <View className="mt-md">
              <FlatHeelsBanner onVisitNow={openSearch} width={contentWidth} />
            </View>

            <View className="mt-md">
              <SectionHeader
                onViewAll={openTrendingProducts}
                subtitle="Last Date 29/02/22"
                title="Trending Products"
                tone="trending"
                width={contentWidth}
              />
            </View>

            <ScrollView
              accessibilityLabel="Trending products"
              contentContainerStyle={{ columnGap: spacing.md }}
              decelerationRate="normal"
              directionalLockEnabled
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: spacing.md, width: contentWidth }}
            >
              {TRENDING_PRODUCTS.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant="trending"
                />
              ))}
            </ScrollView>

            <View className="mt-md">
              <NewArrivalsBanner onViewAll={openSearch} width={contentWidth} />
            </View>

            <View className="mt-md">
              <SponsoredOffer onPress={openSearch} width={contentWidth} />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}
