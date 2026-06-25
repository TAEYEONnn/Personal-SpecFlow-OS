import { cache } from "react";
import {
  getSupabaseEnvState,
  isDevelopmentDemo,
  supabaseConfigurationError,
} from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type AuthContext = {
  userId: string;
  username: string;
  displayName: string;
  demo: boolean;
};

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const envState = getSupabaseEnvState();
  if (envState === "partial" || (envState === "none" && !isDevelopmentDemo)) {
    throw supabaseConfigurationError();
  }

  if (isDevelopmentDemo) {
    // The proxy already requires the HTTP-only demo session cookie for every
    // protected page and API route. Avoid reading request-bound cookies again
    // in service functions, which can run after request parsing in Next.js.
    return {
      userId: "00000000-0000-0000-0000-000000000001",
      username: "designer",
      displayName: "디자이너",
      demo: true,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("user_id", data.user.id)
    .single();
  const username = profile?.username ?? "designer";

  return {
    userId: data.user.id,
    username,
    displayName: profile?.display_name ?? username,
    demo: false,
  };
});

export async function requireAuthContext() {
  const context = await getAuthContext();
  if (!context) throw new Error("UNAUTHORIZED");
  return context;
}
