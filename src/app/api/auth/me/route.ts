import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { getAuthContext, requireAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  displayName: z.string().trim().max(80).nullable(),
});

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, username, internal_email, display_name")
      .eq("user_id", auth.userId)
      .single();

    return NextResponse.json({
      id: auth.userId,
      email: profile?.internal_email ?? "",
      username: auth.username,
      displayName: profile?.display_name ?? profile?.username ?? "",
      role: "user",
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuthContext();
    const body = updateProfileSchema.parse(await request.json());

    const supabase = await createClient();
    const displayName = body.displayName?.trim() || null;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("user_id", auth.userId);

    if (error) {
      console.error("profile_update_failed", {
        code: error.code,
        table: "profiles",
        operation: "update",
      });
      throw new Error("프로필 업데이트에 실패했습니다.");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "이름을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}
