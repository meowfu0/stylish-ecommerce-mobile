import type { TrendingCatalogProduct } from "@/constants/trending-products-data";

export type ProductGalleryItem = {
  id: string;
  image: number;
  imageLabel: string;
};

export type ProductSizeOption = {
  disabled: boolean;
  label: string;
};

export type ProductDetails = {
  description: string;
  gallery: readonly ProductGalleryItem[];
  id: string;
  originalPrice: number;
  price: number;
  rating: number;
  reviewCount: string;
  sizes: readonly ProductSizeOption[];
  subtitle: string;
  title: string;
};

const NIKE_GALLERY = [
  {
    id: "nike-gallery-one",
    image: require("@/assets/images/product-details/nike-gallery-1.jpg"),
    imageLabel:
      "Black, white, and orange Nike sneakers worn against a city backdrop",
  },
  {
    id: "nike-gallery-two",
    image: require("@/assets/images/product-details/nike-gallery-2.jpg"),
    imageLabel: "Nike sneaker shown from a second angle",
  },
  {
    id: "nike-gallery-three",
    image: require("@/assets/images/product-details/nike-gallery-3.jpg"),
    imageLabel: "Nike sneaker lifestyle photo",
  },
  {
    id: "nike-gallery-four",
    image: require("@/assets/images/product-details/nike-gallery-4.jpg"),
    imageLabel: "Nike sneaker detail photo",
  },
  {
    id: "nike-gallery-five",
    image: require("@/assets/images/product-details/nike-gallery-5.jpg"),
    imageLabel: "Nike sneaker alternate lifestyle photo",
  },
] as const satisfies readonly ProductGalleryItem[];

const NIKE_PRODUCT = {
  description:
    'Perhaps the most iconic sneaker of all time, this original "Chicago" colorway is the cornerstone of any sneaker collection. Made famous in 1985 by Michael Jordan, the shoe has stood the test of time and remains one of the most celebrated Air Jordan 1 colorways.',
  gallery: NIKE_GALLERY,
  id: "nike-sneakers",
  originalPrice: 2999,
  price: 1500,
  rating: 4,
  reviewCount: "56,890",
  sizes: [
    { disabled: false, label: "6 UK" },
    { disabled: false, label: "7 UK" },
    { disabled: false, label: "8 UK" },
    { disabled: false, label: "9 UK" },
    { disabled: true, label: "10 UK" },
  ],
  subtitle: "Vision Alta Men’s Shoes Size (All Colours)",
  title: "Nike Sneakers",
} as const satisfies ProductDetails;

export const SIMILAR_PRODUCTS = [
  {
    description: "Nike Air Jordan Retro 1 low mystic black",
    id: "nike-retro-one",
    image: require("@/assets/images/product-details/nike-gallery-3.jpg"),
    imageLabel: "Black Nike sneakers worn outdoors",
    price: "₱1,900",
    rating: 4,
    reviewCount: "46,890",
    title: "Nike Sneakers",
  },
  {
    description: "Mid peach mocha shoes for men in white, black, and pink",
    id: "nike-mid-peach",
    image: require("@/assets/images/product-details/nike-gallery-2.jpg"),
    imageLabel: "White, black, and red Nike sneaker",
    price: "₱1,900",
    rating: 4,
    reviewCount: "256,890",
    title: "Nike Sneakers",
  },
] as const satisfies readonly TrendingCatalogProduct[];

export function getProductDetails(id: string | undefined): ProductDetails {
  return {
    ...NIKE_PRODUCT,
    id: id || NIKE_PRODUCT.id,
  };
}

export function formatPhilippinePeso(value: number) {
  return `₱${value.toLocaleString("en-PH")}`;
}
