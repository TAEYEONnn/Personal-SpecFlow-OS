import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { adminClient } from "./shared";
import { normalizeUsername, usernameSchema } from "../../src/lib/auth/username";

type ImportUser = {
  email: string;
  username: string;
  displayName: string | null;
};

type ImportResult = {
  email: string;
  username: string;
  status: "created" | "profile-created" | "skipped";
  tempPassword?: string;
  reason?: string;
};

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function usernameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "user";
  const normalized = normalizeUsername(
    localPart
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
  );
  const candidate = normalized.length >= 3 ? normalized.slice(0, 32) : `user-${normalized}`;
  return usernameSchema.safeParse(candidate).success ? candidate : `user-${randomBytes(4).toString("hex")}`;
}

function normalizeImportUser(record: Record<string, unknown>): ImportUser | null {
  const email = asString(record.email ?? record.internalEmail ?? record.internal_email).toLowerCase();
  if (!email || !email.includes("@")) return null;

  const rawUsername = asString(record.username) || usernameFromEmail(email);
  const parsedUsername = usernameSchema.safeParse(normalizeUsername(rawUsername));
  const username = parsedUsername.success ? parsedUsername.data : usernameFromEmail(email);

  const displayName =
    asString(record.displayName ?? record.display_name ?? record.name) ||
    username;

  return { email, username, displayName };
}

function collectRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(collectRecords);
  if (!isRecord(value)) return [];

  const direct = normalizeImportUser(value) ? [value] : [];
  const nested = Object.values(value).flatMap(collectRecords);
  return [...direct, ...nested];
}

async function findAuthUserIdByEmail(email: string) {
  const admin = adminClient();
  for (let page = 1; page < 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function uniqueUsername(baseUsername: string) {
  const admin = adminClient();
  let username = baseUsername;
  for (let index = 2; index < 1000; index += 1) {
    const { data } = await admin
      .from("profiles")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();
    if (!data) return username;

    const suffix = `-${index}`;
    username = `${baseUsername.slice(0, 32 - suffix.length)}${suffix}`;
  }
  return `${baseUsername.slice(0, 23)}-${randomBytes(4).toString("hex")}`;
}

function tempPassword() {
  return `${randomBytes(18).toString("base64url")}Aa1!`;
}

async function main() {
  const filePath = argValue("--file");

  if (!filePath) {
    throw new Error("--file <figma-users.json> 경로를 입력해 주세요.");
  }

  const apply = hasFlag("--apply");
  const credentialsPath = argValue("--write-credentials");

  const json = JSON.parse(await readFile(filePath, "utf8")) as unknown;

  const users = Array.from(
    new Map(
      collectRecords(json)
        .map(normalizeImportUser)
        .filter((user): user is ImportUser => Boolean(user))
        .map((user) => [user.email, user]),
    ).values(),
  );

  if (!apply) {
    console.log(
      `${users.length}명을 가져올 수 있습니다. 실제 적용하려면 --apply를 추가하세요.`,
    );
    console.log(
      "입력 형식: Payload accounts/profiles JSON 또는 email/username/displayName 필드가 있는 JSON 배열",
    );
    return;
  }

  const admin = adminClient();
  const results: ImportResult[] = [];

  for (const user of users) {
    const { data: existingProfile, error: existingProfileError } = await admin
      .from("profiles")
      .select("user_id, username")
      .eq("internal_email", user.email)
      .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (existingProfile) {
      results.push({
        email: user.email,
        username: existingProfile.username,
        status: "skipped",
        reason: "profile-exists",
      });
      continue;
    }

    const existingAuthUserId = await findAuthUserIdByEmail(user.email);
    const username = await uniqueUsername(user.username);

    if (existingAuthUserId) {
      const { error } = await admin.from("profiles").insert({
        user_id: existingAuthUserId,
        username,
        internal_email: user.email,
        display_name: user.displayName ?? username,
      });

      if (error) {
        throw error;
      }

      results.push({
        email: user.email,
        username,
        status: "profile-created",
      });

      continue;
    }

    const password = tempPassword();

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email: user.email,
        password,
        email_confirm: true,
        user_metadata: {
          migratedFrom: "figmaspecflow",
        },
      });

    if (createError || !created.user) {
      throw createError ?? new Error("사용자 생성 실패");
    }

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: created.user.id,
      username,
      internal_email: user.email,
      display_name: user.displayName ?? username,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    results.push({
      email: user.email,
      username,
      status: "created",
      ...(credentialsPath ? { tempPassword: password } : {}),
    });
  }

  if (credentialsPath) {
    await mkdir(path.dirname(credentialsPath), {
      recursive: true,
    });

    await writeFile(
      credentialsPath,
      JSON.stringify(results, null, 2),
    );

    console.log(
      `임시 비밀번호 포함 결과를 ${credentialsPath}에 저장했습니다. 이 파일은 커밋하지 마세요.`,
    );
  }

  const summary = results.reduce<Record<string, number>>(
    (acc, result) => {
      acc[result.status] = (acc[result.status] ?? 0) + 1;
      return acc;
    },
    {},
  );

  console.log("Figma 사용자 가져오기 완료:", summary);
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Figma 사용자 가져오기 중 알 수 없는 오류가 발생했습니다.",
  );

  process.exitCode = 1;
});