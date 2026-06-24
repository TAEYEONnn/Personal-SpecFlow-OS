import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { getAuthContext, requireAuthContext } from "@/lib/auth/context";
import { normalizeUsername, usernameSchema } from "@/lib/auth/username";
import { createClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  displayName: z.string().transform(normalizeUsername).pipe(usernameSchema),
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
      .select("user_id, username, internal_email")
      .eq("user_id", auth.userId)
      .single();

    return NextResponse.json({
      id: auth.userId,
      email: profile?.internal_email ?? "",
      username: auth.username,
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
    const { error } = await supabase
      .from("profiles")
      .update({ username: body.displayName })
      .eq("user_id", auth.userId);

    if (error) throw new Error("프로필 업데이트에 실패했습니다.");

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "이름을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}
