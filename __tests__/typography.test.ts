import { typography } from "@/constants/design-tokens";

const canonicalVariants = [
  "displayLarge",
  "display",
  "headingLarge",
  "headingMedium",
  "headingSmall",
  "bodyLarge",
  "bodyMedium",
  "bodySmall",
  "label",
  "caption",
  "button",
  "link",
  "input",
  "validation",
  "price",
  "priceLarge",
] as const;

describe("Stylish typography tokens", () => {
  it("uses Montserrat for every supported weight", () => {
    expect(Object.values(typography.fontFamily)).toEqual(
      expect.arrayContaining([
        "Montserrat_400Regular",
        "Montserrat_500Medium",
        "Montserrat_600SemiBold",
        "Montserrat_700Bold",
        "Montserrat_800ExtraBold",
      ]),
    );

    expect(
      Object.values(typography.fontFamily).every((family) =>
        family.startsWith("Montserrat_"),
      ),
    ).toBe(true);
  });

  it("provides readable line heights for every canonical variant", () => {
    for (const variant of canonicalVariants) {
      expect(typography.lineHeight[variant]).toBeGreaterThanOrEqual(
        typography.fontSize[variant],
      );
    }
  });
});
