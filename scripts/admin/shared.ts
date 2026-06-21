import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { password } from "@inquirer/prompts";
import { internalEmailForUsername, normalizeUsername } from "../../src/lib/auth/username";

loadEnvConfig(process.cwd());

export function usernameFromArgs() {
  const index = process.argv.indexOf("--username");
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error("--username <id>를 입력해 주세요.");
  return normalizeUsername(value);
}

export async function promptForPassword(message: string) {
  return password({
    message,
    mask: "*",
    validate(value) {
      return value.length >= 12 || "비밀번호는 12자 이상이어야 합니다.";
    },
  });
}

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 관리자 환경변수가 필요합니다.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export { internalEmailForUsername };
