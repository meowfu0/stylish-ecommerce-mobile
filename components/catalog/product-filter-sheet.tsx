import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { CatalogFilterChips } from "@/components/catalog/catalog-filter-chips";
import { StylishTextInput } from "@/components/forms/stylish-text-input";
import {
  CATALOG_AVAILABILITY_OPTIONS,
  CATALOG_BRAND_OPTIONS,
  CATALOG_CATEGORY_OPTIONS,
  CATALOG_COLOR_OPTIONS,
  CATALOG_PRICE_PRESETS,
  CATALOG_PROMOTION_OPTIONS,
  CATALOG_RATING_OPTIONS,
  CATALOG_SIZE_OPTIONS,
  cloneCatalogFilters,
  EMPTY_CATALOG_FILTERS,
  getActiveCatalogFilterCount,
  getCatalogFilterChips,
  removeCatalogFilterChip,
  type CatalogFilterState,
} from "@/constants/catalog-options";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { isDesktopWeb } from "@/constants/responsive";

const SHEET_MOTION_DURATION = 240;
const SECTION_MOTION_DURATION = 220;

type FilterSectionId =
  | "availability"
  | "brand"
  | "category"
  | "color"
  | "price"
  | "promotion"
  | "rating"
  | "size";

type FilterChoiceRowProps = {
  checked: boolean;
  description?: string;
  label: string;
  mode?: "checkbox" | "radio";
  onPress: () => void;
  swatch?: string;
};

const styles = StyleSheet.create({
  choiceRow: {
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    width: "100%",
  },
  choiceText: {
    flex: 1,
    marginLeft: spacing.sm,
    minWidth: 0,
  },
  indicator: {
    alignItems: "center",
    borderWidth: 1.5,
    flexShrink: 0,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  inputControl: {
    color: colors.neutral[900],
    flex: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    height: "100%",
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  inputShell: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    flex: 1,
    height: 46,
    minWidth: 0,
    overflow: "hidden",
  },
  inputShellFocused: { borderColor: colors.brand.primary },
});

const INITIAL_EXPANDED_SECTIONS: Record<FilterSectionId, boolean> = {
  availability: false,
  brand: false,
  category: true,
  color: false,
  price: true,
  promotion: false,
  rating: false,
  size: false,
};

function toggleValue<Value extends string>(
  values: readonly Value[],
  value: Value,
) {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value];
}

function CatalogPriceInput({
  accessibilityLabel,
  onChangeText,
  placeholder,
  value,
}: {
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.inputShell, focused && styles.inputShellFocused]}>
      <StylishTextInput
        accessibilityLabel={accessibilityLabel}
        inputMode="numeric"
        keyboardType="number-pad"
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral[450]}
        style={styles.inputControl}
        value={value}
      />
    </View>
  );
}

