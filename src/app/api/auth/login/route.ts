import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSupabaseEnvState,
  isDevelopmentDemo,
  supabaseConfigurationError,
} from "@/lib/env";
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

function requestId(request: Request) {
  return request.headers.get("x-vercel-id") ?? crypto.randomUUID();
}

function logLoginAttempt(
  request: Request,
  status: {
    usernameFound: boolean;
    internalEmailPresent: boolean;
    authUserExists: boolean | null;
    signInSucceeded: boolean;
    sessionCookieWritten: boolean;
    failureCode?: string;
  },
) {
  console.info("login_attempt", {
    event: "login_attempt",
    requestId: requestId(request),
    ...status,
  });
}

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    logLoginAttempt(request, {
      usernameFound: false,
      internalEmailPresent: false,
      authUserExists: null,
      signInSucceeded: false,
      sessionCookieWritten: false,
      failureCode: "INVALID_PAYLOAD",
    });
    return NextResponse.json(
      { error: publicLoginError("unknown-user"), code: "AUTH_INVALID_CREDENTIALS" },
      { status: 401 },
    );
  }

  const username = normalizeUsername(parsed.data.username);
  if (!usernameSchema.safeParse(username).success) {
    logLoginAttempt(request, {
      usernameFound: false,
      internalEmailPresent: false,
      authUserExists: null,
      signInSucceeded: false,
      sessionCookieWritten: false,
      failureCode: "INVALID_USERNAME",
    });
    return NextResponse.json(
      { error: publicLoginError("unknown-user"), code: "AUTH_INVALID_CREDENTIALS" },
      { status: 401 },
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
    if (username !== "designer" || parsed.data.password !== "specflow") {
      logLoginAttempt(request, {
        usernameFound: username === "designer",
        internalEmailPresent: true,
        authUserExists: true,
        signInSucceeded: false,
        sessionCookieWritten: false,
        failureCode: "DEMO_INVALID_CREDENTIALS",
      });
      return NextResponse.json(
        { error: publicLoginError("wrong-password"), code: "AUTH_INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set("specflow-demo-session", "designer", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    logLoginAttempt(request, {
      usernameFound: true,
      internalEmailPresent: true,
      authUserExists: true,
      signInSucceeded: true,
      sessionCookieWritten: true,
    });
    return response;
  }

  const ip = requestIp(request);
  if (await isLoginBlocked(username, ip)) {
    logLoginAttempt(request, {
      usernameFound: false,
      internalEmailPresent: false,
      authUserExists: null,
      signInSucceeded: false,
      sessionCookieWritten: false,
      failureCode: "RATE_LIMITED",
    });
    return NextResponse.json(
      { error: publicLoginError("rate-limited"), code: "AUTH_RATE_LIMITED" },
      { status: 429 },
    );
  }

  const admin = createAdminClient();
  const profileResult = await admin
    .from("profiles")
    .select("user_id, internal_email")
    .eq("username", username)
    .maybeSingle();
  const { data: profile } = profileResult;

  if (!profile) {
    await recordLoginFailure(username, ip);
    logLoginAttempt(request, {
      usernameFound: false,
      internalEmailPresent: false,
      authUserExists: null,
      signInSucceeded: false,
      sessionCookieWritten: false,
      failureCode: "PROFILE_NOT_FOUND",
    });
    return NextResponse.json(
      { error: publicLoginError("unknown-user"), code: "AUTH_INVALID_CREDENTIALS" },
      { status: 401 },
    );
  }

  const { data: authUser } = await admin.auth.admin.getUserById(profile.user_id);
  const authUserExists = Boolean(authUser.user);

  const supabase = await createClient();
  const { data: sessionData, error } = await supabase.auth.signInWithPassword({
    email: profile.internal_email,
    password: parsed.data.password,
  });

  if (error) {
    await recordLoginFailure(username, ip);
    logLoginAttempt(request, {
      usernameFound: true,
      internalEmailPresent: Boolean(profile.internal_email),
      authUserExists,
      signInSucceeded: false,
      sessionCookieWritten: false,
      failureCode: error.code ?? "SIGN_IN_FAILED",
    });
    return NextResponse.json(
      { error: publicLoginError("wrong-password"), code: "AUTH_INVALID_CREDENTIALS" },
      { status: 401 },
    );
  }

  await clearLoginFailures(username, ip);
  logLoginAttempt(request, {
    usernameFound: true,
    internalEmailPresent: Boolean(profile.internal_email),
    authUserExists,
    signInSucceeded: true,
    sessionCookieWritten: Boolean(sessionData.session),
  });
  return NextResponse.json({ ok: true });
}
