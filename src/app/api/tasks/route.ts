import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { requireAuthContext } from "@/lib/auth/context";
import { createTaskSchema } from "@/lib/tasks/schema";
import { listTasks, createTask } from "@/lib/tasks/service";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthContext();
    const url = new URL(request.url);
    const options: Record<string, unknown> = {};
    if (url.searchParams.get("teamId")) options.teamId = url.searchParams.get("teamId");
    if (url.searchParams.get("personal") === "true") options.personal = true;
    if (url.searchParams.get("assignedToMe") === "true") options.assignedToMe = true;
    if (url.searchParams.get("status")) options.status = url.searchParams.get("status");
    if (url.searchParams.get("search")) options.search = url.searchParams.get("search");

    const tasks = await listTasks(auth.userId, options);
    return NextResponse.json({ tasks });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext();
    const body = createTaskSchema.parse(await request.json());
    const task = await createTask(body, auth.userId);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "할 일 내용을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}
