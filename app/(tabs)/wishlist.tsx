import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import { ScrollReveal } from "@/components/animated/scroll-reveal";
import { CatalogFilterChips } from "@/components/catalog/catalog-filter-chips";
import { CatalogProductCard } from "@/components/catalog/catalog-product-card";
import { FilterButton } from "@/components/catalog/filter-button";
import { ProductFilterSheet } from "@/components/catalog/product-filter-sheet";
import { ProductOptionsSheet } from "@/components/catalog/product-options-sheet";
import { SortButton } from "@/components/catalog/sort-button";
import { HomeHeader } from "@/components/home/home-header";
import { HomeSearchBar } from "@/components/home/home-search-bar";
import {
  applyCatalogProductOptions,
  CATALOG_SORT_OPTIONS,
  cloneCatalogFilters,
  EMPTY_CATALOG_FILTERS,
  getActiveCatalogFilterCount,
  getCatalogFilterChips,
  removeCatalogFilterChip,
  type CatalogFilterChip,
  type CatalogFilterState,
  type CatalogSort,
} from "@/constants/catalog-options";
import { spacing } from "@/constants/design-tokens";
import {
  getResponsiveContentWidth,
  isDesktopWeb,
} from "@/constants/responsive";
import {
  TRENDING_CATALOG_PRODUCTS,
  type TrendingCatalogProduct,
} from "@/constants/trending-products-data";

const FIGMA_CONTENT_WIDTH = 343;
const COLUMN_GAP = spacing.md;
const PRODUCTS_PER_BAND = 4;

type ActiveProductOptionsSheet = "filter" | "sort" | null;
type ProductImageSize = "short" | "tall";
type ProductSlot = {
  imageSize: ProductImageSize;
  product: TrendingCatalogProduct;
};
type ProductBand = {
  id: string;
  left: ProductSlot[];
  right: ProductSlot[];
  slots: ProductSlot[];
};

const PRODUCT_IMAGE_SIZES: Record<string, ProductImageSize> = {
  "black-dress": "tall",
  "black-jacket": "tall",
  "black-winter-hoodie": "short",
  "denim-dress": "tall",
  "flare-dress": "short",
  "jordan-stay": "tall",
  "mens-formal-shoes": "short",
  "mens-starry-shirt": "tall",
  "nikon-d7200": "tall",
  "pink-embroidered-dress": "short",
  "realme-7": "short",
  "sony-ps4": "short",
};

function createProductBands(
  products: readonly TrendingCatalogProduct[],
): ProductBand[] {
  const bands: ProductBand[] = [];

  for (let index = 0; index < products.length; index += PRODUCTS_PER_BAND) {
    const slots = products
      .slice(index, index + PRODUCTS_PER_BAND)
      .map((product) => ({
        imageSize: PRODUCT_IMAGE_SIZES[product.id] ?? "short",
        product,
      }));

    bands.push({
      id: `wishlist-products-${index}`,
      left: slots.filter((_, slotIndex) => slotIndex % 2 === 0),
      right: slots.filter((_, slotIndex) => slotIndex % 2 === 1),
      slots,
    });
  }

  return bands;
}

