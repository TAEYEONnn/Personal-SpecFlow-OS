import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSupabaseEnvState,
  isDevelopmentDemo,
  supabaseConfigurationError,
} from "@/lib/env";
import { normalizeUsername, usernameSchema } from "@/lib/auth/username";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

function usernameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "user";
  const normalized = normalizeUsername(
    localPart
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
  );

  const candidate = normalized.length >= 3 ? normalized.slice(0, 32) : `user-${normalized}`;
  const parsed = usernameSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;
  return `user-${randomUUID().slice(0, 8)}`;
}

async function uniqueUsername(baseUsername: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("username")
    .ilike("username", `${baseUsername}%`)
    .limit(50);

  const taken = new Set((existing ?? []).map((row) => String(row.username).toLowerCase()));
  if (!taken.has(baseUsername)) return baseUsername;

  for (let index = 2; index < 100; index += 1) {
    const suffix = `-${index}`;
    const candidate = `${baseUsername.slice(0, 32 - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${baseUsername.slice(0, 23)}-${randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "이메일과 8자 이상 비밀번호를 확인해 주세요." },
      { status: 422 },
    );
  }

  const envState = getSupabaseEnvState();
  if (envState === "partial" || (envState === "none" && !isDevelopmentDemo)) {
    return NextResponse.json(
      { error: supabaseConfigurationError().message },
      { status: 503 },
    );
  }

  if (isDevelopmentDemo) {
    const response = NextResponse.json({ ok: true, username: "designer" });
    response.cookies.set("specflow-demo-session", "designer", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  }

  const email = parsed.data.email.toLowerCase();
  const admin = createAdminClient();
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("user_id")
    .eq("internal_email", email)
    .maybeSingle();
  if (existingProfile) {
    return NextResponse.json({ error: "이미 가입된 이메일이에요." }, { status: 409 });
  }

  const username = await uniqueUsername(usernameFromEmail(email));
  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (createError || !createdUser.user) {
    return NextResponse.json({ error: "계정을 만들지 못했어요." }, { status: 500 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: createdUser.user.id,
    username,
    internal_email: email,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(createdUser.user.id);
    return NextResponse.json({ error: "프로필을 만들지 못했어요." }, { status: 500 });
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });
  if (signInError) {
    return NextResponse.json({ ok: true, username });
  }

  return NextResponse.json({ ok: true, username });
}
