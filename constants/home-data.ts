export type HomeCategory = {
  id: string;
  image: number;
  imageLabel: string;
  name: string;
};

export type HomeProduct = {
  description: string;
  discount: string;
  id: string;
  image: number;
  imageLabel: string;
  originalPrice: string;
  price: string;
  rating?: number;
  reviewCount?: string;
  title: string;
};

export type HomeProductSort =
  | "name-ascending"
  | "price-ascending"
  | "price-descending"
  | "recommended";

export type HomeProductPriceFilter =
  | "all"
  | "from-1000-to-2000"
  | "over-2000"
  | "under-1000";

export const HOME_PRODUCT_SORT_OPTIONS = [
  {
    description: "Keep the original featured order.",
    label: "Recommended",
    value: "recommended",
  },
  {
    description: "Show the most affordable products first.",
    label: "Price: Low to High",
    value: "price-ascending",
  },
  {
    description: "Show the highest-priced products first.",
    label: "Price: High to Low",
    value: "price-descending",
  },
  {
    description: "Arrange products alphabetically.",
    label: "Product Name: A to Z",
    value: "name-ascending",
  },
] as const satisfies readonly {
  description: string;
  label: string;
  value: HomeProductSort;
}[];

export const HOME_PRODUCT_PRICE_FILTER_OPTIONS = [
  {
    description: "Show products from every price range.",
    label: "All Prices",
    value: "all",
  },
  {
    description: "Show products priced below ₱1,000.",
    label: "Under ₱1,000",
    value: "under-1000",
  },
  {
    description: "Show products from ₱1,000 through ₱2,000.",
    label: "₱1,000–₱2,000",
    value: "from-1000-to-2000",
  },
  {
    description: "Show products priced above ₱2,000.",
    label: "Above ₱2,000",
    value: "over-2000",
  },
] as const satisfies readonly {
  description: string;
  label: string;
  value: HomeProductPriceFilter;
}[];

function getNumericPrice(price: string) {
  return Number(price.replace(/[^\d.]/g, ""));
}

export function applyHomeProductOptions<
  Product extends Pick<HomeProduct, "price" | "title">,
>(
  products: readonly Product[],
  sort: HomeProductSort,
  priceFilter: HomeProductPriceFilter,
) {
  const filteredProducts = products.filter((product) => {
    const price = getNumericPrice(product.price);

    switch (priceFilter) {
      case "under-1000":
        return price < 1000;
      case "from-1000-to-2000":
        return price >= 1000 && price <= 2000;
      case "over-2000":
        return price > 2000;
      default:
        return true;
    }
  });

  return [...filteredProducts].sort((firstProduct, secondProduct) => {
    switch (sort) {
      case "price-ascending":
        return (
          getNumericPrice(firstProduct.price) -
          getNumericPrice(secondProduct.price)
        );
      case "price-descending":
        return (
          getNumericPrice(secondProduct.price) -
          getNumericPrice(firstProduct.price)
        );
      case "name-ascending":
        return firstProduct.title.localeCompare(secondProduct.title);
      default:
        return 0;
    }
  });
}

export const HOME_CATEGORIES = [
  {
    id: "beauty",
    image: require("@/assets/images/home/category-beauty.jpg"),
    imageLabel: "Beauty products",
    name: "Beauty",
  },
  {
    id: "fashion",
    image: require("@/assets/images/home/category-fashion.jpg"),
    imageLabel: "Fashion accessories",
    name: "Fashion",
  },
  {
    id: "kids",
    image: require("@/assets/images/home/category-kids.jpg"),
    imageLabel: "Kids fashion",
    name: "Kids",
  },
  {
    id: "mens",
    image: require("@/assets/images/home/category-men.jpg"),
    imageLabel: "Mens fashion",
    name: "Mens",
  },
  {
    id: "womens",
    image: require("@/assets/images/home/category-women.jpg"),
    imageLabel: "Womens fashion",
    name: "Womens",
  },
  {
    id: "gifts",
    image: require("@/assets/images/home/category-gifts.jpg"),
    imageLabel: "Gift collection",
    name: "Gifts",
  },
] as const satisfies readonly HomeCategory[];

export const FEATURED_PRODUCTS = [
  {
    description: "Neque porro quisquam est qui dolorem ipsum quia",
    discount: "40% Off",
    id: "women-printed-kurta",
    image: require("@/assets/images/home/featured-3.jpg"),
    imageLabel: "Woman wearing a printed floral kurta",
    originalPrice: "₱2,499",
    price: "₱1,500",
    rating: 4.5,
    reviewCount: "56,890",
    title: "Women Printed Kurta",
  },
  {
    description: "Neque porro quisquam est qui dolorem ipsum quia",
    discount: "50% Off",
    id: "hrx-shoes",
    image: require("@/assets/images/home/featured-4.png"),
    imageLabel: "White, black, and red HRX high-top shoe",
    originalPrice: "₱4,999",
    price: "₱2,499",
    rating: 4.5,
    reviewCount: "344,567",
    title: "HRX by Hrithik Roshan",
  },
  {
    description: "Hair straightening brush with keratin ceramic coating",
    discount: "50% Off",
    id: "philips-hair-brush",
    image: require("@/assets/images/home/featured-5.png"),
    imageLabel: "Woman using a Philips hair straightening brush",
    originalPrice: "₱1,999",
    price: "₱999",
    rating: 4.5,
    reviewCount: "646,776",
    title: "Philips BHH880/10",
  },
  {
    description: "Classic black analog watch for men",
    discount: "60% Off",
    id: "titan-watch",
    image: require("@/assets/images/home/featured-8.png"),
    imageLabel: "Black Titan analog watch",
    originalPrice: "₱3,500",
    price: "₱1,500",
    rating: 4.5,
    reviewCount: "15,007",
    title: "TITAN Men Watch-1806N",
  },
] as const satisfies readonly HomeProduct[];

export const TRENDING_PRODUCTS = [
  {
    description: '2021 Pilot’s Watch "SIHH 2019" 44mm',
    discount: "60% off",
    id: "iwc-pilots-watch",
    image: require("@/assets/images/home/trending-1.png"),
    imageLabel: "IWC pilot watch on a world map",
    originalPrice: "₱1,599",
    price: "₱650",
    title: "IWC Schaffhausen",
  },
  {
    description: "For Men and Female",
    discount: "70% off",
    id: "labbin-sneakers",
    image: require("@/assets/images/home/trending-6.png"),
    imageLabel: "White Labbin sneakers",
    originalPrice: "₱1,250",
    price: "₱650",
    title: "Labbin White Sneakers",
  },
  {
    description: "(Set of 3, Beige)",
    discount: "60% off",
    id: "mammon-handbag",
    image: require("@/assets/images/home/trending-7.png"),
    imageLabel: "Woman carrying a blue handbag",
    originalPrice: "₱1,999",
    price: "₱750",
    title: "Mammon Women’s Handbag",
  },
  {
    description: "(Butterfly)",
    discount: "50% off",
    id: "women-wedges",
    image: require("@/assets/images/home/trending-4.png"),
    imageLabel: "Pair of beige wedge sandals",
    originalPrice: "₱1,499",
    price: "₱750",
    title: "Do Bhai Women Wedges Sandal",
  },
  {
    description: "Shade RM1 (4.7gm)",
    discount: "60% off",
    id: "lakme-lipstick",
    image: require("@/assets/images/home/trending-5.png"),
    imageLabel: "Lakme red matte lipstick",
    originalPrice: "₱1,990",
    price: "₱950",
    title: "Lakme Enrich Matte Lipstick",
  },
] as const satisfies readonly HomeProduct[];
