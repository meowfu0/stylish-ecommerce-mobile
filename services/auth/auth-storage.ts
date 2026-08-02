import * as SecureStore from "expo-secure-store";

import type { AuthTokens } from "@/services/auth/auth-types";

const ACCESS_TOKEN_KEY = "stylish.auth.access-token";
const AUTH_EMAIL_KEY = "stylish.auth.last-email";
const PENDING_VERIFICATION_EMAIL_KEY =
  "stylish.auth.pending-verification-email";
const REFRESH_TOKEN_KEY = "stylish.auth.refresh-token";

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function saveAuthTokens(tokens: AuthTokens, email?: string) {
  try {
    const writes = [
      SecureStore.setItemAsync(
        ACCESS_TOKEN_KEY,
        tokens.accessToken,
        SECURE_STORE_OPTIONS,
      ),
      SecureStore.setItemAsync(
        REFRESH_TOKEN_KEY,
        tokens.refreshToken,
        SECURE_STORE_OPTIONS,
      ),
    ];

    if (email) {
      writes.push(
        SecureStore.setItemAsync(
          AUTH_EMAIL_KEY,
          email.trim().toLowerCase(),
          SECURE_STORE_OPTIONS,
        ),
      );
    }

    await Promise.all(writes);
  } catch (error) {
    await clearAuthTokens();
    throw error;
  }
}

export async function clearAuthTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS),
    SecureStore.deleteItemAsync(AUTH_EMAIL_KEY, SECURE_STORE_OPTIONS),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS),
  ]);
}

export async function clearSessionTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS),
  ]);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS);
}

export async function getLastAuthEmail() {
  return SecureStore.getItemAsync(AUTH_EMAIL_KEY, SECURE_STORE_OPTIONS);
}

export async function savePendingVerificationEmail(email: string) {
  await SecureStore.setItemAsync(
    PENDING_VERIFICATION_EMAIL_KEY,
    email.trim().toLowerCase(),
    SECURE_STORE_OPTIONS,
  );
}

export async function getPendingVerificationEmail() {
  return SecureStore.getItemAsync(
    PENDING_VERIFICATION_EMAIL_KEY,
    SECURE_STORE_OPTIONS,
  );
}

export async function clearPendingVerificationEmail() {
  await SecureStore.deleteItemAsync(
    PENDING_VERIFICATION_EMAIL_KEY,
    SECURE_STORE_OPTIONS,
  );
}
