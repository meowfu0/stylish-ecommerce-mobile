import {
  getAuthenticatedUser,
  login,
  logout,
  logoutAll,
} from "@/services/auth/auth-api";
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from "@/services/auth/auth-storage";
import {
  authenticateWithPassword,
  restoreAuthSession,
  signOutAllSessions,
  signOutCurrentSession,
} from "@/services/auth/auth-session";
import type { AuthenticatedUserContext } from "@/services/auth/auth-types";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { useAuthWorkspaceStore } from "@/stores/auth-workspace-store";

jest.mock("@/services/auth/auth-api", () => ({
  AuthRequestError: class extends Error {},
  getAuthenticatedUser: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
}));

jest.mock("@/services/auth/auth-storage", () => ({
  clearAuthTokens: jest.fn(async () => undefined),
  clearSessionTokens: jest.fn(async () => undefined),
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  saveAuthTokens: jest.fn(async () => undefined),
}));

const mockedGetAuthenticatedUser = jest.mocked(getAuthenticatedUser);
const mockedLogin = jest.mocked(login);
const mockedLogout = jest.mocked(logout);
const mockedLogoutAll = jest.mocked(logoutAll);
const mockedGetAccessToken = jest.mocked(getAccessToken);
const mockedGetRefreshToken = jest.mocked(getRefreshToken);
const mockedSaveAuthTokens = jest.mocked(saveAuthTokens);
const mockedClearSessionTokens = jest.mocked(clearSessionTokens);

const user: AuthenticatedUserContext = {
  email: "customer@example.com",
  emailVerifiedAt: "2026-08-01T00:00:00.000Z",
  id: "user-1",
  merchantMemberships: [],
  platformRoles: ["customer"],
  profile: null,
  status: "ACTIVE",
};

describe("authentication session orchestration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthSessionStore.getState().setUnauthenticated();
    useAuthWorkspaceStore.getState().clearWorkspace();
  });

  it("restores the authenticated user before startup routing", async () => {
    mockedGetAccessToken.mockResolvedValue("stored-access");
    mockedGetRefreshToken.mockResolvedValue("stored-refresh");
    mockedGetAuthenticatedUser.mockResolvedValue(user);

    await expect(restoreAuthSession()).resolves.toEqual(user);
    expect(useAuthSessionStore.getState()).toMatchObject({
      status: "authenticated",
      user,
    });
  });

  it("persists login tokens before restoring the complete user context", async () => {
    const tokens = {
      accessToken: "access-token",
      expiresIn: 900,
      refreshToken: "refresh-token",
      refreshTokenExpiresAt: "2026-09-01T00:00:00.000Z",
      tokenType: "Bearer" as const,
    };
    mockedLogin.mockResolvedValue({ tokens, user });
    mockedGetAuthenticatedUser.mockResolvedValue(user);

    await expect(
      authenticateWithPassword({
        email: user.email,
        password: "StrongPassword123!",
      }),
    ).resolves.toEqual(user);
    expect(mockedSaveAuthTokens).toHaveBeenCalledWith(tokens, user.email);
    expect(useAuthSessionStore.getState().status).toBe("authenticated");
  });

  it("clears local state after current-session and logout-all requests", async () => {
    mockedLogout.mockResolvedValue({ accepted: true });
    mockedLogoutAll.mockResolvedValue({ accepted: true });

    await signOutCurrentSession();
    await signOutAllSessions();

    expect(mockedLogout).toHaveBeenCalledTimes(1);
    expect(mockedLogoutAll).toHaveBeenCalledTimes(1);
    expect(mockedClearSessionTokens).toHaveBeenCalledTimes(2);
    expect(useAuthSessionStore.getState().status).toBe("unauthenticated");
  });

  it("still clears the local session when logout-all cannot reach the API", async () => {
    mockedLogoutAll.mockRejectedValue(new Error("Network unavailable"));

    await expect(signOutAllSessions()).resolves.toBeUndefined();

    expect(mockedClearSessionTokens).toHaveBeenCalledTimes(1);
    expect(useAuthSessionStore.getState().status).toBe("unauthenticated");
  });
});
