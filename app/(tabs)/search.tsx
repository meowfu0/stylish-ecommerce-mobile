import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScrollReveal } from "@/components/animated/scroll-reveal";
import { CatalogProductCard } from "@/components/catalog/catalog-product-card";
import { HomeHeader } from "@/components/home/home-header";
import { HomeSearchBar } from "@/components/home/home-search-bar";
import { spacing } from "@/constants/design-tokens";
import {
  getResponsiveContentWidth,
  isDesktopWeb,
} from "@/constants/responsive";
import { filterSearchableProducts } from "@/constants/search-data";

const FIGMA_CONTENT_WIDTH = 343;

export default function SearchScreen() {
  const router = useRouter();
  const { query } = useLocalSearchParams<{
    query?: string | string[];
  }>();
  const { width } = useWindowDimensions();
  const routeQuery = Array.isArray(query) ? query[0] : query;
  const [searchQuery, setSearchQuery] = useState(routeQuery ?? "");
  const desktopWeb = isDesktopWeb(width);
  const contentWidth = getResponsiveContentWidth({
    mobileMax: FIGMA_CONTENT_WIDTH,
    width,
  });
  const horizontalInset = Math.max(spacing.md, (width - contentWidth) / 2);
  const columnCount = desktopWeb ? 4 : 2;
  const columnGap = desktopWeb ? spacing.lg : spacing.md;
  const cardWidth =
    (contentWidth - columnGap * (columnCount - 1)) / columnCount;
  const searchWidth = desktopWeb ? Math.min(720, contentWidth) : contentWidth;
  const products = useMemo(
    () => filterSearchableProducts(searchQuery),
    [searchQuery],
  );

  useEffect(() => {
    setSearchQuery(routeQuery ?? "");
  }, [routeQuery]);

  const openProduct = (id: string) => {
    router.push({
      pathname: "/(tabs)/product/[id]",
      params: { id },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top"]}>
      <StatusBar style="dark" />

      <View className="bg-neutral-0">
        <HomeHeader
          onMenuPress={() => router.push("/(tabs)/settings")}
          onProfilePress={() => router.push("/profile")}
        />
      </View>

      <View className="items-center pb-lg pt-md">
        <View>
          <HomeSearchBar
            autoFocus
            onChangeText={setSearchQuery}
            value={searchQuery}
            width={searchWidth}
          />
        </View>

        <View
          className="mt-md flex-row items-center justify-between"
          style={{ width: contentWidth }}
        >
          <Text
            accessibilityRole="header"
            className="font-montserrat-semibold text-action text-neutral-1000"
          >
            {searchQuery.trim()
              ? `${products.length} Results`
              : `${products.length} Products`}
          </Text>
        </View>
      </View>

      <FlatList
        accessibilityLabel="Product search results"
        columnWrapperStyle={{ columnGap }}
        contentContainerStyle={{
          flexGrow: products.length === 0 ? 1 : undefined,
          paddingBottom: desktopWeb ? spacing.xxl : spacing.md,
          paddingHorizontal: horizontalInset,
        }}
        data={products}
        initialNumToRender={desktopWeb ? 12 : 6}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        key={`search-${columnCount}`}
        keyExtractor={(product) => product.id}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-lg">
            <Text className="text-center font-montserrat-semibold text-lg text-neutral-1000">
              No products found
            </Text>
            <Text className="mt-xs text-center font-montserrat-regular text-sm text-neutral-550">
              Try a different product name or keyword.
            </Text>
          </View>
        }
        numColumns={columnCount}
        renderItem={({ index, item }) => (
          <ScrollReveal
            staggerIndex={index % columnCount}
            style={{ marginBottom: spacing.md }}
          >
            <CatalogProductCard
              imageSize="short"
              onPress={() => openProduct(item.id)}
              product={item}
              width={cardWidth}
            />
          </ScrollReveal>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
