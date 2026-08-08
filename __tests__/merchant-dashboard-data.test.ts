import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  defaultDashboardSectionLoaders,
  type DashboardSectionLoaders,
} from "@/features/merchant-dashboard/dashboard-data-source";
import { useMerchantDashboardData } from "@/features/merchant-dashboard/use-merchant-dashboard-data";
import { AuthRequestError } from "@/services/auth/auth-error";

function countingLoaders(overrides: Partial<DashboardSectionLoaders> = {}): {
  calls: () => number;
  loaders: DashboardSectionLoaders;
} {
  let calls = 0;
  const counted = Object.fromEntries(
    Object.entries({ ...defaultDashboardSectionLoaders, ...overrides }).map(
      ([key, loader]) => [
        key,
        async () => {
          calls += 1;
          return loader();
        },
      ],
    ),
  ) as DashboardSectionLoaders;

  return { calls: () => calls, loaders: counted };
}

describe("useMerchantDashboardData", () => {
  it("starts in loading and settles into ready", async () => {
    const { loaders } = countingLoaders();
    const screen = renderHook(() =>
      useMerchantDashboardData({ enabled: true, loaders }),
    );

    expect(screen.result.current.dataState).toBe("loading");
    await waitFor(() => {
      expect(screen.result.current.dataState).toBe("ready");
    });
    expect(screen.result.current.failedSections).toEqual([]);
  });

  it("refreshes without falling back to full-page skeletons", async () => {
    const { loaders } = countingLoaders();
    const screen = renderHook(() =>
      useMerchantDashboardData({ enabled: true, loaders }),
    );

    await waitFor(() => {
      expect(screen.result.current.dataState).toBe("ready");
    });

    act(() => screen.result.current.refresh());
    expect(screen.result.current.dataState).toBe("refreshing");

    await waitFor(() => {
      expect(screen.result.current.dataState).toBe("ready");
    });
  });

  it("degrades to partial data when only some regions fail", async () => {
    const { loaders } = countingLoaders({
      sales: async () => {
        throw new Error("unavailable");
      },
    });
    const screen = renderHook(() =>
      useMerchantDashboardData({ enabled: true, loaders }),
    );

    await waitFor(() => {
      expect(screen.result.current.dataState).toBe("partial");
    });
    expect(screen.result.current.failedSections).toEqual(["sales"]);
  });

  it("shows the service error only when nothing could be loaded", async () => {
    const unavailable = async () => {
      throw new Error("unavailable");
    };
    const failing: DashboardSectionLoaders = {
      activity: unavailable,
      catalog: unavailable,
      inventory: unavailable,
      metrics: unavailable,
      orders: unavailable,
      sales: unavailable,
    };
    const screen = renderHook(() =>
      useMerchantDashboardData({ enabled: true, loaders: failing }),
    );

    await waitFor(() => {
      expect(screen.result.current.dataState).toBe("error");
    });
  });

  it("stops requesting after the session expires", async () => {
    const { calls, loaders } = countingLoaders({
      metrics: async () => {
        throw new AuthRequestError(
          "session-expired",
          "Your session has expired. Please sign in again.",
          401,
        );
      },
    });
    const screen = renderHook(() =>
      useMerchantDashboardData({ enabled: true, loaders }),
    );

    await waitFor(() => {
      expect(screen.result.current.dataState).not.toBe("loading");
    });
    const afterFirstLoad = calls();

    act(() => screen.result.current.retry());
    act(() => screen.result.current.retry());

    expect(calls()).toBe(afterFirstLoad);
  });

  it("issues no requests while the dashboard is already blocked", async () => {
    const { calls, loaders } = countingLoaders();
    renderHook(() => useMerchantDashboardData({ enabled: false, loaders }));

    await waitFor(() => {
      expect(calls()).toBe(0);
    });
  });
});
