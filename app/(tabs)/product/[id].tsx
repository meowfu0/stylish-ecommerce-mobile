import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  Pressable,
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

import { CatalogProductCard } from "@/components/catalog/catalog-product-card";
import { FilterButton } from "@/components/catalog/filter-button";
import { SortButton } from "@/components/catalog/sort-button";
import { ProductActionButtons } from "@/components/product-details/product-action-buttons";
import { ProductGallery } from "@/components/product-details/product-gallery";
import { SizeSelector } from "@/components/product-details/size-selector";
import { spacing } from "@/constants/design-tokens";
import {
  formatPhilippinePeso,
  getProductDetails,
  SIMILAR_PRODUCTS,
} from "@/constants/product-details-data";
import {
  selectCartQuantity,
  useCartStore,
} from "@/stores/cart-store";

const FIGMA_CONTENT_WIDTH = 343;
const FILLED_STAR = require("@/assets/icons/home/product-3.svg");
const EMPTY_STAR = require("@/assets/icons/home/product-9.svg");

type ServiceChipProps = {
  icon: number;
  label: string;
};

function ServiceChip({ icon, label }: ServiceChipProps) {
  return (
    <View className="h-[24px] flex-row items-center rounded-[4px] border border-neutral-475 bg-neutral-50 px-[4px]">
      <Image
        accessible={false}
        contentFit="contain"
        source={icon}
        style={{ height: 16, width: 16 }}
      />
      <Text className="ml-[4px] font-montserrat-medium text-micro text-neutral-475">
        {label}
      </Text>
    </View>
  );
}

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const entranceProgress = useSharedValue(reduceMotion ? 1 : 0);
  const scrollRef = useRef<ScrollView>(null);
  const routeId = Array.isArray(id) ? id[0] : id;
  const product = getProductDetails(routeId);
  const [selectedSize, setSelectedSize] = useState("7 UK");
  const [addedToCart, setAddedToCart] = useState(false);
  const [isCompared, setIsCompared] = useState(false);
  const [similarSectionY, setSimilarSectionY] = useState(0);
  const addItem = useCartStore((state) => state.addItem);
  const cartQuantity = useCartStore(selectCartQuantity);
  const contentWidth = Math.min(
    FIGMA_CONTENT_WIDTH,
    Math.max(0, width - spacing.md * 2),
  );
  const similarCardWidth = Math.max(
    132,
    (contentWidth - spacing.md) / 2,
  );
  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100,
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

  const addToCart = () => {
    addItem({
      id: product.id,
      image: product.gallery[0].image,
      price: product.price,
      size: selectedSize,
      title: product.title,
    });
    setAddedToCart(true);
  };

  const buyNow = () => {
    router.push({
      pathname: "/checkout",
      params: { productId: product.id, size: selectedSize },
    });
  };

  const openSimilarProduct = (productId: string) => {
    router.push({
      pathname: "/(tabs)/product/[id]",
      params: { id: productId },
    });
  };

  const openSearchMode = (mode: "filter" | "sort") => {
    router.push({
      pathname: "/(tabs)/search",
      params: { mode },
    });
  };

  const captureSimilarPosition = (event: LayoutChangeEvent) => {
    setSimilarSectionY(event.nativeEvent.layout.y);
  };

  const scrollToSimilar = () => {
    scrollRef.current?.scrollTo({
      animated: true,
      y: Math.max(0, similarSectionY - spacing.sm),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top"]}>
      <StatusBar style="dark" />

      <Animated.View style={[{ flex: 1 }, entranceStyle]}>
        <View className="h-[56px] items-center justify-center">
          <View
            className="h-[56px] flex-row items-center justify-between"
            style={{ width: contentWidth }}
          >
            <Pressable
              accessibilityHint="Returns to the previous screen"
              accessibilityLabel="Go back"
              accessibilityRole="button"
              className="h-[44px] w-[44px] items-start justify-center active:opacity-60"
              hitSlop={4}
              onPress={() => router.back()}
            >
              <Image
                accessible={false}
                contentFit="contain"
                source={require("@/assets/icons/product-details/back.svg")}
                style={{ height: 20, width: 20 }}
              />
            </Pressable>

            <Pressable
              accessibilityHint="Opens your shopping cart"
              accessibilityLabel={`Shopping cart, ${cartQuantity} ${cartQuantity === 1 ? "item" : "items"}`}
              accessibilityRole="button"
              className="h-[40px] w-[40px] items-center justify-center rounded-pill bg-neutral-200 active:opacity-70"
              hitSlop={4}
              onPress={() => router.push("/(tabs)/cart")}
            >
              <Image
                accessible={false}
                contentFit="contain"
                source={require("@/assets/icons/product-details/cart.svg")}
                style={{ height: 20, width: 20 }}
              />
              {cartQuantity > 0 ? (
                <View className="absolute -right-[2px] -top-[2px] h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-brand-primary px-[4px]">
                  <Text className="font-montserrat-bold text-micro text-neutral-0">
                    {cartQuantity > 99 ? "99+" : cartQuantity}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        <ScrollView
          accessibilityLabel={`${product.title} product details`}
          className="flex-1"
          contentContainerStyle={{
            alignItems: "center",
            paddingBottom: spacing.lg,
          }}
          decelerationRate="normal"
          directionalLockEnabled
          keyboardDismissMode="on-drag"
          ref={scrollRef}
          scrollsToTop
          showsVerticalScrollIndicator={false}
        >
          <ProductGallery images={product.gallery} width={contentWidth} />

          <View className="mt-md" style={{ width: contentWidth }}>
            <Text className="font-montserrat-semibold text-sm text-neutral-1000">
              Size: {selectedSize.replace(" ", "")}
            </Text>
            <View className="mt-[12px]">
              <SizeSelector
                onChange={(size) => {
                  setSelectedSize(size);
                  setAddedToCart(false);
                }}
                options={product.sizes}
                selectedSize={selectedSize}
              />
            </View>

            <Text
              accessibilityRole="header"
              className="mt-md font-montserrat-semibold text-lg text-neutral-1000"
            >
              {product.title}
            </Text>
            <Text className="mt-[4px] font-montserrat-regular text-xs text-neutral-1000">
              {product.subtitle}
            </Text>

            <View
              accessible
              accessibilityLabel={`${product.rating} out of 5 stars from ${product.reviewCount} reviews`}
              className="mt-[8px] flex-row items-center"
            >
              {[0, 1, 2, 3, 4].map((index) => (
                <Image
                  accessible={false}
                  contentFit="contain"
                  key={index}
                  source={index < product.rating ? FILLED_STAR : EMPTY_STAR}
                  style={{ height: 18, width: 18 }}
                />
              ))}
              <Text className="ml-[8px] font-montserrat-medium text-sm text-neutral-475">
                {product.reviewCount}
              </Text>
            </View>

            <View className="mt-[8px] flex-row items-center">
              <Text className="font-montserrat-regular text-sm text-neutral-475 line-through">
                {formatPhilippinePeso(product.originalPrice)}
              </Text>
              <Text className="ml-[12px] font-montserrat-medium text-sm text-neutral-1000">
                {formatPhilippinePeso(product.price)}
              </Text>
              <Text className="ml-[8px] font-montserrat-semibold text-sm text-brand-trending">
                {discount}% Off
              </Text>
            </View>

            <Text className="mt-[8px] font-montserrat-medium text-sm text-neutral-1000">
              Product Details
            </Text>
            <Text className="mt-[4px] font-montserrat-regular text-xs text-neutral-1000">
              {product.description}
              <Text className="text-brand-trending"> More</Text>
            </Text>

            <View className="mt-[8px] flex-row flex-wrap gap-[8px]">
              <ServiceChip
                icon={require("@/assets/icons/product-details/store.svg")}
                label="Nearest Store"
              />
              <ServiceChip
                icon={require("@/assets/icons/product-details/vip.svg")}
                label="VIP"
              />
              <ServiceChip
                icon={require("@/assets/icons/product-details/return.svg")}
                label="Return policy"
              />
            </View>

            <View className="mt-[12px]">
              <ProductActionButtons
                addedToCart={addedToCart}
                onAddToCart={addToCart}
                onBuyNow={buyNow}
              />
            </View>
          </View>

          <View
            className="mt-[12px] h-[60px] justify-center rounded-md bg-brand-delivery px-[24px]"
            style={{
              width: Math.min(width - spacing.sm * 2, 350),
            }}
          >
            <Text className="font-montserrat-medium text-xs text-neutral-1000">
              Delivery in
            </Text>
            <Text className="font-montserrat-semibold text-md text-neutral-1000">
              1 within Hour
            </Text>
          </View>

          <View
            className="mt-md flex-row gap-[8px]"
            style={{ width: contentWidth }}
          >
            <Pressable
              accessibilityHint="Scrolls to similar products"
              accessibilityLabel="View similar products"
              accessibilityRole="button"
              className="h-[48px] flex-1 flex-row items-center justify-center rounded-sm border border-neutral-200 bg-neutral-0 active:opacity-70"
              onPress={scrollToSimilar}
            >
              <Image
                accessible={false}
                contentFit="contain"
                source={require("@/assets/icons/product-details/view-similar.svg")}
                style={{ height: 24, width: 24 }}
              />
              <Text className="ml-[8px] font-montserrat-medium text-xs text-neutral-1000">
                View Similar
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel={
                isCompared ? "Remove from comparison" : "Add to comparison"
              }
              accessibilityRole="button"
              accessibilityState={{ selected: isCompared }}
              className={`h-[48px] flex-1 flex-row items-center justify-center rounded-sm border active:opacity-70 ${
                isCompared
                  ? "border-brand-primary bg-brand-socialSurface"
                  : "border-neutral-200 bg-neutral-0"
              }`}
              onPress={() => setIsCompared((value) => !value)}
            >
              <Image
                accessible={false}
                contentFit="contain"
                source={require("@/assets/icons/product-details/compare.svg")}
                style={{ height: 24, width: 24 }}
              />
              <Text
                className={`ml-[8px] font-montserrat-medium text-xs ${
                  isCompared ? "text-brand-primary" : "text-neutral-1000"
                }`}
                numberOfLines={1}
              >
                {isCompared ? "Compared" : "Add to Compare"}
              </Text>
            </Pressable>
          </View>

          <View
            className="mt-md"
            onLayout={captureSimilarPosition}
            style={{ width: contentWidth }}
          >
            <Text
              accessibilityRole="header"
              className="font-montserrat-semibold text-lg text-neutral-1000"
            >
              Similar To
            </Text>
            <View className="mt-[8px] h-[24px] flex-row items-center justify-between">
              <Text className="font-montserrat-semibold text-action text-neutral-1000">
                282+ Items
              </Text>
              <View className="flex-row gap-[12px]">
                <SortButton onPress={() => openSearchMode("sort")} />
                <FilterButton onPress={() => openSearchMode("filter")} />
              </View>
            </View>

            <ScrollView
              accessibilityLabel="Similar products"
              className="mt-md"
              contentContainerStyle={{ columnGap: spacing.md }}
              decelerationRate="normal"
              directionalLockEnabled
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
            >
              {SIMILAR_PRODUCTS.map((similarProduct) => (
                <CatalogProductCard
                  imageSize="short"
                  key={similarProduct.id}
                  onPress={() => openSimilarProduct(similarProduct.id)}
                  product={similarProduct}
                  width={similarCardWidth}
                />
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}
