import type { AuthTokens } from "@/services/auth/auth-types";

const ACCESS_TOKEN_KEY = "stylish.auth.access-token";
const AUTH_EMAIL_KEY = "stylish.auth.last-email";
const PENDING_VERIFICATION_EMAIL_KEY =
  "stylish.auth.pending-verification-email";
const REFRESH_TOKEN_KEY = "stylish.auth.refresh-token";
const memoryStore = new Map<string, string>();

function read(key: string) {
  if (typeof sessionStorage === "undefined") {
    return memoryStore.get(key) ?? null;
  }

  return sessionStorage.getItem(key);
}

function write(key: string, value: string) {
  if (typeof sessionStorage === "undefined") {
    memoryStore.set(key, value);
    return;
  }

  sessionStorage.setItem(key, value);
}

function remove(key: string) {
  memoryStore.delete(key);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(key);
  }
}

export async function saveAuthTokens(tokens: AuthTokens, email?: string) {
  memoryStore.set(ACCESS_TOKEN_KEY, tokens.accessToken);
  write(REFRESH_TOKEN_KEY, tokens.refreshToken);
  if (email) {
    write(AUTH_EMAIL_KEY, email.trim().toLowerCase());
  }
}

export async function clearAuthTokens() {
  remove(ACCESS_TOKEN_KEY);
  remove(AUTH_EMAIL_KEY);
  remove(REFRESH_TOKEN_KEY);
}

export async function clearSessionTokens() {
  remove(ACCESS_TOKEN_KEY);
  remove(REFRESH_TOKEN_KEY);
}

export async function getAccessToken() {
  return memoryStore.get(ACCESS_TOKEN_KEY) ?? null;
}

export async function getRefreshToken() {
  return read(REFRESH_TOKEN_KEY);
}

export async function getLastAuthEmail() {
  return read(AUTH_EMAIL_KEY);
}

export async function savePendingVerificationEmail(email: string) {
  write(PENDING_VERIFICATION_EMAIL_KEY, email.trim().toLowerCase());
}

export async function getPendingVerificationEmail() {
  return read(PENDING_VERIFICATION_EMAIL_KEY);
}

export async function clearPendingVerificationEmail() {
  remove(PENDING_VERIFICATION_EMAIL_KEY);
}
