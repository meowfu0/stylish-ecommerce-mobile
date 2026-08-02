import { Platform } from "react-native";

import { apiRequest } from "@/services/api/api-client";
import type {
  AuthenticatedUserContext,
  LoginResult,
  MessageAcceptedResult,
  RegistrationResult,
} from "@/services/auth/auth-types";

const EMAIL_ACTION_TIMEOUT_MS = 30_000;

export { AuthRequestError } from "@/services/auth/auth-error";
export type { AuthErrorKind } from "@/services/auth/auth-error";
export type {
  AuthenticatedUserContext,
  AuthTokens,
  AuthUserSummary,
  LoginResult,
  MessageAcceptedResult,
  RegistrationResult,
} from "@/services/auth/auth-types";

export async function login(input: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const response = await apiRequest<LoginResult>("/auth/login", {
    body: JSON.stringify({
      deviceName: `${Platform.OS} Stylish app`,
      email: input.email.trim().toLowerCase(),
      password: input.password,
    }),
    method: "POST",
  });
  return response.data;
}

export async function register(input: {
  displayName?: string;
  email: string;
  password: string;
}): Promise<RegistrationResult> {
  const displayName = input.displayName?.trim();
  const response = await apiRequest<RegistrationResult>("/auth/register", {
    body: JSON.stringify({
      ...(displayName ? { displayName } : {}),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    }),
    method: "POST",
    timeoutMs: EMAIL_ACTION_TIMEOUT_MS,
  });
  return response.data;
}

export async function getAuthenticatedUser() {
  const response = await apiRequest<AuthenticatedUserContext>("/auth/me", {
    auth: true,
    method: "GET",
  });
  return response.data;
}

export async function logout(): Promise<MessageAcceptedResult> {
  const response = await apiRequest<MessageAcceptedResult>("/auth/logout", {
    auth: true,
    method: "POST",
  });
  return response.data;
}

export async function logoutAll(): Promise<MessageAcceptedResult> {
  const response = await apiRequest<MessageAcceptedResult>("/auth/logout-all", {
    auth: true,
    method: "POST",
  });
  return response.data;
}

export async function forgotPassword(email: string) {
  const response = await apiRequest<MessageAcceptedResult>(
    "/auth/forgot-password",
    {
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
      method: "POST",
      timeoutMs: EMAIL_ACTION_TIMEOUT_MS,
    },
  );
  return response.data;
}

export async function resendVerificationEmail(email: string) {
  const response = await apiRequest<MessageAcceptedResult>(
    "/auth/resend-verification",
    {
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
      method: "POST",
      timeoutMs: EMAIL_ACTION_TIMEOUT_MS,
    },
  );
  return response.data;
}

export async function resetPassword(input: {
  newPassword: string;
  token: string;
}) {
  const response = await apiRequest<MessageAcceptedResult>(
    "/auth/reset-password",
    {
      body: JSON.stringify(input),
      method: "POST",
    },
  );
  return response.data;
}

export async function verifyEmail(token: string) {
  const response = await apiRequest<MessageAcceptedResult>(
    "/auth/verify-email",
    {
      body: JSON.stringify({ token }),
      method: "POST",
    },
  );
  return response.data;
}
