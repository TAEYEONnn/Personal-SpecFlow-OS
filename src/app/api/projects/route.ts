import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { createProject, listProjects } from "@/lib/projects/service";

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function GET() {
  try {
    return NextResponse.json({ projects: await listProjects() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createProjectSchema.parse(await request.json());
    return NextResponse.json({ project: await createProject(body.name) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "프로젝트 이름을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}
