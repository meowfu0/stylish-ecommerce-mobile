import {
  apiRequest,
  resetRefreshMutexForTests,
} from "@/services/api/api-client";
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from "@/services/auth/auth-storage";
import { useAuthSessionStore } from "@/stores/auth-session-store";

jest.mock("@/services/auth/auth-storage", () => ({
  clearAuthTokens: jest.fn(async () => undefined),
  clearSessionTokens: jest.fn(async () => undefined),
  getAccessToken: jest.fn(),
  getLastAuthEmail: jest.fn(async () => "customer@example.com"),
  getRefreshToken: jest.fn(),
  saveAuthTokens: jest.fn(async () => undefined),
}));

const mockedGetAccessToken = jest.mocked(getAccessToken);
const mockedGetRefreshToken = jest.mocked(getRefreshToken);
const mockedSaveAuthTokens = jest.mocked(saveAuthTokens);
const mockedClearSessionTokens = jest.mocked(clearSessionTokens);

function response(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(
      JSON.stringify(
        status >= 400
          ? {
              errors: [{ field: "authorization", message: "Unauthorized" }],
              message: "Unauthorized",
              success: false,
            }
          : { data, message: "OK", success: true },
      ),
      { headers: { "Content-Type": "application/json" }, status },
    ),
  );
}

describe("authenticated API refresh handling", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    resetRefreshMutexForTests();
    useAuthSessionStore.getState().setUnauthenticated();
    mockedGetRefreshToken.mockResolvedValue("old-refresh");
  });

  it("rotates once and retries the original protected request", async () => {
    mockedGetAccessToken
      .mockResolvedValueOnce("old-access")
      .mockResolvedValueOnce("old-access");
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementationOnce(() => response({}, 401))
      .mockImplementationOnce(() =>
        response({
          tokens: {
            accessToken: "new-access",
            expiresIn: 900,
            refreshToken: "new-refresh",
            refreshTokenExpiresAt: "2026-09-01T00:00:00.000Z",
            tokenType: "Bearer",
          },
          user: {
            email: "customer@example.com",
            emailVerifiedAt: "2026-08-01T00:00:00.000Z",
            id: "user-1",
            status: "ACTIVE",
          },
        }),
      )
      .mockImplementationOnce(() => response({ id: "user-1" }));

    const result = await apiRequest<{ id: string }>("/auth/me", {
      auth: true,
      method: "GET",
    });

    expect(result.data.id).toBe("user-1");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(mockedSaveAuthTokens).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: "new-refresh" }),
      "customer@example.com",
    );
    expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({
      Authorization: "Bearer new-access",
    });
  });

  it("shares one refresh request across simultaneous protected calls", async () => {
    mockedGetAccessToken.mockResolvedValue(null);
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation((input) => {
        if (String(input).endsWith("/auth/refresh")) {
          return response({
            tokens: {
              accessToken: "new-access",
              expiresIn: 900,
              refreshToken: "new-refresh",
              refreshTokenExpiresAt: "2026-09-01T00:00:00.000Z",
              tokenType: "Bearer",
            },
            user: {
              email: "customer@example.com",
              emailVerifiedAt: "2026-08-01T00:00:00.000Z",
              id: "user-1",
              status: "ACTIVE",
            },
          });
        }
        return response({ id: "user-1" });
      });

    await Promise.all([
      apiRequest("/auth/me", { auth: true, method: "GET" }),
      apiRequest("/auth/me", { auth: true, method: "GET" }),
    ]);

    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith("/auth/refresh"),
      ),
    ).toHaveLength(1);
  });

  it("clears local authentication when refresh is rejected", async () => {
    mockedGetAccessToken.mockResolvedValue(null);
    jest.spyOn(global, "fetch").mockImplementation(() => response({}, 401));

    await expect(
      apiRequest("/auth/me", { auth: true, method: "GET" }),
    ).rejects.toMatchObject({ kind: "session-expired" });

    expect(mockedClearSessionTokens).toHaveBeenCalled();
    expect(useAuthSessionStore.getState().status).toBe("unauthenticated");
    expect(useAuthSessionStore.getState().reason).toBe("session-expired");
  });
});
