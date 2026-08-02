import { create } from "zustand";

import type { AuthWorkspace } from "@/services/auth/auth-workspaces";

type AuthWorkspaceState = {
  clearWorkspace: () => void;
  selectedWorkspace: AuthWorkspace | null;
  selectWorkspace: (workspace: AuthWorkspace) => void;
};

export const useAuthWorkspaceStore = create<AuthWorkspaceState>((set) => ({
  clearWorkspace: () => set({ selectedWorkspace: null }),
  selectedWorkspace: null,
  selectWorkspace: (workspace) => set({ selectedWorkspace: workspace }),
}));
