import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { requireAuthContext } from "@/lib/auth/context";
import { updateNoteSchema } from "@/lib/notes/schema";
import { getNote, updateNote, deleteNote } from "@/lib/notes/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const auth = await requireAuthContext();
    const { noteId } = await params;
    const note = await getNote(noteId, auth.userId);
    return NextResponse.json({ note });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const auth = await requireAuthContext();
    const { noteId } = await params;
    const body = updateNoteSchema.parse(await request.json());
    const note = await updateNote(noteId, body, auth.userId);
    return NextResponse.json({ note });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "메모 내용을 확인해요." }, { status: 422 });
    }
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const auth = await requireAuthContext();
    const { noteId } = await params;
    await deleteNote(noteId, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