export default function TrendingProductsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeOptionsSheet, setActiveOptionsSheet] =
    useState<ActiveProductOptionsSheet>(null);
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilterState>(() =>
    cloneCatalogFilters(EMPTY_CATALOG_FILTERS),
  );
  const [productSort, setProductSort] = useState<CatalogSort>("recommended");
  const reduceMotion = useReducedMotion();
  const entranceProgress = useSharedValue(reduceMotion ? 1 : 0);
  const desktopWeb = isDesktopWeb(width);
  const contentWidth = getResponsiveContentWidth({
    mobileMax: FIGMA_CONTENT_WIDTH,
    width,
  });
  const horizontalInset = Math.max(spacing.md, (width - contentWidth) / 2);
  const cardWidth = desktopWeb
    ? (contentWidth - spacing.lg * 3) / 4
    : (contentWidth - COLUMN_GAP) / 2;
  const searchWidth = desktopWeb ? Math.min(720, contentWidth) : contentWidth;
  const visibleProducts = useMemo(
    () =>
      applyCatalogProductOptions(
        TRENDING_CATALOG_PRODUCTS,
        productSort,
        catalogFilters,
      ),
    [catalogFilters, productSort],
  );
  const productBands = useMemo(
    () => createProductBands(visibleProducts),
    [visibleProducts],
  );
  const activeFilterCount = getActiveCatalogFilterCount(catalogFilters);
  const activeFilterChips = useMemo(
    () => getCatalogFilterChips(catalogFilters),
    [catalogFilters],
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

  const openSearch = useCallback(
    (query?: string) => {
      router.push({
        pathname: "/(tabs)/search",
        params: query ? { query: query.trim() } : undefined,
      });
    },
    [router],
  );

  const getMatchingProductCount = useCallback(
    (filters: CatalogFilterState) =>
      applyCatalogProductOptions(
        TRENDING_CATALOG_PRODUCTS,
        productSort,
        filters,
      ).length,
    [productSort],
  );

  const removeActiveFilter = useCallback((chip: CatalogFilterChip) => {
    setCatalogFilters((currentFilters) =>
      removeCatalogFilterChip(currentFilters, chip),
    );
  }, []);

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
    ({ item }: { item: ProductBand }) => {
      if (desktopWeb) {
        const slots = [...item.left, ...item.right];

        return (
          <View
            className="flex-row"
            style={{
              columnGap: spacing.lg,
              marginHorizontal: horizontalInset,
              width: contentWidth,
            }}
          >
            {slots.map((slot, index) => (
              <ScrollReveal
                key={slot.product.id}
                staggerIndex={index}
                style={{ width: cardWidth }}
              >
                <CatalogProductCard
                  imageSize={slot.imageSize}
                  onPress={() => openProduct(slot.product)}
                  product={slot.product}
                  width={cardWidth}
                />
              </ScrollReveal>
            ))}
          </View>
        );
      }

      return (
        <View
          className="flex-row"
          style={{
            columnGap: COLUMN_GAP,
            marginHorizontal: horizontalInset,
            width: contentWidth,
          }}
        >
          <View style={{ rowGap: COLUMN_GAP, width: cardWidth }}>
            {item.left.map((slot, index) => (
              <ScrollReveal
                key={slot.product.id}
                staggerIndex={index}
                style={{ width: cardWidth }}
              >
                <CatalogProductCard
                  imageSize={slot.imageSize}
                  onPress={() => openProduct(slot.product)}
                  product={slot.product}
                  width={cardWidth}
                />
              </ScrollReveal>
            ))}
          </View>
          <View style={{ rowGap: COLUMN_GAP, width: cardWidth }}>
            {item.right.map((slot, index) => (
              <ScrollReveal
                key={slot.product.id}
                staggerIndex={index + item.left.length}
                style={{ width: cardWidth }}
              >
                <CatalogProductCard
                  imageSize={slot.imageSize}
                  onPress={() => openProduct(slot.product)}
                  product={slot.product}
                  width={cardWidth}
                />
              </ScrollReveal>
            ))}
          </View>
        </View>
      );
    },
    [cardWidth, contentWidth, desktopWeb, horizontalInset, openProduct],
  );

  const listHeader = (
    <View>
      <View className="bg-neutral-0">
        <HomeHeader onMenuPress={openSettings} onProfilePress={openProfile} />
      </View>

      <View className="items-center">
        <View className={desktopWeb ? "mt-lg" : "mt-md"}>
          <HomeSearchBar
            onChangeText={setSearchQuery}
            onSubmitEditing={() => openSearch(searchQuery)}
            value={searchQuery}
            width={searchWidth}
          />
        </View>

        <View
          className="mt-md min-h-[52px] flex-row items-center justify-between"
          style={{ width: contentWidth }}
        >
          <View>
            <Text
              accessibilityRole="header"
              className={`font-montserrat-semibold text-neutral-1000 ${
                desktopWeb ? "text-xl" : "text-action"
              }`}
            >
              Trending Products
            </Text>
            {desktopWeb ? (
              <Text className="mt-xxs font-montserrat-regular text-xs text-neutral-500">
                {visibleProducts.length === TRENDING_CATALOG_PRODUCTS.length
                  ? "52,082+ pieces curated for you"
                  : `${visibleProducts.length} matching ${
                      visibleProducts.length === 1 ? "product" : "products"
                    }`}
              </Text>
            ) : null}
          </View>

          <View className="flex-row gap-[12px]">
            <SortButton
              active={productSort !== "recommended"}
              onPress={() => setActiveOptionsSheet("sort")}
            />
            <FilterButton
              active={activeFilterCount > 0}
              count={activeFilterCount}
              onPress={() => setActiveOptionsSheet("filter")}
            />
          </View>
        </View>

        {activeFilterChips.length > 0 ? (
          <View className="mt-sm" style={{ width: contentWidth }}>
            <CatalogFilterChips
              chips={activeFilterChips}
              onRemove={removeActiveFilter}
            />
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top"]}>
      <StatusBar style="dark" />

      <Animated.View style={[{ flex: 1 }, entranceStyle]}>
        <FlatList
          accessibilityLabel="Trending products"
          contentContainerStyle={{
            paddingBottom: desktopWeb ? spacing.xxl : spacing.md,
          }}
          data={productBands}
          decelerationRate="normal"
          initialNumToRender={2}
          ItemSeparatorComponent={() => (
            <View style={{ height: desktopWeb ? spacing.lg : spacing.md }} />
          )}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          ListHeaderComponent={listHeader}
          ListHeaderComponentStyle={{ marginBottom: spacing.md }}
          ListEmptyComponent={
            <View
              className="min-h-[240px] items-center justify-center px-lg"
              style={{
                marginHorizontal: horizontalInset,
                width: contentWidth,
              }}
            >
              <Text className="text-center font-montserrat-semibold text-lg text-neutral-1000">
                No products match these filters
              </Text>
              <Text className="mt-xs text-center font-montserrat-regular text-sm text-neutral-550">
                Remove a filter or choose Clear All to see every product.
              </Text>
            </View>
          }
          maxToRenderPerBatch={2}
          removeClippedSubviews={Platform.OS !== "web"}
          renderItem={renderProductBand}
          scrollsToTop
          showsVerticalScrollIndicator={false}
          updateCellsBatchingPeriod={40}
          windowSize={7}
        />
      </Animated.View>

      <ProductOptionsSheet
        onClose={() => setActiveOptionsSheet(null)}
        onSelect={setProductSort}
        options={CATALOG_SORT_OPTIONS}
        selectedValue={productSort}
        title="Sort Products"
        visible={activeOptionsSheet === "sort"}
      />
      <ProductFilterSheet
        filters={catalogFilters}
        getMatchingCount={getMatchingProductCount}
        onApply={setCatalogFilters}
        onClose={() => setActiveOptionsSheet(null)}
        visible={activeOptionsSheet === "filter"}
      />
    </SafeAreaView>
  );
}
