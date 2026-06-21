import {
  adminClient,
  internalEmailForUsername,
  promptForPassword,
  usernameFromArgs,
} from "./shared";

const username = usernameFromArgs();
const userPassword = await promptForPassword("초기 관리자 비밀번호");
const admin = adminClient();
const internalEmail = internalEmailForUsername(username);

const { data, error } = await admin.auth.admin.createUser({
  email: internalEmail,
  password: userPassword,
  email_confirm: true,
});
if (error) throw error;

const { error: profileError } = await admin.from("profiles").insert({
  user_id: data.user.id,
  username,
  internal_email: internalEmail,
});
if (profileError) {
  await admin.auth.admin.deleteUser(data.user.id);
  throw profileError;
}

console.log(`관리자 계정 '${username}'을 생성했습니다.`);
