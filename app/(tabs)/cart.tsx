import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScrollReveal } from "@/components/animated/scroll-reveal";
import { spacing } from "@/constants/design-tokens";
import { formatPhilippinePeso } from "@/constants/product-details-data";
import {
  getResponsiveContentWidth,
  isDesktopWeb,
} from "@/constants/responsive";
import { selectCartSubtotal, useCartStore } from "@/stores/cart-store";

const FIGMA_CONTENT_WIDTH = 343;

export default function CartScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const subtotal = useCartStore(selectCartSubtotal);
  const desktopWeb = isDesktopWeb(width);
  const contentWidth = getResponsiveContentWidth({
    desktopMax: 960,
    mobileMax: FIGMA_CONTENT_WIDTH,
    width,
  });
  const itemImageSize = desktopWeb ? 128 : 96;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top"]}>
      <StatusBar style="dark" />

      <FlatList
        accessibilityLabel="Shopping cart items"
        contentContainerStyle={{
          alignItems: "center",
          flexGrow: 1,
          paddingBottom: desktopWeb ? spacing.xxl : spacing.lg,
        }}
        data={items}
        decelerationRate="normal"
        keyExtractor={(item) => `${item.id}-${item.size}`}
        ListEmptyComponent={
          <View
            className="flex-1 items-center justify-center px-lg"
            style={{ width: contentWidth }}
          >
            <Image
              accessible={false}
              contentFit="contain"
              source={require("@/assets/icons/product-details/cart.svg")}
              style={{ height: 36, width: 36 }}
            />
            <Text
              accessibilityRole="header"
              className="mt-md font-montserrat-semibold text-lg text-neutral-1000"
            >
              Your cart is empty
            </Text>
            <Text className="mt-[8px] text-center font-montserrat-regular text-sm text-neutral-600">
              Add a product and it will appear here.
            </Text>
          </View>
        }
        ListFooterComponent={
          items.length > 0 ? (
            <ScrollReveal style={{ width: contentWidth }}>
              <View
                className={`mt-md rounded-md border border-neutral-200 bg-neutral-0 shadow-sm ${
                  desktopWeb ? "p-lg" : "p-md"
                }`}
                style={{ width: contentWidth }}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-montserrat-semibold text-md text-neutral-1000">
                    Subtotal
                  </Text>
                  <Text className="font-montserrat-bold text-lg text-brand-primary">
                    {formatPhilippinePeso(subtotal)}
                  </Text>
                </View>
                <Pressable
                  accessibilityHint="Opens checkout for the items in your cart"
                  accessibilityLabel="Proceed to checkout"
                  accessibilityRole="button"
                  className="mt-md h-[52px] items-center justify-center rounded-input bg-brand-primary active:opacity-80"
                  onPress={() => router.push("/checkout")}
                >
                  <Text className="font-montserrat-semibold text-sm text-neutral-0">
                    Proceed to Checkout
                  </Text>
                </Pressable>
              </View>
            </ScrollReveal>
          ) : null
        }
        ListHeaderComponent={
          <View
            className={desktopWeb ? "pb-lg pt-xl" : "h-[56px] justify-center"}
            style={{ width: contentWidth }}
          >
            <Text
              accessibilityRole="header"
              className={`font-montserrat-semibold text-neutral-1000 ${
                desktopWeb ? "text-[32px] leading-[40px]" : "text-xl"
              }`}
            >
              Shopping Cart
            </Text>
            {desktopWeb ? (
              <Text className="mt-xs font-montserrat-regular text-sm text-neutral-600">
                Review your selections and quantities before checkout.
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ index, item }) => (
          <ScrollReveal
            staggerIndex={index % 4}
            style={{ marginBottom: 12, width: contentWidth }}
          >
            <View
              className={`flex-row rounded-md border border-neutral-200 bg-neutral-0 shadow-sm ${
                desktopWeb ? "p-lg" : "p-[12px]"
              }`}
              style={{ width: contentWidth }}
              testID="motion-card"
            >
              <View
                style={{
                  borderRadius: 8,
                  height: itemImageSize,
                  overflow: "hidden",
                  width: itemImageSize,
                }}
                testID="motion-image-frame"
              >
                <Image
                  accessibilityLabel={item.title}
                  contentFit="cover"
                  recyclingKey={`${item.id}-${item.size}`}
                  source={item.image}
                  style={{ height: "100%", width: "100%" }}
                />
              </View>
              <View
                className={desktopWeb ? "ml-lg flex-1" : "ml-[12px] flex-1"}
              >
                <Text
                  className="font-montserrat-semibold text-sm text-neutral-1000"
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text className="mt-[4px] font-montserrat-regular text-xs text-neutral-475">
                  Size {item.size}
                </Text>
                <Text className="mt-[6px] font-montserrat-semibold text-sm text-brand-primary">
                  {formatPhilippinePeso(item.price)}
                </Text>
                <View className="mt-auto flex-row items-center">
                  <Pressable
                    accessibilityLabel={`Decrease ${item.title} quantity`}
                    accessibilityRole="button"
                    className="h-[30px] w-[30px] items-center justify-center rounded-[4px] border border-neutral-300 active:opacity-60"
                    onPress={() => decrementItem(item.id, item.size)}
                  >
                    <Text className="font-montserrat-semibold text-md text-neutral-1000">
                      −
                    </Text>
                  </Pressable>
                  <Text
                    accessibilityLabel={`Quantity ${item.quantity}`}
                    className="w-[38px] text-center font-montserrat-semibold text-sm text-neutral-1000"
                  >
                    {item.quantity}
                  </Text>
                  <Pressable
                    accessibilityLabel={`Increase ${item.title} quantity`}
                    accessibilityRole="button"
                    className="h-[30px] w-[30px] items-center justify-center rounded-[4px] border border-neutral-300 active:opacity-60"
                    onPress={() =>
                      addItem({
                        id: item.id,
                        image: item.image,
                        price: item.price,
                        size: item.size,
                        title: item.title,
                      })
                    }
                  >
                    <Text className="font-montserrat-semibold text-md text-neutral-1000">
                      +
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Remove ${item.title} from cart`}
                    accessibilityRole="button"
                    className="ml-auto px-[4px] py-[6px] active:opacity-60"
                    onPress={() => removeItem(item.id, item.size)}
                  >
                    <Text className="font-montserrat-medium text-xs text-brand-primary">
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollReveal>
        )}
        showsVerticalScrollIndicator={desktopWeb}
      />
    </SafeAreaView>
  );
}
