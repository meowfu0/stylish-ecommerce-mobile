import { formatPhilippinePeso } from "@/constants/product-details-data";

export type PaymentMethodId =
  | "apple-pay"
  | "mastercard"
  | "paypal"
  | "visa";

export type PaymentMethod = {
  endingIn: string;
  id: PaymentMethodId;
  label: string;
  logo: number;
  logoHeight: number;
  logoWidth: number;
  maskedNumber: string;
};

export type PaymentSummary = {
  orderAmount: number;
  shippingFee: number;
  total: number;
};

export const MOCK_PAYMENT_METHODS = [
  {
    endingIn: "2109",
    id: "visa",
    label: "Visa",
    logo: require("@/assets/images/payment/visa.png"),
    logoHeight: 20,
    logoWidth: 48,
    maskedNumber: "•••••••••2109",
  },
  {
    endingIn: "2109",
    id: "paypal",
    label: "PayPal",
    logo: require("@/assets/images/payment/paypal.png"),
    logoHeight: 20,
    logoWidth: 63,
    maskedNumber: "•••••••••2109",
  },
  {
    endingIn: "2109",
    id: "mastercard",
    label: "Mastercard",
    logo: require("@/assets/images/payment/mastercard.png"),
    logoHeight: 20,
    logoWidth: 20,
    maskedNumber: "•••••••••2109",
  },
  {
    endingIn: "2109",
    id: "apple-pay",
    label: "Apple Pay",
    logo: require("@/assets/images/payment/apple-pay.png"),
    logoHeight: 24,
    logoWidth: 24,
    maskedNumber: "•••••••••2109",
  },
] as const satisfies readonly PaymentMethod[];

export const MOCK_PAYMENT_SHIPPING_FEE = 30;
export const MOCK_PAYMENT_ORDER_AMOUNT = 7000;

export function calculatePaymentSummary(
  orderAmount = MOCK_PAYMENT_ORDER_AMOUNT,
): PaymentSummary {
  return {
    orderAmount,
    shippingFee: MOCK_PAYMENT_SHIPPING_FEE,
    total: orderAmount + MOCK_PAYMENT_SHIPPING_FEE,
  };
}

export function formatPaymentPrice(value: number) {
  return formatPhilippinePeso(value, { separateSymbol: true });
}
