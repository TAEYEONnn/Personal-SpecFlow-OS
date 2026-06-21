import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3, "아이디는 3자 이상이어야 합니다.")
  .max(32, "아이디는 32자 이하여야 합니다.")
  .regex(
    /^[a-z0-9_-]+$/,
    "아이디는 영문 소문자, 숫자, 밑줄, 하이픈만 사용할 수 있습니다.",
  );

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function internalEmailForUsername(username: string) {
  const normalized = normalizeUsername(username);
  usernameSchema.parse(normalized);
  return `${normalized}@users.specflow.internal`;
}
