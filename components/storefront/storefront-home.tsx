import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  type PropsWithChildren,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeroWritingHeadline } from "@/components/animated/hero-writing-headline";
import { ScrollReveal } from "@/components/animated/scroll-reveal";
import { CatalogProductCard } from "@/components/catalog/catalog-product-card";
import { FilterButton } from "@/components/catalog/filter-button";
import { ProductOptionsSheet } from "@/components/catalog/product-options-sheet";
import { SortButton } from "@/components/catalog/sort-button";
import { HomeHeader } from "@/components/home/home-header";
import { HomeSearchBar } from "@/components/home/home-search-bar";
import { StorefrontCategoryCard } from "@/components/storefront/storefront-category-card";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { StorefrontProductCard } from "@/components/storefront/storefront-product-card";
import { StorefrontSectionHeader } from "@/components/storefront/storefront-section-header";
import { colors, spacing } from "@/constants/design-tokens";
import {
  applyHomeProductOptions,
  HOME_PRODUCT_PRICE_FILTER_OPTIONS,
  HOME_PRODUCT_SORT_OPTIONS,
  type HomeProductPriceFilter,
  type HomeProductSort,
} from "@/constants/home-data";
import { filterSearchableProducts } from "@/constants/search-data";
import {
  STOREFRONT_CATEGORIES,
  STOREFRONT_EDITORIAL_IMAGE,
  STOREFRONT_NEW_ARRIVALS,
  STOREFRONT_TRENDING_PRODUCTS,
} from "@/constants/storefront-data";
import { selectCartQuantity, useCartStore } from "@/stores/cart-store";

type ActiveProductOptionsSheet = "filter" | "sort" | null;
type NewsletterStatus = "error" | "idle" | "success";

const DESKTOP_BREAKPOINT = 1024;
const LARGE_DESKTOP_BREAKPOINT = 1180;
const TABLET_BREAKPOINT = 720;
const TWO_COLUMN_PHONE_BREAKPOINT = 360;
const MAX_CONTENT_WIDTH = 1440;
const MAX_FEATURE_WIDTH = 1600;

