import { Platform } from "react-native";

export type ApiErrorItem = {
  field?: string;
  message?: string;
};

export type ApiErrorEnvelope = {
  code?: string;
  errors?: ApiErrorItem[];
  message?: string;
  success?: false;
};

export type AuthErrorKind =
  | "disabled-account"
  | "duplicate-registration"
  | "expired-action-token"
  | "invalid-credentials"
  | "invalid-action-token"
  | "network"
  | "permission-denied"
  | "rate-limited"
  | "server"
  | "service-unavailable"
  | "session-expired"
  | "session-limit"
  | "unverified-email"
  | "validation";

export class AuthRequestError extends Error {
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly kind: AuthErrorKind;
  readonly status: number | null;

  constructor(
    kind: AuthErrorKind,
    message: string,
    status: number | null,
    fieldErrors: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = "AuthRequestError";
    this.fieldErrors = fieldErrors;
    this.kind = kind;
    this.status = status;
  }
}

function fieldErrorsFrom(error: ApiErrorEnvelope) {
  return Object.fromEntries(
    (error.errors ?? []).flatMap((item) =>
      item.field && item.message ? [[item.field, item.message]] : [],
    ),
  );
}

export function classifyApiError(
  status: number,
  error: ApiErrorEnvelope,
  path: string,
  protectedRequest = false,
) {
  const fieldErrors = fieldErrorsFrom(error);
  const details = [
    error.code,
    error.message,
    ...(error.errors ?? []).flatMap((item) => [item.field, item.message]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    path === "/auth/reset-password" &&
    (status === 401 || status === 403 || Boolean(fieldErrors.token))
  ) {
    const expired = /has expired|token expired|expiration|no longer valid/.test(
      details,
    );
    return new AuthRequestError(
      expired ? "expired-action-token" : "invalid-action-token",
      expired
        ? "This password-reset link has expired. Request a new link to continue."
        : "This password-reset link is invalid or has already been used.",
      status,
      fieldErrors,
    );
  }

  if (
    path === "/auth/verify-email" &&
    (status === 400 || status === 401 || status === 403)
  ) {
    const expired = /expired|expiration|no longer valid/.test(details);
    return new AuthRequestError(
      expired ? "expired-action-token" : "invalid-action-token",
      expired
        ? "This verification link has expired. Request a new email to continue."
        : "This verification link is invalid or has already been used.",
      status,
      fieldErrors,
    );
  }

  if (status === 429) {
    const message =
      path === "/auth/register"
        ? "Too many registration attempts. Please wait a moment and try again."
        : path === "/auth/resend-verification"
          ? "Too many verification requests. Please wait before trying again."
          : path === "/auth/forgot-password"
            ? "Too many reset requests. Please wait before trying again."
            : path === "/auth/reset-password"
              ? "Too many password-reset attempts. Please wait before trying again."
              : "Too many sign-in attempts. Please wait a moment and try again.";
    return new AuthRequestError("rate-limited", message, status, fieldErrors);
  }

  if (status === 409) {
    if (path === "/auth/register") {
      return new AuthRequestError(
        "duplicate-registration",
        "Unable to create an account with these details.",
        status,
        fieldErrors,
      );
    }
    return new AuthRequestError(
      "session-limit",
      "Your account has reached its active-session limit. Sign out from another device, then try again.",
      status,
      fieldErrors,
    );
  }

  if (status === 400) {
    return new AuthRequestError(
      "validation",
      "Check the highlighted fields and try again.",
      status,
      fieldErrors,
    );
  }

  if (status === 503) {
    return new AuthRequestError(
      "service-unavailable",
      "Velori is temporarily unavailable. Please try again shortly.",
      status,
      fieldErrors,
    );
  }

  if (protectedRequest && status === 401) {
    return new AuthRequestError(
      "session-expired",
      "Your session has expired. Please sign in again.",
      status,
      fieldErrors,
    );
  }

  if (status === 403) {
    return new AuthRequestError(
      "permission-denied",
      "You do not have permission to perform this action.",
      status,
      fieldErrors,
    );
  }

  // The current login endpoint intentionally returns a generic 401 for invalid
  // credentials and account-state failures, so the UI must remain generic.
  if (status === 401) {
    return new AuthRequestError(
      "invalid-credentials",
      "The email or password is incorrect.",
      status,
      fieldErrors,
    );
  }

  return new AuthRequestError(
    "server",
    status >= 500
      ? "Velori is temporarily unavailable. Please try again shortly."
      : (error.message ?? "The request could not be completed."),
    status,
    fieldErrors,
  );
}

export function networkAuthError() {
  return new AuthRequestError(
    "network",
    Platform.OS === "web"
      ? "Can't reach the Velori API. Confirm the backend is running and try again."
      : "Can't reach the Velori API. Check your connection and EXPO_PUBLIC_API_URL.",
    null,
  );
}
