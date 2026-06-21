import { describe, expect, it } from "vitest";
import {
  internalEmailForUsername,
  normalizeUsername,
  usernameSchema,
} from "@/lib/auth/username";

describe("username", () => {
  it("normalizes case and surrounding whitespace", () => {
    expect(normalizeUsername("  Design_ER-01 ")).toBe("design_er-01");
  });

  it("accepts only lowercase letters, numbers, underscore and hyphen", () => {
    expect(usernameSchema.safeParse("designer_01").success).toBe(true);
    expect(usernameSchema.safeParse("디자이너").success).toBe(false);
    expect(usernameSchema.safeParse("bad name").success).toBe(false);
  });

  it("creates a deterministic internal email without exposing a real domain", () => {
    expect(internalEmailForUsername("Designer")).toBe(
      "designer@users.specflow.internal",
    );
  });
});
