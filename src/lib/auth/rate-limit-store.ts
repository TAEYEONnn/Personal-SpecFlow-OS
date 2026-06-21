import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  nextFailureState,
  shouldBlockLogin,
  type LoginAttemptState,
} from "@/lib/auth/rate-limit";

function attemptKey(username: string, ip: string) {
  return createHash("sha256").update(`${username}:${ip}`).digest("hex");
}

function fromRow(row: {
  attempt_count: number;
  window_started_at: string;
  blocked_until: string | null;
}): LoginAttemptState {
  return {
    attemptCount: row.attempt_count,
    windowStartedAt: new Date(row.window_started_at),
    blockedUntil: row.blocked_until ? new Date(row.blocked_until) : null,
  };
}

export async function isLoginBlocked(username: string, ip: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("login_attempts")
    .select("attempt_count, window_started_at, blocked_until")
    .eq("attempt_key", attemptKey(username, ip))
    .maybeSingle();

  return data ? shouldBlockLogin(fromRow(data)) : false;
}

export async function recordLoginFailure(username: string, ip: string) {
  const admin = createAdminClient();
  const key = attemptKey(username, ip);
  const { data } = await admin
    .from("login_attempts")
    .select("attempt_count, window_started_at, blocked_until")
    .eq("attempt_key", key)
    .maybeSingle();
  const next = nextFailureState(data ? fromRow(data) : null);

  await admin.from("login_attempts").upsert({
    attempt_key: key,
    attempt_count: next.attemptCount,
    window_started_at: next.windowStartedAt.toISOString(),
    blocked_until: next.blockedUntil?.toISOString() ?? null,
    updated_at: new Date().toISOString(),
  });
}

export async function clearLoginFailures(username: string, ip: string) {
  await createAdminClient()
    .from("login_attempts")
    .delete()
    .eq("attempt_key", attemptKey(username, ip));
}
