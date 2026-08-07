import {
  forgotPassword,
  login,
  logoutAll,
  register,
  resetPassword,
  verifyEmail,
} from "@/services/auth/auth-api";

const accessToken = "access-token";
const refreshToken = "refresh-token";

jest.mock("@/services/auth/auth-storage", () => ({
  clearAuthTokens: jest.fn(async () => undefined),
  clearSessionTokens: jest.fn(async () => undefined),
  getAccessToken: jest.fn(async () => accessToken),
  getLastAuthEmail: jest.fn(async () => "customer@example.com"),
  getRefreshToken: jest.fn(async () => refreshToken),
  saveAuthTokens: jest.fn(async () => undefined),
}));

function success<T>(data: T, status = 200) {
  return Promise.resolve(
    new Response(
      JSON.stringify({ data, message: "Request successful", success: true }),
      { headers: { "Content-Type": "application/json" }, status },
    ),
  );
}

describe("authentication API contracts", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("sends normalized registration data without logging credentials", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation(() =>
      success(
        {
          user: {
            email: "customer@example.com",
            emailVerifiedAt: null,
            id: "user-1",
            status: "PENDING_VERIFICATION",
          },
        },
        201,
      ),
    );

    await register({
      displayName: "  Velori Customer  ",
      email: " Customer@Example.com ",
      password: "StrongPassword123!",
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      displayName: "Velori Customer",
      email: "customer@example.com",
      password: "StrongPassword123!",
    });
  });

  it("connects login, verification, recovery, and reset endpoints", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation((input) => {
        const path = String(input);
        if (path.endsWith("/auth/login")) {
          return success({
            tokens: {
              accessToken,
              expiresIn: 900,
              refreshToken,
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
        return success({ accepted: true });
      });

    await login({
      email: "customer@example.com",
      password: "StrongPassword123!",
    });
    await verifyEmail("verification-token-with-at-least-32-characters");
    await forgotPassword("customer@example.com");
    await resetPassword({
      newPassword: "NewStrongPassword456!",
      token: "password-reset-token-with-at-least-32-characters",
    });

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/auth\/login$/),
        expect.stringMatching(/\/auth\/verify-email$/),
        expect.stringMatching(/\/auth\/forgot-password$/),
        expect.stringMatching(/\/auth\/reset-password$/),
      ]),
    );
  });

  it("attaches the stored Bearer token to logout-all", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(() => success({ accepted: true }));

    await logoutAll();

    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: `Bearer ${accessToken}`,
    });
  });
});
