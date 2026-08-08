import type { DateRange } from "@/features/merchant-dashboard/dashboard-types";

export function formatPeso(
  centavos: number,
  options: { compact?: boolean; decimals?: boolean } = {},
) {
  // A missing analytics field must not reach the merchant as "₱NaN".
  const pesos = (Number.isFinite(centavos) ? centavos : 0) / 100;

  if (options.compact && Math.abs(pesos) >= 1000) {
    return new Intl.NumberFormat("en-PH", {
      currency: "PHP",
      maximumFractionDigits: 1,
      notation: "compact",
      style: "currency",
    }).format(pesos);
  }

  const digits = options.decimals === false ? 0 : 2;
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
    style: "currency",
  }).format(pesos);
}

/**
 * Human labels for the dashboard date range. Shared so the header and the
 * chart description always name the same range.
 */
export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  mtd: "Month to date",
};

/**
 * Renders an ISO order date as `Aug 1, 2026`. Orders keep the ISO value so the
 * table can sort on it exactly instead of parsing display text.
 */
export function formatOrderDate(iso: string) {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;

  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(parsed);
}

/** Counts (orders, units) — grouped, never fractional. */
export function formatCount(value: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
