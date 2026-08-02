export function formatPeso(
  centavos: number,
  options: { compact?: boolean; decimals?: boolean } = {},
) {
  const pesos = centavos / 100;

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

export function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
