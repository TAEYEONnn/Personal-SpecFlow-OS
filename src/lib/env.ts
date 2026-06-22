const SUPABASE_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

type Environment = Record<string, string | undefined>;

export type SupabaseEnvState = "complete" | "none" | "partial";

export class SupabaseConfigurationError extends Error {
  constructor(public readonly missingNames: readonly string[]) {
    super(
      `Supabase 환경변수 설정이 일부만 완료되었습니다. 누락: ${missingNames.join(", ")}`,
    );
    this.name = "SupabaseConfigurationError";
  }
}

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

export function getSupabaseEnvState(
  env: Environment = process.env,
): SupabaseEnvState {
  const configuredCount = SUPABASE_ENV_NAMES.filter((name) =>
    hasValue(env[name]),
  ).length;

  if (configuredCount === 0) return "none";
  if (configuredCount === SUPABASE_ENV_NAMES.length) return "complete";
  return "partial";
}

export function supabaseConfigurationError(
  env: Environment = process.env,
) {
  return new SupabaseConfigurationError(
    SUPABASE_ENV_NAMES.filter((name) => !hasValue(env[name])),
  );
}

export function requireCompleteSupabaseEnv(
  env: Environment = process.env,
) {
  if (getSupabaseEnvState(env) !== "complete") {
    throw supabaseConfigurationError(env);
  }
}

export const hasSupabaseEnv = getSupabaseEnvState() === "complete";

export const isDevelopmentDemo =
  process.env.NODE_ENV !== "production" && getSupabaseEnvState() === "none";

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!hasValue(value)) {
    throw new Error(`${name} 환경변수가 필요합니다.`);
  }
  return value!;
}
