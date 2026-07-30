import { Platform } from "react-native";

export const DESKTOP_WEB_BREAKPOINT = 1024;
export const DESKTOP_WEB_CONTENT_WIDTH = 1280;
export const DESKTOP_WEB_GUTTER = 32;

export function isDesktopWeb(width: number) {
  return Platform.OS === "web" && width >= DESKTOP_WEB_BREAKPOINT;
}

export function getResponsiveContentWidth({
  desktopMax = DESKTOP_WEB_CONTENT_WIDTH,
  mobileGutter = 16,
  mobileMax,
  width,
}: {
  desktopMax?: number;
  mobileGutter?: number;
  mobileMax: number;
  width: number;
}) {
  if (isDesktopWeb(width)) {
    return Math.min(desktopMax, Math.max(0, width - DESKTOP_WEB_GUTTER * 2));
  }

  return Math.min(mobileMax, Math.max(0, width - mobileGutter * 2));
}
