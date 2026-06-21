type LoginFailure = "unknown-user" | "wrong-password" | "rate-limited";

export function publicLoginError(reason: LoginFailure) {
  if (reason === "rate-limited") {
    return "로그인 시도가 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.";
  }
  return "아이디 또는 비밀번호를 확인해 주세요.";
}
