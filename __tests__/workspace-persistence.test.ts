import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthWorkspace } from "@/services/auth/auth-workspaces";
import { useAuthWorkspaceStore } from "@/stores/auth-workspace-store";
import {
  clearSelectedWorkspace,
  readSelectedWorkspace,
  saveSelectedWorkspace,
} from "@/stores/workspace-storage";

const merchantWorkspace: AuthWorkspace = {
  description: "Run the Postman Fashion storefront.",
  key: "postman-fashion",
  kind: "merchant",
  merchantRoleKeys: ["merchant-owner"],
  roleLabel: "Merchant Owner",
  title: "Manage Postman Fashion",
};

beforeEach(async () => {
  await AsyncStorage.clear();
  useAuthWorkspaceStore.setState({
    selectedWorkspace: null,
    status: "restoring",
  });
});

describe("workspace persistence", () => {
  it("survives a round trip through storage", async () => {
    await saveSelectedWorkspace(merchantWorkspace);

    expect(await readSelectedWorkspace()).toEqual(merchantWorkspace);
  });

  it("reports nothing when no workspace was ever chosen", async () => {
    expect(await readSelectedWorkspace()).toBeNull();
  });

  it("ignores a stored value that lost the fields routing needs", async () => {
    await AsyncStorage.setItem(
      "stylish.auth.selected-workspace",
      JSON.stringify({ title: "Half a workspace" }),
    );

    expect(await readSelectedWorkspace()).toBeNull();
  });

  it("ignores unparseable storage rather than throwing", async () => {
    await AsyncStorage.setItem("stylish.auth.selected-workspace", "{not json");

    expect(await readSelectedWorkspace()).toBeNull();
  });
});

describe("workspace store", () => {
  it("starts restoring so guards wait before redirecting", () => {
    expect(useAuthWorkspaceStore.getState().status).toBe("restoring");
    expect(useAuthWorkspaceStore.getState().selectedWorkspace).toBeNull();
  });

  it("persists the choice and settles when one is selected", async () => {
    useAuthWorkspaceStore.getState().selectWorkspace(merchantWorkspace);

    expect(useAuthWorkspaceStore.getState().status).toBe("ready");
    expect(useAuthWorkspaceStore.getState().selectedWorkspace).toEqual(
      merchantWorkspace,
    );
    await Promise.resolve();
    expect(await readSelectedWorkspace()).toEqual(merchantWorkspace);
  });

  it("settles as ready even when nothing was stored", () => {
    useAuthWorkspaceStore.getState().restoreWorkspace(null);

    // Ready-with-nothing is what finally lets a guard redirect.
    expect(useAuthWorkspaceStore.getState().status).toBe("ready");
    expect(useAuthWorkspaceStore.getState().selectedWorkspace).toBeNull();
  });

  it("forgets the workspace on sign out", async () => {
    await saveSelectedWorkspace(merchantWorkspace);
    useAuthWorkspaceStore.getState().clearWorkspace();

    expect(useAuthWorkspaceStore.getState().selectedWorkspace).toBeNull();
    await Promise.resolve();
    expect(await readSelectedWorkspace()).toBeNull();
  });

  it("clears storage so the next launch does not resume a signed-out session", async () => {
    await saveSelectedWorkspace(merchantWorkspace);
    await clearSelectedWorkspace();

    expect(await readSelectedWorkspace()).toBeNull();
  });
});
