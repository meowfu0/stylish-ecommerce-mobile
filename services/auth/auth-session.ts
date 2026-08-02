import {
  getAuthenticatedUser,
  login,
  logout,
  logoutAll,
} from "@/services/auth/auth-api";
import { AuthRequestError } from "@/services/auth/auth-error";
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from "@/services/auth/auth-storage";
import type { AuthenticatedUserContext } from "@/services/auth/auth-types";
import {
  type AuthSessionReason,
  useAuthSessionStore,
} from "@/stores/auth-session-store";
import { useAuthWorkspaceStore } from "@/stores/auth-workspace-store";

async function clearLocalSession(reason: Exclude<AuthSessionReason, null>) {
  await clearSessionTokens().catch(() => undefined);
  useAuthWorkspaceStore.getState().clearWorkspace();
  useAuthSessionStore.getState().setUnauthenticated(reason);
}

export async function restoreAuthSession() {
  const store = useAuthSessionStore.getState();
  store.setRestoring();

  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);
  if (!accessToken && !refreshToken) {
    store.setUnauthenticated();
    return null;
  }

  try {
    const user = await getAuthenticatedUser();
    useAuthSessionStore.getState().setAuthenticated(user);
    return user;
  } catch (error) {
    const reason =
      error instanceof AuthRequestError && error.kind === "network"
        ? "network"
        : "session-expired";
    await clearLocalSession(reason);
    return null;
  }
}

export async function authenticateWithPassword(input: {
  email: string;
  password: string;
}): Promise<AuthenticatedUserContext> {
  const result = await login(input);
  await saveAuthTokens(result.tokens, result.user.email);

  try {
    const user = await getAuthenticatedUser();
    useAuthSessionStore.getState().setAuthenticated(user);
    return user;
  } catch (error) {
    await clearLocalSession("session-expired");
    throw error;
  }
}

export async function refreshAuthenticatedUser() {
  const user = await getAuthenticatedUser();
  useAuthSessionStore.getState().setAuthenticated(user);
  return user;
}

export async function signOutCurrentSession() {
  try {
    await logout();
  } catch {
    // Local sign-out must still complete when the API is unavailable.
  } finally {
    await clearLocalSession("signed-out");
  }
}

export async function signOutAllSessions() {
  try {
    await logoutAll();
  } catch {
    // Local sign-out must still complete when the API is unavailable.
  } finally {
    await clearLocalSession("signed-out");
  }
}
