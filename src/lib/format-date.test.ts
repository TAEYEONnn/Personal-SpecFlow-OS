import { describe, expect, it } from "vitest";

import { formatKoreanDateTime } from "./format-date";

describe("formatKoreanDateTime", () => {
  it("formats a timestamp deterministically in Korea Standard Time", () => {
    expect(formatKoreanDateTime("2026-06-22T05:33:28.000Z")).toBe(
      "2026. 6. 22. 오후 2:33:28",
    );
  });

  it("uses a safe fallback for invalid timestamps", () => {
    expect(formatKoreanDateTime("not-a-date")).toBe("날짜 정보 없음");
  });
});
