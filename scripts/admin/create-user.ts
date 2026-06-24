import {
  adminClient,
  internalEmailForUsername,
  promptForPassword,
  usernameFromArgs,
} from "./shared";

async function main(): Promise<void> {
  const username = usernameFromArgs();
  const userPassword = await promptForPassword("초기 관리자 비밀번호");
  const admin = adminClient();
  const internalEmail = internalEmailForUsername(username);

  const { data, error } = await admin.auth.admin.createUser({
    email: internalEmail,
    password: userPassword,
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: data.user.id,
    username,
    internal_email: internalEmail,
    display_name: username,
  });

  if (profileError) {
    // 프로필 생성 실패 시 인증 계정도 삭제해서
    // 데이터가 불완전하게 남는 것을 방지합니다.
    await admin.auth.admin.deleteUser(data.user.id);
    throw profileError;
  }

  console.log(`관리자 계정 '${username}'을 생성했습니다.`);
}

main().catch((error: unknown) => {
  console.error("관리자 계정 생성에 실패했습니다.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
