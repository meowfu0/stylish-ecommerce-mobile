export const colors = {
  brand: {
    primary: "#F83758",
    blue: "#4392F9",
    blueSoft: "#CFE2FC",
    pinkSoft: "#F8BCC6",
  },
  neutral: {
    0: "#FFFFFF",
    100: "#F5F5F5",
    300: "#C4C4C4",
    400: "#A8A8A9",
    450: "#A0A0A1",
    500: "#687076",
    700: "#3A3D40",
    900: "#11181C",
    1000: "#000000",
  },
  ink: {
    primary: "#17223B",
  },
} as const;

export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const typography = {
  fontFamily: {
    sans: "System",
    serif: "serif",
    montserratSemibold: "Montserrat_600SemiBold",
    montserratExtrabold: "Montserrat_800ExtraBold",
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    action: 18,
    lg: 20,
    xl: 24,
    onboardingBody: 14,
    onboardingTitle: 24,
    display: 40,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    action: 22,
    lg: 28,
    xl: 32,
    onboardingBody: 24,
    onboardingTitle: 29,
    display: 48,
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
} as const;

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
