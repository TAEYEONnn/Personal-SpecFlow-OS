import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  MAX_SOURCE_CHARS,
  validateSourceInput,
} from "@/lib/sources/source-input";

describe("source input validation", () => {
  it("accepts trimmed text", () => {
    expect(validateSourceInput({ text: "  회의록 내용  " })).toEqual({
      text: "회의록 내용",
    });
  });

  it("rejects empty input", () => {
    expect(() => validateSourceInput({ text: " \n " })).toThrow(
      "업무 내용을 입력해 주세요.",
    );
  });

  it("rejects text over the character limit", () => {
    expect(() =>
      validateSourceInput({ text: "a".repeat(MAX_SOURCE_CHARS + 1) }),
    ).toThrow("100,000자");
  });

  it("rejects files over the size limit", () => {
    expect(() =>
      validateSourceInput({
        text: "valid",
        fileName: "brief.md",
        fileSize: MAX_FILE_BYTES + 1,
      }),
    ).toThrow("10MB");
  });

  it("rejects unsupported extensions", () => {
    expect(() =>
      validateSourceInput({
        text: "valid",
        fileName: "brief.pptx",
        fileSize: 20,
      }),
    ).toThrow("TXT, MD 또는 PDF");
  });
});
