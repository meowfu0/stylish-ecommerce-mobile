export type StorefrontCategory = {
  id: string;
  image: number;
  imageLabel: string;
  name: string;
  searchQuery: string;
};

export type StorefrontProduct = {
  description: string;
  id: string;
  image: number;
  imageLabel: string;
  price: string;
  title: string;
};

export const STOREFRONT_CATEGORIES = [
  {
    id: "new-in",
    image: require("@/assets/images/storefront/new-in.jpg"),
    imageLabel: "Woman in a bright pink dress seated by a pale blue wall",
    name: "New in",
    searchQuery: "new arrivals",
  },
  {
    id: "dresses",
    image: require("@/assets/images/storefront/dresses.jpg"),
    imageLabel: "Woman wearing a floral dress against a lavender backdrop",
    name: "Dresses",
    searchQuery: "dress",
  },
  {
    id: "sets",
    image: require("@/assets/images/storefront/sets.jpg"),
    imageLabel: "Woman wearing a coordinated neutral outfit",
    name: "Sets",
    searchQuery: "sets",
  },
  {
    id: "accessories",
    image: require("@/assets/images/storefront/accessories.jpg"),
    imageLabel: "Woman holding flowers and wearing layered accessories",
    name: "Accessories",
    searchQuery: "accessories",
  },
] as const satisfies readonly StorefrontCategory[];

export const STOREFRONT_TRENDING_PRODUCTS = [
  {
    description: "A fluid occasion dress with a softly gathered silhouette.",
    id: "rosette-bias-dress",
    image: require("@/assets/images/storefront/rosette-bias-dress.jpg"),
    imageLabel: "Woman wearing the pink Rosette Bias Dress",
    price: "₱8,500",
    title: "Rosette Bias Dress",
  },
  {
    description: "A polished neutral blazer shaped for everyday layering.",
    id: "mila-tailored-blazer",
    image: require("@/assets/images/storefront/mila-tailored-blazer.jpg"),
    imageLabel: "Woman wearing the neutral Mila Tailored Blazer",
    price: "₱10,900",
    title: "Mila Tailored Blazer",
  },
  {
    description: "A playful floral knit with a relaxed, comfortable fit.",
    id: "lena-flower-knit",
    image: require("@/assets/images/storefront/lena-flower-knit.jpg"),
    imageLabel: "Woman wearing the floral Lena Flower Knit",
    price: "₱5,500",
    title: "Lena Flower Knit",
  },
  {
    description: "A versatile slip skirt designed for effortless movement.",
    id: "amour-slip-skirt",
    image: require("@/assets/images/storefront/amour-slip-skirt.jpg"),
    imageLabel: "Woman modeling the Amour Slip Skirt during a photo shoot",
    price: "₱6,400",
    title: "Amour Slip Skirt",
  },
] as const satisfies readonly StorefrontProduct[];

export const STOREFRONT_NEW_ARRIVALS = [
  {
    description: "A softly structured top finished with sculptural ruffles.",
    id: "dahlia-ruffle-top",
    image: require("@/assets/images/storefront/dahlia-ruffle-top.jpg"),
    imageLabel: "Woman wearing the Dahlia Ruffle Top",
    price: "₱4,500",
    title: "Dahlia Ruffle Top",
  },
  {
    description: "A romantic midi dress with dimensional rosebud details.",
    id: "rosebud-midi-dress",
    image: require("@/assets/images/storefront/rosebud-midi-dress.jpg"),
    imageLabel: "Woman wearing the Rosebud Midi Dress",
    price: "₱9,500",
    title: "Rosebud Midi Dress",
  },
  {
    description: "A compact shoulder bag for polished everyday styling.",
    id: "petal-shoulder-bag",
    image: require("@/assets/images/storefront/petal-shoulder-bag.jpg"),
    imageLabel: "Petal Shoulder Bag shown during a fashion photo shoot",
    price: "₱5,100",
    title: "Petal Shoulder Bag",
  },
  {
    description: "Flowing wide-leg trousers with a clean tailored finish.",
    id: "celine-wide-leg-pant",
    image: require("@/assets/images/storefront/celine-wide-leg-pant.jpg"),
    imageLabel: "Woman wearing the Celine Wide Leg Pant",
    price: "₱7,100",
    title: "Celine Wide Leg Pant",
  },
] as const satisfies readonly StorefrontProduct[];

export const STOREFRONT_EDITORIAL_IMAGE = require("@/assets/images/storefront/behind-the-scenes.jpg");
