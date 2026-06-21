import { NextResponse } from "next/server";
import { isDevelopmentDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  if (isDevelopmentDemo) {
    response.cookies.delete("specflow-demo-session");
    return response;
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return response;
}