function FilterChoiceRow({
  checked,
  description,
  label,
  mode = "checkbox",
  onPress,
  swatch,
}: FilterChoiceRowProps) {
  return (
    <Pressable
      accessibilityLabel={
        description ? `${label}. ${description}` : `${label} filter`
      }
      accessibilityRole={mode}
      accessibilityState={{ checked }}
      focusable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceRow,
        {
          backgroundColor: checked
            ? colors.brand.socialSurface
            : pressed
              ? colors.neutral[50]
              : colors.neutral[0],
          borderColor: checked
            ? `${colors.brand.primary}66`
            : colors.neutral[200],
          opacity: pressed ? 0.78 : 1,
          transform: pressed ? [{ scale: 0.992 }] : undefined,
        },
      ]}
      testID="catalog-filter-choice"
    >
      <View
        style={[
          styles.indicator,
          {
            backgroundColor: checked ? colors.brand.primary : colors.neutral[0],
            borderColor: checked ? colors.brand.primary : colors.neutral[300],
            borderRadius:
              mode === "radio" ? borderRadius.pill : borderRadius.xs,
          },
        ]}
      >
        {checked ? (
          mode === "radio" ? (
            <View
              style={{
                backgroundColor: colors.neutral[0],
                borderRadius: borderRadius.pill,
                height: 7,
                width: 7,
              }}
            />
          ) : (
            <MaterialIcons color={colors.neutral[0]} name="check" size={14} />
          )
        ) : null}
      </View>

      {swatch ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            backgroundColor: swatch,
            borderColor: colors.neutral[200],
            borderRadius: borderRadius.pill,
            borderWidth: 1,
            height: 22,
            marginLeft: spacing.sm,
            width: 22,
          }}
        />
      ) : null}

      <View
        style={[
          styles.choiceText,
          swatch ? { marginLeft: spacing.xs } : undefined,
        ]}
      >
        <Text
          className={`font-montserrat-semibold text-sm ${
            checked ? "text-brand-primary" : "text-neutral-900"
          }`}
        >
          {label}
        </Text>
        {description ? (
          <Text className="mt-[2px] font-montserrat-regular text-xs text-neutral-550">
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

type CollapsibleFilterSectionProps = {
  children: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  reduceMotion: boolean;
  selectedCount: number;
  title: string;
};

function CollapsibleFilterSection({
  children,
  expanded,
  onToggle,
  reduceMotion,
  selectedCount,
  title,
}: CollapsibleFilterSectionProps) {
  return (
    <View className="border-b border-neutral-200 py-xs">
      <Pressable
        accessibilityLabel={`${title}, ${
          expanded ? "collapse" : "expand"
        } section`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="min-h-[52px] cursor-pointer flex-row items-center px-xs active:opacity-70"
        focusable
        onPress={onToggle}
        testID="catalog-filter-section-toggle"
      >
        <Text className="flex-1 font-montserrat-semibold text-sm text-neutral-900">
          {title}
        </Text>
        {selectedCount > 0 ? (
          <View className="mr-sm min-w-[24px] items-center rounded-pill bg-brand-socialSurface px-xs py-[3px]">
            <Text className="font-montserrat-bold text-micro text-brand-primary">
              {selectedCount}
            </Text>
          </View>
        ) : null}
        <MaterialIcons
          color={colors.neutral[600]}
          name={expanded ? "expand-less" : "expand-more"}
          size={22}
        />
      </Pressable>

      {expanded ? (
        <Animated.View
          entering={
            reduceMotion
              ? undefined
              : FadeIn.duration(SECTION_MOTION_DURATION).easing(
                  Easing.out(Easing.cubic),
                )
          }
          exiting={
            reduceMotion
              ? undefined
              : FadeOut.duration(160).easing(Easing.in(Easing.cubic))
          }
          className="gap-xs pb-md pt-xs"
        >
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

type ProductFilterSheetProps = {
  filters: CatalogFilterState;
  getMatchingCount: (filters: CatalogFilterState) => number;
  onApply: (filters: CatalogFilterState) => void;
  onClose: () => void;
  visible: boolean;
};

export function ProductFilterSheet({
  filters,
  getMatchingCount,
  onApply,
  onClose,
  visible,
}: ProductFilterSheetProps) {
  const { height, width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const desktopWeb = isDesktopWeb(width);
  const animationProgress = useSharedValue(visible ? 1 : 0);
  const closeButtonRef = useRef<View>(null);
  const [mounted, setMounted] = useState(visible);
  const [draftFilters, setDraftFilters] = useState(() =>
    cloneCatalogFilters(filters),
  );
  const [expandedSections, setExpandedSections] = useState(
    INITIAL_EXPANDED_SECTIONS,
  );

  const filterChips = useMemo(
    () => getCatalogFilterChips(draftFilters),
    [draftFilters],
  );
  const activeFilterCount = getActiveCatalogFilterCount(draftFilters);
  const minimumPrice = Number(draftFilters.customMinimumPrice || 0);
  const maximumPrice = Number(draftFilters.customMaximumPrice || 0);
  const hasInvalidCustomRange =
    draftFilters.pricePreset === "custom" &&
    draftFilters.customMinimumPrice.length > 0 &&
    draftFilters.customMaximumPrice.length > 0 &&
    minimumPrice > maximumPrice;
  const matchingCount = hasInvalidCustomRange
    ? 0
    : getMatchingCount(draftFilters);
  const sheetWidth = desktopWeb
    ? Math.min(620, Math.max(0, width - 48))
    : width;
  const sheetMaxHeight = Math.max(
    0,
    Math.min(desktopWeb ? 760 : 720, height - (desktopWeb ? 48 : 8)),
  );

  useEffect(() => {
    if (visible) {
      setDraftFilters(cloneCatalogFilters(filters));
      setExpandedSections(INITIAL_EXPANDED_SECTIONS);
      setMounted(true);
    }
  }, [filters, visible]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (visible) {
      if (reduceMotion) {
        animationProgress.value = 1;
        return;
      }

      animationProgress.value = 0;
      animationProgress.value = withTiming(1, {
        duration: SHEET_MOTION_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (reduceMotion) {
      animationProgress.value = 0;
      setMounted(false);
      return;
    }

    animationProgress.value = withTiming(
      0,
      {
        duration: SHEET_MOTION_DURATION,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      },
    );
  }, [animationProgress, mounted, reduceMotion, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const focusTimer = setTimeout(
      () => {
        AccessibilityInfo.announceForAccessibility(
          "Filter Products. Choose one or more filters.",
        );
        const focusableCloseButton = closeButtonRef.current as unknown as {
          focus?: () => void;
        } | null;
        focusableCloseButton?.focus?.();
      },
      reduceMotion ? 0 : SHEET_MOTION_DURATION,
    );

    return () => clearTimeout(focusTimer);
  }, [reduceMotion, visible]);

  useEffect(() => {
    if (!visible || Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: animationProgress.value,
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: animationProgress.value,
    transform: [
      {
        translateY: interpolate(
          animationProgress.value,
          [0, 1],
          [desktopWeb ? 12 : 34, 0],
        ),
      },
      {
        scale: interpolate(
          animationProgress.value,
          [0, 1],
          [desktopWeb ? 0.975 : 0.995, 1],
        ),
      },
    ],
  }));

  const toggleSection = (section: FilterSectionId) => {
    setExpandedSections((currentSections) => ({
      ...currentSections,
      [section]: !currentSections[section],
    }));
  };

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      hardwareAccelerated
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={mounted}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className={`flex-1 ${
          desktopWeb
            ? "items-center justify-center px-lg"
            : "items-center justify-end"
        }`}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, backdropStyle]}
        >
          <BlurView
            blurReductionFactor={3}
            experimentalBlurMethod={
              Platform.OS === "android" ? "dimezisBlurView" : "none"
            }
            intensity={desktopWeb ? 24 : 18}
            style={StyleSheet.absoluteFillObject}
            tint="dark"
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: colors.ink.footer,
                opacity: 0.44,
              },
            ]}
          />
        </Animated.View>

        <Pressable
          accessible={false}
          className="absolute inset-0 cursor-pointer"
          onPress={onClose}
        />

        <Animated.View
          className={`overflow-hidden bg-neutral-0 ${
            desktopWeb
              ? "rounded-lg border border-neutral-200 shadow-lg"
              : "rounded-t-lg shadow-lg"
          }`}
          pointerEvents={visible ? "auto" : "none"}
          style={[
            {
              elevation: 18,
              maxHeight: sheetMaxHeight,
              shadowColor: colors.ink.footer,
              shadowOffset: { height: 14, width: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 30,
              width: sheetWidth,
            },
            sheetStyle,
          ]}
          testID="catalog-filter-sheet"
        >
          <SafeAreaView
            accessibilityLabel="Filter Products"
            accessibilityViewIsModal
            edges={desktopWeb ? [] : ["bottom"]}
            style={{ flexShrink: 1, maxHeight: sheetMaxHeight }}
          >
            {!desktopWeb ? (
              <View className="items-center pb-xs pt-sm">
                <View className="h-[4px] w-[38px] rounded-pill bg-neutral-300" />
              </View>
            ) : null}

            <View className="flex-row items-center justify-between px-lg pb-sm pt-md">
              <View className="min-w-0 flex-1 pr-md">
                <Text
                  accessibilityRole="header"
                  className="font-montserrat-semibold text-lg text-neutral-900"
                >
                  Filter Products
                </Text>
                <Text className="mt-[3px] font-montserrat-regular text-xs text-neutral-550">
                  Refine the edit without losing your place.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close product filters"
                accessibilityRole="button"
                className="h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-pill bg-neutral-75 active:bg-neutral-200"
                focusable
                hitSlop={5}
                onPress={onClose}
                ref={closeButtonRef}
                testID="catalog-options-close"
              >
                <MaterialIcons
                  color={colors.neutral[700]}
                  name="close"
                  size={20}
                />
              </Pressable>
            </View>

            {filterChips.length > 0 ? (
              <View className="border-t border-neutral-200 px-lg py-sm">
                <CatalogFilterChips
                  chips={filterChips}
                  onRemove={(chip) =>
                    setDraftFilters((currentFilters) =>
                      removeCatalogFilterChip(currentFilters, chip),
                    )
                  }
                />
              </View>
            ) : (
              <View className="mx-lg h-px bg-neutral-200" />
            )}

            <ScrollView
              bounces={false}
              contentContainerStyle={{
                paddingBottom: spacing.sm,
                paddingHorizontal: spacing.lg,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
            >
              <CollapsibleFilterSection
                expanded={expandedSections.price}
                onToggle={() => toggleSection("price")}
                reduceMotion={reduceMotion}
                selectedCount={draftFilters.pricePreset === "all" ? 0 : 1}
                title="Price Range"
              >
                {CATALOG_PRICE_PRESETS.map((option) => (
                  <FilterChoiceRow
                    checked={draftFilters.pricePreset === option.value}
                    description={option.description}
                    key={option.value}
                    label={option.label}
                    mode="radio"
                    onPress={() =>
                      setDraftFilters((currentFilters) => ({
                        ...currentFilters,
                        customMaximumPrice:
                          option.value === "custom"
                            ? currentFilters.customMaximumPrice
                            : "",
                        customMinimumPrice:
                          option.value === "custom"
                            ? currentFilters.customMinimumPrice
                            : "",
                        pricePreset: option.value,
                      }))
                    }
                  />
                ))}

                {draftFilters.pricePreset === "custom" ? (
                  <Animated.View
                    entering={
                      reduceMotion
                        ? undefined
                        : FadeIn.duration(SECTION_MOTION_DURATION)
                    }
                    className="pt-xs"
                  >
                    <View className="flex-row items-center gap-xs">
                      <CatalogPriceInput
                        accessibilityLabel="Minimum product price"
                        onChangeText={(value) =>
                          setDraftFilters((currentFilters) => ({
                            ...currentFilters,
                            customMinimumPrice: value.replace(/[^\d]/g, ""),
                          }))
                        }
                        placeholder="Minimum ₱"
                        value={draftFilters.customMinimumPrice}
                      />
                      <Text className="font-montserrat-medium text-xs text-neutral-450">
                        to
                      </Text>
                      <CatalogPriceInput
                        accessibilityLabel="Maximum product price"
                        onChangeText={(value) =>
                          setDraftFilters((currentFilters) => ({
                            ...currentFilters,
                            customMaximumPrice: value.replace(/[^\d]/g, ""),
                          }))
                        }
                        placeholder="Maximum ₱"
                        value={draftFilters.customMaximumPrice}
                      />
                    </View>
                    {hasInvalidCustomRange ? (
                      <Text
                        accessibilityLiveRegion="assertive"
                        className="mt-xs font-montserrat-medium text-xs text-brand-primary"
                      >
                        Minimum price must not exceed maximum price.
                      </Text>
                    ) : null}
                  </Animated.View>
                ) : null}
              </CollapsibleFilterSection>

              <CollapsibleFilterSection
                expanded={expandedSections.category}
                onToggle={() => toggleSection("category")}
                reduceMotion={reduceMotion}
                selectedCount={draftFilters.categories.length}
                title="Categories"
              >
                {CATALOG_CATEGORY_OPTIONS.map((option) => (
                  <FilterChoiceRow
                    checked={draftFilters.categories.includes(option.value)}
                    key={option.value}
                    label={option.label}
                    onPress={() =>
                      setDraftFilters((currentFilters) => ({
                        ...currentFilters,
                        categories: toggleValue(
                          currentFilters.categories,
                          option.value,
                        ),
                      }))
                    }
                  />
                ))}
              </CollapsibleFilterSection>

              <CollapsibleFilterSection
                expanded={expandedSections.rating}
                onToggle={() => toggleSection("rating")}
                reduceMotion={reduceMotion}
                selectedCount={draftFilters.ratings.length}
                title="Ratings"
              >
                {CATALOG_RATING_OPTIONS.map((option) => (
                  <FilterChoiceRow
                    checked={draftFilters.ratings.includes(option.value)}
                    key={option.value}
                    label={option.label}
                    onPress={() =>
                      setDraftFilters((currentFilters) => ({
                        ...currentFilters,
                        ratings: toggleValue(
                          currentFilters.ratings,
                          option.value,
                        ),
                      }))
                    }
                  />
                ))}
              </CollapsibleFilterSection>

              <CollapsibleFilterSection
                expanded={expandedSections.availability}
                onToggle={() => toggleSection("availability")}
                reduceMotion={reduceMotion}
                selectedCount={draftFilters.availability.length}
                title="Availability"
              >
                {CATALOG_AVAILABILITY_OPTIONS.map((option) => (
                  <FilterChoiceRow
                    checked={draftFilters.availability.includes(option.value)}
                    key={option.value}
                    label={option.label}
                    onPress={() =>
                      setDraftFilters((currentFilters) => ({
                        ...currentFilters,
                        availability: toggleValue(
                          currentFilters.availability,
                          option.value,
                        ),
                      }))
                    }
                  />
                ))}
              </CollapsibleFilterSection>

              <CollapsibleFilterSection
                expanded={expandedSections.promotion}
                onToggle={() => toggleSection("promotion")}
                reduceMotion={reduceMotion}
                selectedCount={draftFilters.promotions.length}
                title="Promotions"
              >
                {CATALOG_PROMOTION_OPTIONS.map((option) => (
                  <FilterChoiceRow
                    checked={draftFilters.promotions.includes(option.value)}
                    key={option.value}
                    label={option.label}
                    onPress={() =>
                      setDraftFilters((currentFilters) => ({
                        ...currentFilters,
                        promotions: toggleValue(
                          currentFilters.promotions,
                          option.value,
                        ),
                      }))
                    }
                  />
                ))}
              </CollapsibleFilterSection>

              <CollapsibleFilterSection
                expanded={expandedSections.brand}
                onToggle={() => toggleSection("brand")}
                reduceMotion={reduceMotion}
                selectedCount={draftFilters.brands.length}
                title="Brand"
              >
                {CATALOG_BRAND_OPTIONS.map((option) => (
                  <FilterChoiceRow
                    checked={draftFilters.brands.includes(option.value)}
                    key={option.value}
                    label={option.label}
                    onPress={() =>
                      setDraftFilters((currentFilters) => ({
                        ...currentFilters,
                        brands: toggleValue(
                          currentFilters.brands,
                          option.value,
                        ),
                      }))
                    }
                  />
                ))}
              </CollapsibleFilterSection>

              <CollapsibleFilterSection
                expanded={expandedSections.size}
                onToggle={() => toggleSection("size")}
                reduceMotion={reduceMotion}
                selectedCount={draftFilters.sizes.length}
                title="Size"
              >
                {CATALOG_SIZE_OPTIONS.map((option) => (
                  <FilterChoiceRow
                    checked={draftFilters.sizes.includes(option.value)}
                    key={option.value}
                    label={option.label}
                    onPress={() =>
                      setDraftFilters((currentFilters) => ({
                        ...currentFilters,
                        sizes: toggleValue(currentFilters.sizes, option.value),
                      }))
                    }
                  />
                ))}
              </CollapsibleFilterSection>

              <CollapsibleFilterSection
                expanded={expandedSections.color}
                onToggle={() => toggleSection("color")}
                reduceMotion={reduceMotion}
                selectedCount={draftFilters.colors.length}
                title="Color"
              >
                {CATALOG_COLOR_OPTIONS.map((option) => (
                  <FilterChoiceRow
                    checked={draftFilters.colors.includes(option.value)}
                    key={option.value}
                    label={option.label}
                    onPress={() =>
                      setDraftFilters((currentFilters) => ({
                        ...currentFilters,
                        colors: toggleValue(
                          currentFilters.colors,
                          option.value,
                        ),
                      }))
                    }
                    swatch={option.swatch}
                  />
                ))}
              </CollapsibleFilterSection>
            </ScrollView>

            <View className="border-t border-neutral-200 bg-neutral-0 px-lg pb-md pt-sm">
              <View className="flex-row gap-sm">
                <Pressable
                  accessibilityLabel="Clear all product filters"
                  accessibilityRole="button"
                  className="h-[48px] min-w-[112px] cursor-pointer items-center justify-center rounded-md border border-neutral-300 px-md active:bg-neutral-75"
                  disabled={activeFilterCount === 0}
                  focusable
                  onPress={() =>
                    setDraftFilters(cloneCatalogFilters(EMPTY_CATALOG_FILTERS))
                  }
                  style={{ opacity: activeFilterCount === 0 ? 0.45 : 1 }}
                >
                  <Text className="font-montserrat-semibold text-sm text-neutral-700">
                    Clear All
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Apply filters, ${matchingCount} matching products`}
                  accessibilityRole="button"
                  className="h-[48px] flex-1 cursor-pointer items-center justify-center rounded-md bg-brand-primary px-md active:opacity-80"
                  disabled={hasInvalidCustomRange}
                  focusable
                  onPress={() => {
                    onApply(cloneCatalogFilters(draftFilters));
                    onClose();
                  }}
                  style={{ opacity: hasInvalidCustomRange ? 0.5 : 1 }}
                  testID="catalog-filter-apply"
                >
                  <Text className="font-montserrat-bold text-sm text-neutral-0">
                    Apply Filters ({matchingCount})
                  </Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
