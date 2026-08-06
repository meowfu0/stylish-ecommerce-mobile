import { Image } from "expo-image";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  View,
} from "react-native";

import type { ProductGalleryItem } from "@/constants/product-details-data";

type ProductGalleryProps = {
  images: readonly ProductGalleryItem[];
  width: number;
};

export function ProductGallery({ images, width }: ProductGalleryProps) {
  const listRef = useRef<FlatList<ProductGalleryItem>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const imageHeight = (width * 213) / 343;
  const galleryHeight = imageHeight + 22;
  const arrowTop = Math.max(0, (imageHeight - 40) / 2);

  const setIndexFromScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      setActiveIndex(Math.min(images.length - 1, Math.max(0, nextIndex)));
    },
    [images.length, width],
  );

  const moveGallery = (direction: -1 | 1) => {
    const nextIndex = Math.min(
      images.length - 1,
      Math.max(0, activeIndex + direction),
    );

    listRef.current?.scrollToIndex({ animated: true, index: nextIndex });
    setActiveIndex(nextIndex);
  };

  return (
    <View
      accessibilityLabel="Product image gallery"
      style={{ height: galleryHeight, width }}
    >
      <FlatList
        data={[...images]}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          index,
          length: width,
          offset: width * index,
        })}
        horizontal
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={setIndexFromScroll}
        pagingEnabled
        ref={listRef}
        renderItem={({ item }) => (
          <View
            style={{
              borderRadius: 16,
              height: imageHeight,
              overflow: "hidden",
              width,
            }}
            testID="motion-image-frame"
          >
            <Image
              accessibilityLabel={item.imageLabel}
              accessibilityRole="image"
              contentFit="cover"
              recyclingKey={item.id}
              source={item.image}
              style={{ height: "100%", width: "100%" }}
              transition={120}
            />
          </View>
        )}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={width}
        style={{ borderRadius: 16, height: imageHeight, width }}
      />

      {activeIndex > 0 ? (
        <Pressable
          accessibilityLabel="Previous product image"
          accessibilityRole="button"
          className="absolute left-[12px] h-[40px] w-[40px] items-center justify-center rounded-pill bg-neutral-200/90 active:opacity-70"
          hitSlop={6}
          onPress={() => moveGallery(-1)}
          style={{ top: arrowTop }}
        >
          <Image
            accessible={false}
            contentFit="contain"
            source={require("@/assets/icons/product-details/back.svg")}
            style={{ height: 20, width: 20 }}
          />
        </Pressable>
      ) : null}

      {activeIndex < images.length - 1 ? (
        <Pressable
          accessibilityLabel="Next product image"
          accessibilityRole="button"
          className="absolute right-[12px] h-[40px] w-[40px] items-center justify-center rounded-pill bg-neutral-200/90 active:opacity-70"
          hitSlop={6}
          onPress={() => moveGallery(1)}
          style={{ top: arrowTop }}
        >
          <Image
            accessible={false}
            contentFit="contain"
            source={require("@/assets/icons/product-details/back.svg")}
            style={{
              height: 20,
              transform: [{ rotate: "180deg" }],
              width: 20,
            }}
          />
        </Pressable>
      ) : null}

      <View
        accessible
        accessibilityLabel={`Image ${activeIndex + 1} of ${images.length}`}
        className="absolute bottom-0 left-0 right-0 h-[10px] flex-row items-center justify-center gap-[4px]"
      >
        {images.map((image, index) => (
          <View
            className={`h-[8px] w-[8px] rounded-pill ${
              index === activeIndex ? "bg-brand-primary" : "bg-neutral-300"
            }`}
            key={image.id}
          />
        ))}
      </View>
    </View>
  );
}