function clamp(minimum: number, value: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

type StorefrontPageScrollerProps = PropsWithChildren<{
  desktopWeb: boolean;
  scrollRef: RefObject<ScrollView | null>;
}>;

function StorefrontPageScroller({
  children,
  desktopWeb,
  scrollRef,
}: StorefrontPageScrollerProps) {
  if (Platform.OS === "web") {
    return (
      <View
        accessibilityLabel="Stylish storefront home"
        className="bg-neutral-25"
        style={{
          minWidth: 0,
          paddingBottom: desktopWeb ? 0 : 58,
          width: "100%",
        }}
        testID="storefront-natural-page"
      >
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      accessibilityLabel="Stylish storefront home"
      className="flex-1 bg-neutral-25"
      contentContainerStyle={{ width: "100%" }}
      contentInsetAdjustmentBehavior="never"
      decelerationRate="normal"
      directionalLockEnabled
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      ref={scrollRef}
      scrollEventThrottle={16}
      scrollsToTop
      showsVerticalScrollIndicator={desktopWeb}
      style={{ minWidth: 0, width: "100%" }}
    >
      {children}
    </ScrollView>
  );
}

type StorefrontTextLinkProps = {
  label: string;
  light?: boolean;
  onPress: () => void;
};

function StorefrontTextLink({
  label,
  light = false,
  onPress,
}: StorefrontTextLinkProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="link"
      className={`min-h-[44px] flex-row items-center border-b-2 pb-xs pt-sm active:opacity-60 ${
        light ? "border-neutral-0" : "border-brand-primary"
      }`}
      onPress={onPress}
    >
      <Text
        className={`font-montserrat-bold text-xs uppercase tracking-[1.5px] ${
          light ? "text-neutral-0" : "text-brand-primary"
        }`}
      >
        {label}
      </Text>
      <MaterialIcons
        color={light ? colors.neutral[0] : colors.brand.primary}
        name="arrow-forward"
        size={16}
        style={{ marginLeft: spacing.sm }}
      />
    </Pressable>
  );
}

export function StorefrontHome() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const entranceProgress = useSharedValue(reduceMotion ? 1 : 0);
  const heroDescriptionProgress = useSharedValue(reduceMotion ? 1 : 0);
  const heroCtaProgress = useSharedValue(reduceMotion ? 1 : 0);
  const cartQuantity = useCartStore(selectCartQuantity);
  const [activeOptionsSheet, setActiveOptionsSheet] =
    useState<ActiveProductOptionsSheet>(null);
  const [priceFilter, setPriceFilter] = useState<HomeProductPriceFilter>("all");
  const [productSort, setProductSort] =
    useState<HomeProductSort>("recommended");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] =
    useState<NewsletterStatus>("idle");
  const [newArrivalsSectionY, setNewArrivalsSectionY] = useState(0);
  const [storySectionY, setStorySectionY] = useState(0);
  const [trendingSectionY, setTrendingSectionY] = useState(0);

  const isWeb = Platform.OS === "web";
  const browserClientWidth =
    isWeb && typeof document !== "undefined"
      ? document.documentElement.clientWidth
      : width;
  const layoutWidth = Math.min(
    width,
    browserClientWidth > 0 ? browserClientWidth : width,
  );
  const isDesktop = isWeb && layoutWidth >= DESKTOP_BREAKPOINT;
  const isLargeDesktop = isWeb && layoutWidth >= LARGE_DESKTOP_BREAKPOINT;
  const isTablet = layoutWidth >= TABLET_BREAKPOINT;
  const horizontalPadding = clamp(16, layoutWidth * 0.035, 56);
  const contentWidth = Math.min(
    MAX_CONTENT_WIDTH,
    Math.max(0, layoutWidth - horizontalPadding * 2),
  );
  const featureWidth = Math.min(
    MAX_FEATURE_WIDTH,
    Math.max(0, layoutWidth - (isDesktop ? horizontalPadding * 2 : 0)),
  );
  const sectionPadding = clamp(48, layoutWidth * 0.055, 96);
  const gridColumns =
    layoutWidth >= LARGE_DESKTOP_BREAKPOINT
      ? 4
      : layoutWidth >= TABLET_BREAKPOINT
        ? 3
        : layoutWidth >= TWO_COLUMN_PHONE_BREAKPOINT
          ? 2
          : 1;
  const gridGap = clamp(12, layoutWidth * 0.014, 24);
  const gridCardWidth =
    (contentWidth - gridGap * (gridColumns - 1)) / gridColumns;
  const headlineSize = clamp(42, layoutWidth * 0.052, 82);
  const heroTextPadding = clamp(28, featureWidth * 0.06, 96);
  const editorialTextPadding = clamp(28, featureWidth * 0.05, 80);
  const searchVisible = !isDesktop || searchExpanded;
  const searchResults = useMemo(
    () => filterSearchableProducts(searchQuery).slice(0, 4),
    [searchQuery],
  );
  const hasSearchQuery = searchQuery.trim().length > 0;
  const searchCardWidth = Math.min(
    isDesktop ? 220 : 164,
    Math.max(132, (contentWidth - spacing.md) / 2),
  );
  const visibleTrendingProducts = useMemo(
    () =>
      applyHomeProductOptions(
        STOREFRONT_TRENDING_PRODUCTS,
        productSort,
        priceFilter,
      ),
    [priceFilter, productSort],
  );
  const visibleNewArrivals = useMemo(
    () =>
      applyHomeProductOptions(
        STOREFRONT_NEW_ARRIVALS,
        productSort,
        priceFilter,
      ),
    [priceFilter, productSort],
  );

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
    transform: [
      {
        translateY: interpolate(entranceProgress.value, [0, 1], [10, 0]),
      },
    ],
  }));
  const heroDescriptionStyle = useAnimatedStyle(() => ({
    opacity: heroDescriptionProgress.value,
    transform: [
      {
        translateY: interpolate(
          heroDescriptionProgress.value,
          [0, 1],
          [10, 0],
        ),
      },
    ],
  }));
  const heroCtaStyle = useAnimatedStyle(() => ({
    opacity: heroCtaProgress.value,
    transform: [
      {
        translateY: interpolate(heroCtaProgress.value, [0, 1], [8, 0]),
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
    heroDescriptionProgress.value = reduceMotion
      ? 1
      : withDelay(
          760,
          withTiming(1, {
            duration: 360,
            easing: Easing.out(Easing.cubic),
          }),
        );
    heroCtaProgress.value = reduceMotion
      ? 1
      : withDelay(
          940,
          withTiming(1, {
            duration: 360,
            easing: Easing.out(Easing.cubic),
          }),
        );
  }, [
    entranceProgress,
    heroCtaProgress,
    heroDescriptionProgress,
    reduceMotion,
  ]);

  const openSearch = (query?: string) => {
    const normalizedQuery = query?.trim() || searchQuery.trim();

    router.push({
      pathname: "/(tabs)/search",
      params: normalizedQuery ? { query: normalizedQuery } : undefined,
    });
  };

  const openProduct = (id: string) =>
    router.push({
      pathname: "/(tabs)/product/[id]",
      params: { id },
    });

  const scrollToSection = (sectionY: number) => {
    if (isWeb && typeof window !== "undefined") {
      window.scrollTo({
        behavior: reduceMotion ? "auto" : "smooth",
        top: Math.max(0, sectionY - spacing.md),
      });
      return;
    }

    scrollRef.current?.scrollTo({
      animated: true,
      y: Math.max(0, sectionY - spacing.md),
    });
  };

  const captureSectionPosition =
    (setPosition: (position: number) => void) => (event: LayoutChangeEvent) => {
      setPosition(event.nativeEvent.layout.y);
    };

  const submitNewsletter = () => {
    const normalizedEmail = newsletterEmail.trim();
    const isValid =
      normalizedEmail.includes("@") &&
      normalizedEmail.lastIndexOf(".") > normalizedEmail.indexOf("@") + 1;

    setNewsletterStatus(isValid ? "success" : "error");
  };

  const handleFooterLink = (label: string) => {
    if (["New arrivals", "Dresses", "Sets", "Accessories"].includes(label)) {
      openSearch(label);
      return;
    }

    router.push("/(tabs)/settings");
  };

  const productControls = (
    <View className="flex-row gap-[8px]">
      <SortButton
        active={productSort !== "recommended"}
        onPress={() => setActiveOptionsSheet("sort")}
      />
      <FilterButton
        active={priceFilter !== "all"}
        onPress={() => setActiveOptionsSheet("filter")}
      />
    </View>
  );

  return (
    <SafeAreaView
      className={isWeb ? "bg-neutral-25" : "flex-1 bg-neutral-25"}
      edges={isDesktop ? [] : ["top"]}
      style={{ minWidth: 0, width: "100%" }}
      testID="storefront-page-root"
    >
      <StatusBar style="dark" />

      <Animated.View
        className={isWeb ? "" : "flex-1"}
        style={[
          {
            flex: isWeb ? undefined : 1,
            minHeight: isWeb ? undefined : 0,
            minWidth: 0,
            width: "100%",
          },
          entranceStyle,
        ]}
        testID="storefront-page-motion"
      >
        <StorefrontPageScroller
          desktopWeb={isDesktop}
          scrollRef={scrollRef}
        >
          <View className="h-[33px] items-center justify-center bg-brand-primary px-md">
            <Text
              className="font-montserrat-bold text-micro uppercase tracking-[1.5px] text-neutral-0"
              numberOfLines={1}
            >
              Free shipping on orders over ₱3,000 · Easy 30-day returns
            </Text>
          </View>

          {isDesktop ? (
            <StorefrontHeader
              cartQuantity={cartQuantity}
              contentWidth={contentWidth}
              onAccountPress={() => router.push("/profile")}
              onCartPress={() => router.push("/(tabs)/cart")}
              onNewArrivalsPress={() => scrollToSection(newArrivalsSectionY)}
              onSearchPress={() => setSearchExpanded((current) => !current)}
              onShopPress={() => openSearch()}
              onStoryPress={() => scrollToSection(storySectionY)}
              onTrendingPress={() => scrollToSection(trendingSectionY)}
              onWishlistPress={() => router.push("/(tabs)/wishlist")}
            />
          ) : (
            <View className="bg-neutral-0">
              <HomeHeader
                onMenuPress={() => router.push("/(tabs)/settings")}
                onProfilePress={() => router.push("/profile")}
              />
            </View>
          )}

          {searchVisible ? (
            <View className="items-center bg-neutral-0 px-md pb-md">
              <View className={isDesktop ? "pt-md" : ""}>
                <HomeSearchBar
                  autoFocus={isDesktop && searchExpanded}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => openSearch()}
                  value={searchQuery}
                  width={Math.min(contentWidth, 510)}
                />
              </View>

              {hasSearchQuery ? (
                <View className="mt-md" style={{ width: contentWidth }}>
                  <View className="mb-md flex-row items-center justify-between">
                    <Text
                      accessibilityRole="header"
                      className="font-montserrat-semibold text-md text-neutral-900"
                    >
                      Search results
                    </Text>
                    <Pressable
                      accessibilityRole="link"
                      className="py-xs active:opacity-60"
                      onPress={() => openSearch()}
                    >
                      <Text className="font-montserrat-semibold text-xs text-brand-primary">
                        View all
                      </Text>
                    </Pressable>
                  </View>

                  {searchResults.length > 0 ? (
                    <View className="flex-row flex-wrap justify-center gap-md">
                      {searchResults.map((product, index) => (
                        <ScrollReveal
                          key={product.id}
                          staggerIndex={index}
                          style={{ width: searchCardWidth }}
                        >
                          <CatalogProductCard
                            imageSize="short"
                            onPress={() => openProduct(product.id)}
                            product={product}
                            width={searchCardWidth}
                          />
                        </ScrollReveal>
                      ))}
                    </View>
                  ) : (
                    <View className="min-h-[96px] items-center justify-center bg-neutral-50 px-md">
                      <Text className="text-center font-montserrat-medium text-sm text-neutral-600">
                        No products match “{searchQuery.trim()}”.
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          ) : null}

          <ScrollReveal
            className="items-center"
            style={{ alignSelf: "stretch", width: "100%" }}
          >
            <View
              className={isDesktop ? "flex-row" : ""}
              style={{
                alignSelf: "center",
                alignItems: "stretch",
                width: featureWidth,
              }}
            >
              <View
                className="justify-center bg-brand-socialSurface"
                style={{
                  paddingHorizontal: heroTextPadding,
                  paddingVertical: isDesktop
                    ? clamp(64, layoutWidth * 0.055, 96)
                    : clamp(48, layoutWidth * 0.13, 72),
                  width: isDesktop ? "50%" : "100%",
                }}
              >
                <Text className="font-montserrat-bold text-micro uppercase tracking-[2px] text-brand-primary">
                  The summer edit / 2026
                </Text>
                <HeroWritingHeadline
                  style={{
                    fontSize: headlineSize,
                    letterSpacing: -headlineSize * 0.035,
                    lineHeight: headlineSize * 0.94,
                  }}
                />
                <Animated.View
                  style={[
                    {
                      marginTop: spacing.lg,
                      maxWidth: 410,
                    },
                    heroDescriptionStyle,
                  ]}
                >
                  <Text
                    className="font-montserrat-regular text-sm text-neutral-600"
                    style={{ lineHeight: 26 }}
                  >
                    Dresses that move with you, color that brightens the
                    everyday, and the kind of details you remember.
                  </Text>
                </Animated.View>
                <Animated.View
                  style={[
                    {
                      alignSelf: "flex-start",
                      marginTop: spacing.lg,
                    },
                    heroCtaStyle,
                  ]}
                >
                  <StorefrontTextLink
                    label="Shop the collection"
                    onPress={() => openSearch("fashion")}
                  />
                </Animated.View>
              </View>

              <View
                accessibilityLabel="Stylish summer collection color panel"
                accessibilityRole="image"
                className="bg-brand-pinkSoft"
                style={{
                  alignSelf: isDesktop ? "stretch" : undefined,
                  aspectRatio: isDesktop ? undefined : isTablet ? 1.8 : 1.45,
                  minHeight: isDesktop ? 1 : undefined,
                  width: isDesktop ? "50%" : "100%",
                }}
              />
            </View>
          </ScrollReveal>

          <View
            className="items-center bg-neutral-25"
            style={{ paddingVertical: sectionPadding }}
          >
            <View style={{ width: contentWidth }}>
              <ScrollReveal>
                <StorefrontSectionHeader
                  action={
                    <StorefrontTextLink
                      label="View all"
                      onPress={() => openSearch()}
                    />
                  }
                  compact={!isDesktop}
                  eyebrow="Shop by mood"
                  stacked={contentWidth < 560}
                  title="The everyday romance"
                />
              </ScrollReveal>

              <View
                className="mt-xl flex-row flex-wrap"
                style={{ gap: gridGap }}
              >
                {STOREFRONT_CATEGORIES.map((category, index) => (
                  <ScrollReveal
                    key={category.id}
                    staggerIndex={index}
                    style={{ width: gridCardWidth }}
                  >
                    <StorefrontCategoryCard
                      category={category}
                      onPress={() => openSearch(category.searchQuery)}
                      showLabel
                      width={gridCardWidth}
                    />
                  </ScrollReveal>
                ))}
              </View>
            </View>
          </View>

          <View
            className="items-center bg-neutral-0"
            onLayout={captureSectionPosition(setTrendingSectionY)}
            style={{ paddingVertical: sectionPadding }}
          >
            <View style={{ width: contentWidth }}>
              <ScrollReveal>
                <StorefrontSectionHeader
                  action={productControls}
                  centered={isLargeDesktop}
                  compact={!isDesktop}
                  eyebrow="Most loved"
                  stacked={contentWidth < 560}
                  title="Trending now"
                />
              </ScrollReveal>

              <View
                className="mt-xl flex-row flex-wrap"
                style={{ gap: gridGap }}
              >
                {visibleTrendingProducts.map((product, index) => (
                  <ScrollReveal
                    key={product.id}
                    staggerIndex={index}
                    style={{ width: gridCardWidth }}
                  >
                    <StorefrontProductCard
                      onPress={() => openProduct(product.id)}
                      product={product}
                      width={gridCardWidth}
                    />
                  </ScrollReveal>
                ))}
              </View>

              {visibleTrendingProducts.length === 0 ? (
                <View className="mt-xl min-h-[120px] items-center justify-center bg-neutral-50 px-lg">
                  <Text className="text-center font-montserrat-medium text-sm text-neutral-600">
                    No trending pieces match this price filter.
                  </Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                className="mt-xxl min-h-[46px] self-center justify-center border border-brand-primary px-xl active:bg-brand-socialSurface"
                onPress={() => openSearch()}
              >
                <Text className="font-montserrat-bold text-xs uppercase tracking-[1.4px] text-brand-primary">
                  Load more pieces
                </Text>
              </Pressable>
            </View>
          </View>

          <View
            className="items-center"
            onLayout={captureSectionPosition(setStorySectionY)}
          >
            <ScrollReveal
              className={isDesktop ? "flex-row" : ""}
              style={{ alignItems: "stretch", width: featureWidth }}
            >
              <View
                style={{
                  aspectRatio: isDesktop ? 1.5 : isTablet ? 1.65 : 1.42,
                  overflow: "hidden",
                  width: isDesktop ? "55%" : "100%",
                }}
                testID="motion-image-frame"
              >
                <Image
                  accessibilityLabel="Behind the scenes at a Stylish fashion photo shoot"
                  accessibilityRole="image"
                  contentFit="cover"
                  source={STOREFRONT_EDITORIAL_IMAGE}
                  style={{ height: "100%", width: "100%" }}
                />
              </View>
              <View
                className="justify-center bg-brand-primary"
                style={{
                  alignSelf: isDesktop ? "stretch" : undefined,
                  paddingHorizontal: editorialTextPadding,
                  paddingVertical: isDesktop
                    ? clamp(56, layoutWidth * 0.045, 80)
                    : spacing.xxl,
                  width: isDesktop ? "45%" : "100%",
                }}
              >
                <Text className="font-montserrat-bold text-micro uppercase tracking-[2px] text-neutral-0">
                  A note from the studio
                </Text>
                <Text
                  accessibilityRole="header"
                  className="mt-md font-serif text-neutral-0"
                  style={{
                    fontSize: clamp(34, layoutWidth * 0.035, 50),
                    lineHeight: clamp(41, layoutWidth * 0.041, 58),
                    maxWidth: 480,
                  }}
                >
                  Made for your main-character moments.
                </Text>
                <Text
                  className="mt-lg font-montserrat-regular text-sm text-neutral-0"
                  style={{ lineHeight: 26, maxWidth: 410 }}
                >
                  Small-batch collections, considered silhouettes, and details
                  designed to stay with you.
                </Text>
                <View className="mt-lg self-start">
                  <StorefrontTextLink
                    label="Meet Stylish"
                    light
                    onPress={() => router.push("/(tabs)/settings")}
                  />
                </View>
              </View>
            </ScrollReveal>
          </View>

          <View
            className="items-center bg-neutral-25"
            onLayout={captureSectionPosition(setNewArrivalsSectionY)}
            style={{ paddingVertical: sectionPadding }}
          >
            <View style={{ width: contentWidth }}>
              <ScrollReveal>
                <StorefrontSectionHeader
                  action={
                    <StorefrontTextLink
                      label="Shop new arrivals"
                      onPress={() => openSearch("new arrivals")}
                    />
                  }
                  compact={!isDesktop}
                  eyebrow="Just landed"
                  stacked={contentWidth < 560}
                  title="Fresh from the atelier"
                />
              </ScrollReveal>

              <View
                className="mt-xl flex-row flex-wrap"
                style={{ gap: gridGap }}
              >
                {visibleNewArrivals.map((product, index) => (
                  <ScrollReveal
                    key={product.id}
                    staggerIndex={index}
                    style={{ width: gridCardWidth }}
                  >
                    <StorefrontProductCard
                      onPress={() => openProduct(product.id)}
                      product={product}
                      width={gridCardWidth}
                    />
                  </ScrollReveal>
                ))}
              </View>

              {visibleNewArrivals.length === 0 ? (
                <View className="mt-xl min-h-[120px] items-center justify-center bg-neutral-0 px-lg">
                  <Text className="text-center font-montserrat-medium text-sm text-neutral-600">
                    No new arrivals match this price filter.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View
            className="items-center border-t border-brand-pinkSoft bg-brand-socialSurface px-lg"
            style={{
              paddingVertical: clamp(56, layoutWidth * 0.055, 88),
            }}
          >
            <ScrollReveal
              className="items-center"
              style={{ width: contentWidth }}
            >
              <Text className="text-center font-montserrat-bold text-micro uppercase tracking-[2px] text-brand-primary">
                Lovely things, inbox first
              </Text>
              <Text
                accessibilityRole="header"
                className="mt-sm text-center font-serif text-neutral-900"
                style={{
                  fontSize: clamp(32, layoutWidth * 0.034, 48),
                  lineHeight: clamp(40, layoutWidth * 0.042, 60),
                }}
              >
                A little note from Stylish
              </Text>
              <Text
                className="mt-md text-center font-montserrat-regular text-sm text-neutral-600"
                style={{ lineHeight: 26, maxWidth: 480 }}
              >
                New drops, private promotions, and things we think you’ll love.
                No clutter, just the good bits.
              </Text>

              <View
                className="mt-xl flex-row items-center border-b border-brand-primary"
                style={{ maxWidth: 510, width: "100%" }}
              >
                <TextInput
                  accessibilityLabel="Newsletter email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  className="h-[48px] flex-1 font-montserrat-regular text-sm text-neutral-900 outline-none"
                  keyboardType="email-address"
                  onChangeText={(value) => {
                    setNewsletterEmail(value);
                    setNewsletterStatus("idle");
                  }}
                  onSubmitEditing={submitNewsletter}
                  placeholder="Your email address"
                  placeholderTextColor={colors.neutral[450]}
                  returnKeyType="done"
                  value={newsletterEmail}
                />
                <Pressable
                  accessibilityLabel="Subscribe to the Stylish newsletter"
                  accessibilityRole="button"
                  className="h-[48px] flex-row items-center px-xs active:opacity-60"
                  onPress={submitNewsletter}
                >
                  <Text className="font-montserrat-bold text-xs uppercase tracking-[1.4px] text-brand-primary">
                    Subscribe
                  </Text>
                  <MaterialIcons
                    color={colors.brand.primary}
                    name="arrow-forward"
                    size={16}
                    style={{ marginLeft: spacing.xs }}
                  />
                </Pressable>
              </View>

              {newsletterStatus !== "idle" ? (
                <Text
                  accessibilityLiveRegion={
                    newsletterStatus === "error" ? "assertive" : "polite"
                  }
                  className={`mt-sm text-center font-montserrat-medium text-xs ${
                    newsletterStatus === "error"
                      ? "text-brand-primary"
                      : "text-feedback-success"
                  }`}
                >
                  {newsletterStatus === "error"
                    ? "Enter a valid email address."
                    : "You’re on the list. No information was sent to a backend."}
                </Text>
              ) : null}
            </ScrollReveal>
          </View>

          <ScrollReveal>
            <StorefrontFooter
              compact={layoutWidth < 900}
              contentWidth={contentWidth}
              onLinkPress={handleFooterLink}
            />
          </ScrollReveal>
        </StorefrontPageScroller>
      </Animated.View>

      <ProductOptionsSheet
        onClose={() => setActiveOptionsSheet(null)}
        onSelect={setProductSort}
        options={HOME_PRODUCT_SORT_OPTIONS}
        selectedValue={productSort}
        title="Sort Products"
        visible={activeOptionsSheet === "sort"}
      />
      <ProductOptionsSheet
        onClose={() => setActiveOptionsSheet(null)}
        onSelect={setPriceFilter}
        options={HOME_PRODUCT_PRICE_FILTER_OPTIONS}
        selectedValue={priceFilter}
        title="Filter by Price"
        visible={activeOptionsSheet === "filter"}
      />
    </SafeAreaView>
  );
}
