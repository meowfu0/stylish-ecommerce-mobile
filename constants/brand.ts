/**
 * Single source of truth for user-facing brand naming. Copy should read from
 * here rather than hardcoding the name, so a future rename is one edit.
 *
 * Technical identifiers (component names, CSS prefixes, storage keys, deep-link
 * schemes) intentionally stay as they are; they are not user-facing and
 * renaming them would churn unrelated code.
 */
export const BRAND = {
  /** Display name used throughout the product. */
  name: "Velori",
  /** Legal/footer entity. */
  legalName: "Velori Studio",
  /** Positioning line shown on auth and marketing surfaces. */
  descriptor: "multi-vendor fashion marketplace",
} as const;
