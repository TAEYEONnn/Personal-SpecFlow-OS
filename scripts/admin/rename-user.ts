import { adminClient } from "./shared";
import { normalizeUsername, usernameSchema } from "../../src/lib/auth/username";

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredUsername(name: string) {
  const value = argValue(name);

  if (!value) {
    throw new Error(`${name} <id>를 입력해 주세요.`);
  }

  return usernameSchema.parse(normalizeUsername(value));
}

async function main() {
  const fromUsername = requiredUsername("--from");
  const toUsername = requiredUsername("--to");
  const displayName = argValue("--display-name")?.trim();

  if (fromUsername === toUsername) {
    throw new Error("변경 전/후 아이디가 같습니다.");
  }

  const admin = adminClient();

  const { data: current, error: currentError } = await admin
    .from("profiles")
    .select("user_id, username, internal_email")
    .eq("username", fromUsername)
    .single();

  if (currentError || !current) {
    throw new Error("변경할 계정을 찾을 수 없습니다.");
  }

  const { data: duplicate, error: duplicateError } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", toUsername)
    .maybeSingle();

  if (duplicateError) {
    throw duplicateError;
  }

  if (duplicate) {
    throw new Error("이미 사용 중인 아이디입니다.");
  }

  const update: {
    username: string;
    display_name?: string;
  } = {
    username: toUsername,
  };

  if (displayName !== undefined) {
    update.display_name = displayName || toUsername;
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update(update)
    .eq("user_id", current.user_id);

  if (updateError) {
    throw updateError;
  }

  console.log(`'${fromUsername}' 아이디를 '${toUsername}'로 변경했습니다.`);
  console.log("로그인 비밀번호와 인증 이메일은 그대로 유지됩니다.");
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "아이디 변경 중 알 수 없는 오류가 발생했습니다.",
  );

  process.exitCode = 1;
});