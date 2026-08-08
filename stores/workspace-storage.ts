import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthWorkspace } from "@/services/auth/auth-workspaces";

/**
 * Remembers which workspace the merchant chose so a page refresh returns them
 * to the surface they were on instead of the workspace picker. The key sits
 * with the other auth keys and, like them, is not renamed for the rebrand:
 * changing it would sign every existing session back to the picker.
 */
const SELECTED_WORKSPACE_KEY = "stylish.auth.selected-workspace";

export async function readSelectedWorkspace(): Promise<AuthWorkspace | null> {
  try {
    const stored = await AsyncStorage.getItem(SELECTED_WORKSPACE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    // A workspace is only usable if it still carries what routing depends on.
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as AuthWorkspace).key === "string" &&
      typeof (parsed as AuthWorkspace).kind === "string"
    ) {
      return parsed as AuthWorkspace;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveSelectedWorkspace(workspace: AuthWorkspace) {
  await AsyncStorage.setItem(
    SELECTED_WORKSPACE_KEY,
    JSON.stringify(workspace),
  ).catch(() => undefined);
}

export async function clearSelectedWorkspace() {
  await AsyncStorage.removeItem(SELECTED_WORKSPACE_KEY).catch(() => undefined);
}
