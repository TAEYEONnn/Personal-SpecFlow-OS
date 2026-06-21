import { cookies } from "next/headers";
import { isDevelopmentDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type AuthContext = {
  userId: string;
  username: string;
  demo: boolean;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  if (isDevelopmentDemo) {
    const session = (await cookies()).get("specflow-demo-session");
    return session
      ? {
          userId: "00000000-0000-0000-0000-000000000001",
          username: session.value,
          demo: true,
        }
      : null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", data.user.id)
    .single();

  return {
    userId: data.user.id,
    username: profile?.username ?? "designer",
    demo: false,
  };
}

export async function requireAuthContext() {
  const context = await getAuthContext();
  if (!context) throw new Error("UNAUTHORIZED");
  return context;
}
