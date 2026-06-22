import { describe, expect, it } from "vitest";
import {
  getSupabaseEnvState,
  SupabaseConfigurationError,
  requireCompleteSupabaseEnv,
} from "@/lib/env";

describe("Supabase environment state", () => {
  it("returns complete when all required values exist", () => {
    expect(
      getSupabaseEnvState({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        SUPABASE_SERVICE_ROLE_KEY: "service",
      }),
    ).toBe("complete");
  });

  it("returns none when every required value is absent or blank", () => {
    expect(getSupabaseEnvState({})).toBe("none");
    expect(
      getSupabaseEnvState({
        NEXT_PUBLIC_SUPABASE_URL: " ",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      }),
    ).toBe("none");
  });

  it("returns partial when only some required values exist", () => {
    expect(
      getSupabaseEnvState({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toBe("partial");
  });

  it("reports missing keys for partial configuration", () => {
    expect(() =>
      requireCompleteSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow(
      new SupabaseConfigurationError([
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ]),
    );
  });
});
