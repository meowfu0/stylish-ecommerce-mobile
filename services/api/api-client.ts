import {
  clearSessionTokens,
  getAccessToken,
  getLastAuthEmail,
  getRefreshToken,
  saveAuthTokens,
} from "@/services/auth/auth-storage";
import type { LoginResult } from "@/services/auth/auth-types";
import {
  AuthRequestError,
  classifyApiError,
  networkAuthError,
  type ApiErrorEnvelope,
} from "@/services/auth/auth-error";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { useAuthWorkspaceStore } from "@/stores/auth-workspace-store";

const DEFAULT_API_URL = "http://localhost:3000/api";
const REQUEST_TIMEOUT_MS = 12_000;

const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(
  /\/+$/,
  "",
);

export type ApiEnvelope<T> = {
  data: T;
  message: string;
  success: true;
};

type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  auth?: boolean;
  headers?: Record<string, string>;
  retryOnUnauthorized?: boolean;
  timeoutMs?: number;
};

let refreshPromise: Promise<string> | null = null;

export function getApiBaseUrl() {
  return apiUrl;
}

async function invalidateLocalSession() {
  await clearSessionTokens().catch(() => undefined);
  useAuthWorkspaceStore.getState().clearWorkspace();
  useAuthSessionStore.getState().setUnauthenticated("session-expired");
}

async function fetchEnvelope<T>(
  path: string,
  options: ApiRequestOptions,
  accessToken?: string | null,
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? REQUEST_TIMEOUT_MS,
  );
  const protectedRequest = options.auth === true;
  const headers = options.headers;
  const requestOptions = { ...options };
  delete requestOptions.auth;
  delete requestOptions.headers;
  delete requestOptions.retryOnUnauthorized;
  delete requestOptions.timeoutMs;

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      ...requestOptions,
      headers: {
        Accept: "application/json",
        ...(requestOptions.body ? { "Content-Type": "application/json" } : {}),
        ...headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => ({}))) as
      ApiEnvelope<T> | ApiErrorEnvelope;

    if (!response.ok || body.success !== true) {
      throw classifyApiError(
        response.status,
        body as ApiErrorEnvelope,
        path,
        protectedRequest,
      );
    }

    return body;
  } catch (error) {
    if (error instanceof AuthRequestError) {
      throw error;
    }
    throw networkAuthError();
  } finally {
    clearTimeout(timeout);
  }
}

async function rotateRefreshToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      throw new AuthRequestError(
        "session-expired",
        "Your session has expired. Please sign in again.",
        401,
      );
    }

    const response = await fetchEnvelope<LoginResult>("/auth/refresh", {
      auth: false,
      body: JSON.stringify({ refreshToken }),
      method: "POST",
      retryOnUnauthorized: false,
    });
    const email = (await getLastAuthEmail()) ?? response.data.user.email;
    await saveAuthTokens(response.data.tokens, email);
    return response.data.tokens.accessToken;
  })();

  try {
    return await refreshPromise;
  } catch (error) {
    await invalidateLocalSession();
    throw error instanceof AuthRequestError
      ? new AuthRequestError(
          "session-expired",
          "Your session has expired. Please sign in again.",
          error.status,
        )
      : error;
  } finally {
    refreshPromise = null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const requiresAuth = options.auth === true;
  let requestToken = requiresAuth ? await getAccessToken() : null;

  if (requiresAuth && !requestToken) {
    requestToken = await rotateRefreshToken();
  }

  try {
    return await fetchEnvelope<T>(path, options, requestToken);
  } catch (error) {
    if (
      !requiresAuth ||
      options.retryOnUnauthorized === false ||
      !(error instanceof AuthRequestError) ||
      error.status !== 401
    ) {
      throw error;
    }

    const latestAccessToken = await getAccessToken();
    const retryToken =
      latestAccessToken && latestAccessToken !== requestToken
        ? latestAccessToken
        : await rotateRefreshToken();

    try {
      return await fetchEnvelope<T>(
        path,
        { ...options, retryOnUnauthorized: false },
        retryToken,
      );
    } catch (retryError) {
      if (retryError instanceof AuthRequestError && retryError.status === 401) {
        await invalidateLocalSession();
      }
      throw retryError;
    }
  }
}

export function resetRefreshMutexForTests() {
  refreshPromise = null;
}
