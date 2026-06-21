import { NextResponse } from "next/server";
import { z } from "zod";
import { isDevelopmentDemo } from "@/lib/env";
import { normalizeUsername, usernameSchema } from "@/lib/auth/username";
import { publicLoginError } from "@/lib/auth/messages";
import {
  clearLoginFailures,
  isLoginBlocked,
  recordLoginFailure,
} from "@/lib/auth/rate-limit-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  username: z.string(),
  password: z.string().min(1),
});

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: publicLoginError("unknown-user") }, { status: 401 });
  }

  const username = normalizeUsername(parsed.data.username);
  if (!usernameSchema.safeParse(username).success) {
    return NextResponse.json({ error: publicLoginError("unknown-user") }, { status: 401 });
  }

  if (isDevelopmentDemo) {
    if (username !== "designer" || parsed.data.password !== "specflow") {
      return NextResponse.json({ error: publicLoginError("wrong-password") }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set("specflow-demo-session", "designer", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  }

  const ip = requestIp(request);
  if (await isLoginBlocked(username, ip)) {
    return NextResponse.json({ error: publicLoginError("rate-limited") }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("internal_email")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    await recordLoginFailure(username, ip);
    return NextResponse.json({ error: publicLoginError("unknown-user") }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: profile.internal_email,
    password: parsed.data.password,
  });

  if (error) {
    await recordLoginFailure(username, ip);
    return NextResponse.json({ error: publicLoginError("wrong-password") }, { status: 401 });
  }

  await clearLoginFailures(username, ip);
  return NextResponse.json({ ok: true });
}
