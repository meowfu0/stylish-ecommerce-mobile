import { create } from "zustand";

import type { AuthWorkspace } from "@/services/auth/auth-workspaces";
import {
  clearSelectedWorkspace,
  saveSelectedWorkspace,
} from "@/stores/workspace-storage";

type AuthWorkspaceState = {
  clearWorkspace: () => void;
  /** Rehydrates from storage; also marks the store settled. */
  restoreWorkspace: (workspace: AuthWorkspace | null) => void;
  selectedWorkspace: AuthWorkspace | null;
  selectWorkspace: (workspace: AuthWorkspace) => void;
  /**
   * `restoring` until the stored choice has been read. Guards that redirect on
   * a missing workspace must wait for `ready`, or a refresh bounces the
   * merchant to the picker before the answer has arrived.
   */
  status: "ready" | "restoring";
};

export const useAuthWorkspaceStore = create<AuthWorkspaceState>((set) => ({
  clearWorkspace: () => {
    void clearSelectedWorkspace();
    set({ selectedWorkspace: null, status: "ready" });
  },
  restoreWorkspace: (workspace) =>
    set({ selectedWorkspace: workspace, status: "ready" }),
  selectedWorkspace: null,
  selectWorkspace: (workspace) => {
    // Persisted so the next launch resumes here rather than at the picker.
    void saveSelectedWorkspace(workspace);
    set({ selectedWorkspace: workspace, status: "ready" });
  },
  status: "restoring",
}));
