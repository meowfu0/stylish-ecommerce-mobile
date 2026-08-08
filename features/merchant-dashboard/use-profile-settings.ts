import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resolveDashboardDataState } from "@/features/merchant-dashboard/dashboard-state-model";
import type { DashboardDataState } from "@/features/merchant-dashboard/dashboard-types";
import {
  loadProfileWorkspace,
  type MerchantProfile,
  type NotificationKey,
  type NotificationPreferences,
  type ProfileWorkspaceSnapshot,
  type SecurityInfo,
  type StorePreferences,
} from "@/features/merchant-dashboard/profile-settings-demo-data";

/**
 * Loading, editing and preference state for the Merchant Profile and Settings
 * workspaces.
 *
 * The split here matters, because the document draws it explicitly. Profile
 * edits and preference toggles are demo state and update immediately; anything
 * that would need real auth — changing a password, revoking a session,
 * deactivating the store — deliberately changes *nothing*, so the UI can be
 * seen without pretending a security action happened.
 *
 * `validateProfile` is pure so it can become the request body validator when a
 * profile endpoint exists, and the hook keeps its shape when `loadProfile` is
 * swapped for a real call.
 */

/* ------------------------------------------------------------------ */
/* Profile form                                                        */
/* ------------------------------------------------------------------ */

export type ProfileFormValues = {
  addressLine: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  description: string;
  postalCode: string;
  storeName: string;
};

export type ProfileFormErrors = Partial<
  Record<keyof ProfileFormValues, string>
>;

export const DESCRIPTION_LIMIT = 280;

export function profileFormValues(profile: MerchantProfile): ProfileFormValues {
  return {
    addressLine: profile.addressLine,
    city: profile.city,
    contactEmail: profile.contactEmail,
    contactPhone: profile.contactPhone,
    country: profile.country,
    description: profile.description,
    postalCode: profile.postalCode,
    storeName: profile.storeName,
  };
}

export function validateProfile(values: ProfileFormValues): ProfileFormErrors {
  const errors: ProfileFormErrors = {};
  const name = values.storeName.trim();
  const email = values.contactEmail.trim();
  const phone = values.contactPhone.trim();

  if (name.length === 0) errors.storeName = "Enter a store name";
  else if (name.length < 2) errors.storeName = "Use at least 2 characters";

  if (email.length === 0) errors.contactEmail = "Enter a contact email";
  // Deliberately permissive: a server is the only real authority on whether an
  // address exists, so this catches obvious typos and nothing more.
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.contactEmail = "Enter a valid email address";
  }

  if (phone.length === 0) errors.contactPhone = "Enter a contact number";
  else if (phone.replace(/\D/g, "").length < 7) {
    errors.contactPhone = "Enter a complete phone number";
  }

  if (values.addressLine.trim().length === 0) {
    errors.addressLine = "Enter a street address";
  }
  if (values.city.trim().length === 0) errors.city = "Enter a city";

  if (values.description.length > DESCRIPTION_LIMIT) {
    errors.description = `Keep the description under ${DESCRIPTION_LIMIT} characters`;
  }

  return errors;
}

export function hasErrors(errors: ProfileFormErrors) {
  return Object.values(errors).some((message) => message !== undefined);
}

/** The saved shape, with the whitespace a text field inevitably collects gone. */
export function profileFrom(
  values: ProfileFormValues,
  current: MerchantProfile,
): MerchantProfile {
  return {
    ...current,
    addressLine: values.addressLine.trim(),
    city: values.city.trim(),
    contactEmail: values.contactEmail.trim(),
    contactPhone: values.contactPhone.trim(),
    country: values.country.trim(),
    description: values.description.trim(),
    postalCode: values.postalCode.trim(),
    storeName: values.storeName.trim(),
  };
}

/** Whether anything actually changed, so Save can be disabled when nothing did. */
export function isDirty(
  values: ProfileFormValues,
  profile: MerchantProfile,
): boolean {
  const original = profileFormValues(profile);
  return (Object.keys(original) as (keyof ProfileFormValues)[]).some(
    (key) => values[key].trim() !== original[key].trim(),
  );
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * The security actions that exist in the UI but cannot do anything yet. Naming
 * them as a type keeps the "integration-ready" notice honest: every one of these
 * shows the same explanation instead of a fabricated success.
 */
export type PendingIntegration =
  "change-password" | "deactivate-store" | "revoke-sessions";

export const integrationCopy: Record<PendingIntegration, string> = {
  "change-password":
    "Changing a password needs the account service, so this button does not change your credentials yet.",
  "deactivate-store":
    "Deactivating a store is a backend operation. Nothing was deactivated — this dialog is here so the flow can be reviewed.",
  "revoke-sessions":
    "Revoking a session needs the auth service, so no session was signed out.",
};

export type ProfileSettingsWorkspace = {
  dataState: DashboardDataState;
  notifications: NotificationPreferences;
  pending: PendingIntegration | null;
  preferences: StorePreferences;
  profile: MerchantProfile | null;
  retry: () => void;
  saveProfile: (values: ProfileFormValues) => void;
  security: SecurityInfo | null;
  setPending: (pending: PendingIntegration | null) => void;
  setPreference: <Key extends keyof StorePreferences>(
    key: Key,
    value: StorePreferences[Key],
  ) => void;
  toggleNotification: (key: NotificationKey) => void;
};

export function useProfileSettings({
  enabled,
  loadProfile = loadProfileWorkspace,
}: {
  enabled: boolean;
  loadProfile?: () => Promise<ProfileWorkspaceSnapshot>;
}): ProfileSettingsWorkspace {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<ProfileWorkspaceSnapshot | null>(
    null,
  );
  const [pending, setPending] = useState<PendingIntegration | null>(null);
  const loadRef = useRef(loadProfile);
  loadRef.current = loadProfile;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setFailed(false);
        setSnapshot(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, enabled]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  const saveProfile = useCallback((values: ProfileFormValues) => {
    setSnapshot((current) =>
      current
        ? { ...current, profile: profileFrom(values, current.profile) }
        : current,
    );
  }, []);

  const toggleNotification = useCallback((key: NotificationKey) => {
    setSnapshot((current) =>
      current
        ? {
            ...current,
            notifications: {
              ...current.notifications,
              [key]: !current.notifications[key],
            },
          }
        : current,
    );
  }, []);

  const setPreference = useCallback(
    <Key extends keyof StorePreferences>(
      key: Key,
      value: StorePreferences[Key],
    ) => {
      setSnapshot((current) =>
        current
          ? {
              ...current,
              preferences: { ...current.preferences, [key]: value },
            }
          : current,
      );
    },
    [],
  );

  return useMemo(
    () => ({
      dataState: resolveDashboardDataState({
        failedSectionCount: failed ? 1 : 0,
        hasCatalog: snapshot !== null,
        hasSnapshot: snapshot !== null,
        loading,
        sectionCount: 1,
      }),
      notifications: snapshot?.notifications ?? {
        fulfillment: false,
        lowStock: false,
        orders: false,
        promotions: false,
        reviews: false,
      },
      pending,
      preferences: snapshot?.preferences ?? {
        dateFormat: "MMM D, YYYY",
        defaultLocation: "",
        timezone: "Asia/Manila",
        weekStart: "Monday",
      },
      profile: snapshot?.profile ?? null,
      retry,
      saveProfile,
      security: snapshot?.security ?? null,
      setPending,
      setPreference,
      toggleNotification,
    }),
    [
      failed,
      loading,
      pending,
      retry,
      saveProfile,
      setPreference,
      snapshot,
      toggleNotification,
    ],
  );
}
