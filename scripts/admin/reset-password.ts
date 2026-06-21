import {
  adminClient,
  promptForPassword,
  usernameFromArgs,
} from "./shared";

const username = usernameFromArgs();
const nextPassword = await promptForPassword("새 비밀번호");
const admin = adminClient();
const { data: profile, error } = await admin
  .from("profiles")
  .select("user_id")
  .eq("username", username)
  .single();
if (error || !profile) throw new Error("계정을 찾을 수 없습니다.");

const { error: updateError } = await admin.auth.admin.updateUserById(
  profile.user_id,
  { password: nextPassword },
);
if (updateError) throw updateError;

console.log(`'${username}' 계정의 비밀번호를 재설정했습니다.`);
