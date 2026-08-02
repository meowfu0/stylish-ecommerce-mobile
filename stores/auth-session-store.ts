import { create } from "zustand";

import type { AuthenticatedUserContext } from "@/services/auth/auth-types";

export type AuthSessionReason =
  "network" | "permission-changed" | "session-expired" | "signed-out" | null;

type AuthSessionState = {
  reason: AuthSessionReason;
  setAuthenticated: (user: AuthenticatedUserContext) => void;
  setRestoring: () => void;
  setUnauthenticated: (reason?: AuthSessionReason) => void;
  status: "authenticated" | "restoring" | "unauthenticated";
  user: AuthenticatedUserContext | null;
};

export const useAuthSessionStore = create<AuthSessionState>((set) => ({
  reason: null,
  setAuthenticated: (user) =>
    set({ reason: null, status: "authenticated", user }),
  setRestoring: () => set({ reason: null, status: "restoring", user: null }),
  setUnauthenticated: (reason = null) =>
    set({ reason, status: "unauthenticated", user: null }),
  status: "restoring",
  user: null,
}));
