import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseEnvState = vi.fn();
const createClient = vi.fn();
const createAdminClient = vi.fn();

vi.mock("@/lib/env", () => ({
  getSupabaseEnvState,
  isDevelopmentDemo: true,
  supabaseConfigurationError: () =>
    new Error("Supabase 환경변수 설정이 일부만 완료되었습니다."),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/auth/rate-limit-store", () => ({
  clearLoginFailures: vi.fn(),
  isLoginBlocked: vi.fn().mockResolvedValue(false),
  recordLoginFailure: vi.fn(),
}));

function loginRequest() {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "designer", password: "specflow" }),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.resetModules();
    getSupabaseEnvState.mockReset();
    createClient.mockReset();
    createAdminClient.mockReset();
  });

  it("creates a demo session only when Supabase configuration is absent", async () => {
    getSupabaseEnvState.mockReturnValue("none");
    const { POST } = await import("@/app/api/auth/login/route");

    const response = await POST(loginRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "specflow-demo-session=designer",
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns 503 for partial Supabase configuration", async () => {
    getSupabaseEnvState.mockReturnValue("partial");
    const { POST } = await import("@/app/api/auth/login/route");

    const response = await POST(loginRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Supabase 환경변수 설정이 일부만 완료되었습니다.",
    });
    expect(createClient).not.toHaveBeenCalled();
  });
});
