import { describe, expect, it } from "vitest";
import { assertRevision } from "@/lib/projects/revision";

describe("assertRevision", () => {
  it("accepts the current revision", () => {
    expect(() => assertRevision(4, 4)).not.toThrow();
  });

  it("rejects stale edits", () => {
    expect(() => assertRevision(3, 4)).toThrow(
      "다른 곳에서 문서가 수정되었습니다.",
    );
  });
});
