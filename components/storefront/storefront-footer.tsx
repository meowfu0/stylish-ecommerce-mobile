import { Pressable, Text, View } from "react-native";

import { StylishLogo } from "@/components/brand/stylish-logo";

type FooterLinkGroup = {
  links: readonly string[];
  title: string;
};

const FOOTER_GROUPS = [
  {
    links: ["New arrivals", "Dresses", "Sets", "Accessories"],
    title: "Shop",
  },
  {
    links: ["Our story", "Journal", "Careers", "Stockists"],
    title: "About",
  },
  {
    links: ["Contact us", "Shipping & returns", "Size guide", "Privacy"],
    title: "Help",
  },
] as const satisfies readonly FooterLinkGroup[];

type StorefrontFooterProps = {
  compact: boolean;
  contentWidth: number;
  onLinkPress: (label: string) => void;
};

export function StorefrontFooter({
  compact,
  contentWidth,
  onLinkPress,
}: StorefrontFooterProps) {
  const groupWidth = compact ? (contentWidth - 16) / 2 : contentWidth * 0.18;

  return (
    <View
      className="items-center bg-ink-footer px-md"
      style={{
        paddingBottom: 32,
        paddingTop: compact ? 48 : 64,
      }}
    >
      <View style={{ width: contentWidth }}>
        <View
          className={`border-b border-neutral-0/15 pb-xxl ${
            compact
              ? "gap-[32px]"
              : "flex-row items-start justify-between gap-[48px]"
          }`}
        >
          <View style={{ maxWidth: compact ? contentWidth : 360 }}>
            <StylishLogo
              testID="storefront-footer-brand-logo"
              width={compact ? 140 : 160}
            />
            <Text className="mt-lg font-montserrat-regular text-sm leading-[24px] text-neutral-300">
              Clothes for making an entrance—or simply making every day feel
              more special.
            </Text>
            <Pressable
              accessibilityRole="link"
              className="mt-md self-start py-xs active:opacity-60"
              onPress={() => onLinkPress("Follow along")}
            >
              <Text className="font-montserrat-bold text-xs uppercase tracking-[1.4px] text-brand-pinkSoft">
                Follow along →
              </Text>
            </Pressable>
          </View>

          <View
            className={
              compact
                ? "flex-row flex-wrap gap-md"
                : "flex-1 flex-row justify-end gap-[48px]"
            }
          >
            {FOOTER_GROUPS.map((group) => (
              <View key={group.title} style={{ width: groupWidth }}>
                <Text className="font-montserrat-bold text-micro uppercase tracking-[1.8px] text-brand-pinkSoft">
                  {group.title}
                </Text>
                <View className="mt-md gap-[10px]">
                  {group.links.map((link) => (
                    <Pressable
                      accessibilityRole="link"
                      className="self-start py-[2px] active:opacity-60"
                      key={link}
                      onPress={() => onLinkPress(link)}
                    >
                      <Text className="font-montserrat-regular text-sm text-neutral-300">
                        {link}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View
          className={`pt-lg ${
            compact ? "gap-[12px]" : "flex-row items-center justify-between"
          }`}
        >
          <Text className="font-montserrat-medium text-micro uppercase tracking-[1.2px] text-neutral-400">
            © 2026 Stylish Studio
          </Text>
          <View className="flex-row gap-[20px]">
            {["Terms", "Privacy", "Accessibility"].map((link) => (
              <Pressable
                accessibilityRole="link"
                className="py-[2px] active:opacity-60"
                key={link}
                onPress={() => onLinkPress(link)}
              >
                <Text className="font-montserrat-medium text-micro uppercase tracking-[1.2px] text-neutral-400">
                  {link}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
