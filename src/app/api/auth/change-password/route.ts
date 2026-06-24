import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { requireAuthContext } from "@/lib/auth/context";
import { isDevelopmentDemo } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = changePasswordSchema.parse(await request.json());
    const auth = await requireAuthContext();

    if (auth.demo || isDevelopmentDemo) {
      if (body.currentPassword !== "specflow") {
        return NextResponse.json({ error: "현재 비밀번호가 맞지 않아요." }, { status: 401 });
      }
      return NextResponse.json({ ok: true });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("internal_email")
      .eq("user_id", auth.userId)
      .single();
    if (!profile?.internal_email) {
      return NextResponse.json({ error: "계정 정보를 찾을 수 없어요." }, { status: 404 });
    }

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.internal_email,
      password: body.currentPassword,
    });
    if (signInError) {
      return NextResponse.json({ error: "현재 비밀번호가 맞지 않아요." }, { status: 401 });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: body.newPassword,
    });
    if (updateError) {
      return NextResponse.json({ error: "비밀번호를 바꾸지 못했어요." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 해요." },
        { status: 422 },
      );
    }
    return apiError(error);
  }
}
