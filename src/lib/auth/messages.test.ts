import { describe, expect, it } from "vitest";
import { publicLoginError } from "@/lib/auth/messages";

describe("publicLoginError", () => {
  it("does not reveal whether the username exists", () => {
    expect(publicLoginError("unknown-user")).toBe(
      "아이디 또는 비밀번호를 확인해 주세요.",
    );
    expect(publicLoginError("wrong-password")).toBe(
      "아이디 또는 비밀번호를 확인해 주세요.",
    );
  });

  it("uses a separate message for temporary blocking", () => {
    expect(publicLoginError("rate-limited")).toBe(
      "로그인 시도가 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.",
    );
  });
});
