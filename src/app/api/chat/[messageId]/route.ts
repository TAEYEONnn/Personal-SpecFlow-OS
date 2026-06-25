import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { requireAuthContext } from "@/lib/auth/context";
import { updateMessageSchema } from "@/lib/chat/schema";
import { updateMessage, deleteMessage } from "@/lib/chat/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const auth = await requireAuthContext();
    const { messageId } = await params;
    const body = updateMessageSchema.parse(await request.json());
    const message = await updateMessage(messageId, body.content, auth.userId);
    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "메시지 내용을 확인해요." }, { status: 422 });
    }
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const auth = await requireAuthContext();
    const { messageId } = await params;
    await deleteMessage(messageId, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
