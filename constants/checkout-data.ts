export type CheckoutAddress = {
  addressLine: string;
  contact: string;
  id: string;
  label: string;
};

export type CheckoutLineItem = {
  id: string;
  image: number;
  imageLabel: string;
  oldPrice: number;
  price: number;
  quantity: number;
  rating: number;
  title: string;
  variants: readonly string[];
};

export const MOCK_DELIVERY_ADDRESS: CheckoutAddress = {
  addressLine: "216 St Paul's Rd, London N1 2LL, UK",
  contact: "+44-784232",
  id: "mock-home-address",
  label: "Address",
};

export const MOCK_CHECKOUT_ITEMS = [
  {
    id: "womens-casual-wear",
    image: require("@/assets/images/checkout/womens-casual-wear.png"),
    imageLabel: "Woman wearing a dark floral casual dress outdoors",
    oldPrice: 2910,
    price: 1950,
    quantity: 1,
    rating: 4.8,
    title: "Women’s Casual Wear",
    variants: ["Black", "Red"],
  },
  {
    id: "mens-jacket",
    image: require("@/assets/images/checkout/mens-jacket.png"),
    imageLabel: "Man wearing a green casual jacket",
    oldPrice: 3540,
    price: 2550,
    quantity: 1,
    rating: 4.7,
    title: "Men’s Jacket",
    variants: ["Green", "Grey"],
  },
] as const satisfies readonly CheckoutLineItem[];

export function getCheckoutItemTotal(item: CheckoutLineItem) {
  return item.price * item.quantity;
}

export function getCheckoutDiscountPercent(item: CheckoutLineItem) {
  return Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100);
}

export function getCheckoutSubtotal(items: readonly CheckoutLineItem[]) {
  return items.reduce((total, item) => total + getCheckoutItemTotal(item), 0);
}

export function getCheckoutSavings(items: readonly CheckoutLineItem[]) {
  return items.reduce(
    (total, item) => total + (item.oldPrice - item.price) * item.quantity,
    0,
  );
}
