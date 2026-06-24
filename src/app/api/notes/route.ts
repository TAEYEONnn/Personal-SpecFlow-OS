import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { requireAuthContext } from "@/lib/auth/context";
import { createNoteSchema } from "@/lib/notes/schema";
import { listNotes, createNote } from "@/lib/notes/service";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext();
    const url = new URL(request.url);
    const options: Record<string, unknown> = {};
    if (url.searchParams.get("teamId")) options.teamId = url.searchParams.get("teamId");
    if (url.searchParams.get("personal") === "true") options.personal = true;
    if (url.searchParams.get("kind")) options.kind = url.searchParams.get("kind");
    if (url.searchParams.get("search")) options.search = url.searchParams.get("search");

    const notes = await listNotes(auth.userId, options);
    return NextResponse.json({ notes });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext();
    const body = createNoteSchema.parse(await request.json());
    const note = await createNote(body, auth.userId);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "메모 내용을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}
