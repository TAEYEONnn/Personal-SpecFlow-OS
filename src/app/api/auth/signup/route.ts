import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSupabaseEnvState,
  isDevelopmentDemo,
  supabaseConfigurationError,
} from "@/lib/env";
import { internalEmailForUsername, normalizeUsername, usernameSchema } from "@/lib/auth/username";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  username: z.string().transform(normalizeUsername).pipe(usernameSchema),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "아이디와 8자 이상 비밀번호를 확인해요." },
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

  const username = parsed.data.username;
  const email = internalEmailForUsername(username);
  const admin = createAdminClient();
  const { data: existingByUsername } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .maybeSingle();
  if (existingByUsername) {
    return NextResponse.json({ error: "이미 사용 중인 아이디예요." }, { status: 409 });
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("user_id")
    .eq("internal_email", email)
    .maybeSingle();
  if (existingProfile) {
    return NextResponse.json({ error: "이미 사용 중인 아이디예요." }, { status: 409 });
  }

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
    display_name: username,
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
