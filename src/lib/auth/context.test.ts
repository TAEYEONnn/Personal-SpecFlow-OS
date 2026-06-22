import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseEnvState = vi.fn();
const createClient = vi.fn();

vi.mock("@/lib/env", () => ({
  getSupabaseEnvState,
  isDevelopmentDemo: true,
  supabaseConfigurationError: () =>
    new Error("Supabase 환경변수 설정이 일부만 완료되었습니다."),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}));

describe("getAuthContext", () => {
  beforeEach(() => {
    vi.resetModules();
    getSupabaseEnvState.mockReset();
    createClient.mockReset();
  });

  it("uses demo auth only when Supabase configuration is absent", async () => {
    getSupabaseEnvState.mockReturnValue("none");
    const { getAuthContext } = await import("@/lib/auth/context");

    await expect(getAuthContext()).resolves.toMatchObject({
      username: "designer",
      demo: true,
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("throws a clear configuration error for partial Supabase settings", async () => {
    getSupabaseEnvState.mockReturnValue("partial");
    const { getAuthContext } = await import("@/lib/auth/context");

    await expect(getAuthContext()).rejects.toThrow(
      "Supabase 환경변수 설정이 일부만 완료되었습니다.",
    );
    expect(createClient).not.toHaveBeenCalled();
  });
});
