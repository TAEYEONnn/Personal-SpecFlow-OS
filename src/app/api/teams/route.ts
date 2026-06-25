import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { createTeam, listMyTeams } from "@/lib/teams/service";

const createSchema = z.object({ name: z.string().trim().min(1).max(120) });

export async function GET() {
  try {
    return NextResponse.json({ teams: await listMyTeams() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    return NextResponse.json({ team: await createTeam(body.name) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "팀 이름을 확인해요.", code: "TEAM_INVALID_NAME" },
        { status: 422 },
      );
    }
    console.error("team_create_failed", {
      event: "team_create_failed",
      requestId: request.headers.get("x-vercel-id") ?? crypto.randomUUID(),
      message: error instanceof Error ? error.message : "unknown",
    });
    return apiError(error);
  }
}
