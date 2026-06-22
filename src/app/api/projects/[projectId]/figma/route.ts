import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { recommendFigmaComponents } from "@/lib/figma/recommend";
import type { FigmaLibrary } from "@/lib/figma/types";
import { getProject } from "@/lib/projects/service";

const figmaVariantSchema = z.object({
  property: z.string(),
  values: z.array(z.string()),
});

const figmaComponentSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().default(""),
  variants: z.array(figmaVariantSchema).optional(),
});

const figmaVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  resolvedType: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]),
  valuesByMode: z.record(z.string(), z.unknown()),
});

const bodySchema = z.object({
  fileKey: z.string().min(1),
  fileName: z.string().default("Figma Library"),
  components: z.array(figmaComponentSchema).default([]),
  variables: z.array(figmaVariableSchema).default([]),
  screenIds: z.array(z.string()).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const project = await getProject(projectId);
    if (!project?.document) {
      return NextResponse.json({ error: "정리된 문서가 없습니다." }, { status: 404 });
    }

    const body = bodySchema.parse(await request.json());
    const library: FigmaLibrary = {
      fileKey: body.fileKey,
      fileName: body.fileName,
      components: body.components,
      variables: body.variables,
      fetchedAt: new Date().toISOString(),
    };

    const screens = body.screenIds
      ? project.document.screens.filter((s) => body.screenIds!.includes(s.id))
      : project.document.screens;

    const recommendations = await recommendFigmaComponents(screens, library);
    return NextResponse.json({ recommendations, libraryName: library.fileName });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력 형식을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}
