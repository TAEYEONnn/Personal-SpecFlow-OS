import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { requireAuthContext } from "@/lib/auth/context";
import { updateTaskSchema } from "@/lib/tasks/schema";
import { updateTask, deleteTask } from "@/lib/tasks/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const auth = await requireAuthContext();
    const { taskId } = await params;
    const body = updateTaskSchema.parse(await request.json());
    const task = await updateTask(taskId, body, auth.userId);
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "할 일 내용을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const auth = await requireAuthContext();
    const { taskId } = await params;
    await deleteTask(taskId, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
