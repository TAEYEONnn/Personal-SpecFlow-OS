type LoginFailure = "unknown-user" | "wrong-password" | "rate-limited";

export function publicLoginError(reason: LoginFailure) {
  if (reason === "rate-limited") {
    return "로그인 시도가 잠시 제한됐어요. 조금 후에 다시 시도해요.";
  }
  return "아이디 또는 비밀번호를 다시 확인해봐요.";
}
