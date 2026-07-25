import { formatPhilippinePeso } from "@/constants/product-details-data";

export type PlaceOrderProduct = {
  deliveryDate: string;
  deliveryFee: number;
  id: string;
  image: number;
  imageLabel: string;
  quantities: readonly number[];
  sizes: readonly string[];
  subtitle: string;
  title: string;
  unitPrice: number;
};

export type PlaceOrderCoupon = {
  code: string;
  description: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  id: string;
  maximumDiscount?: number;
};

export type PlaceOrderTotals = {
  couponDiscount: number;
  deliveryFee: number;
  orderTotal: number;
  subtotal: number;
};

export const MOCK_PLACE_ORDER_PRODUCT = {
  deliveryDate: "10 May 2XXX",
  deliveryFee: 0,
  id: "womens-casual-wear",
  image: require("@/assets/images/place-order/womens-casual-wear.png"),
  imageLabel: "Woman wearing a dark floral casual dress outdoors",
  quantities: [1, 2, 3, 4, 5],
  sizes: ["38", "40", "42", "44"],
  subtitle: "Checked Single-Breasted Blazer",
  title: "Women’s Casual Wear",
  unitPrice: 7000,
} as const satisfies PlaceOrderProduct;

export const MOCK_PLACE_ORDER_COUPONS = [
  {
    code: "STYLE10",
    description: "Save 10%, up to ₱500, on this temporary order.",
    discountType: "percentage",
    discountValue: 10,
    id: "style-10",
    maximumDiscount: 500,
  },
  {
    code: "SAVE200",
    description: "Save ₱200 on this temporary order.",
    discountType: "fixed",
    discountValue: 200,
    id: "save-200",
  },
] as const satisfies readonly PlaceOrderCoupon[];

export function formatPlaceOrderPrice(value: number) {
  return formatPhilippinePeso(value, {
    includeCents: true,
    separateSymbol: true,
  });
}

export function calculateCouponDiscount(
  subtotal: number,
  coupon: PlaceOrderCoupon | null,
) {
  if (!coupon) {
    return 0;
  }

  if (coupon.discountType === "fixed") {
    return Math.min(subtotal, coupon.discountValue);
  }

  const percentageDiscount = (subtotal * coupon.discountValue) / 100;
  const cappedDiscount = coupon.maximumDiscount
    ? Math.min(percentageDiscount, coupon.maximumDiscount)
    : percentageDiscount;

  return Math.min(subtotal, Math.round(cappedDiscount));
}

export function calculatePlaceOrderTotals(
  product: PlaceOrderProduct,
  quantity: number,
  coupon: PlaceOrderCoupon | null,
): PlaceOrderTotals {
  const subtotal = product.unitPrice * quantity;
  const couponDiscount = calculateCouponDiscount(subtotal, coupon);
  const deliveryFee = product.deliveryFee;

  return {
    couponDiscount,
    deliveryFee,
    orderTotal: subtotal - couponDiscount + deliveryFee,
    subtotal,
  };
}
