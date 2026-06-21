import { COMPILER_PROMPT_VERSION } from "@/lib/ai/compiler";
import { requireAuthContext } from "@/lib/auth/context";
import {
  addDemoSource,
  createDemoProject,
  createDemoRun,
  deleteDemoProject,
  deleteDemoSource,
  finishDemoRun,
  getDemoProject,
  listDemoProjects,
  renameDemoProject,
  saveDemoDocument,
  updateDemoSource,
  type DemoRun,
} from "@/lib/projects/demo-store";
import type { SpecDocument } from "@/lib/spec/schema";
import { createClient } from "@/lib/supabase/server";

export type ProjectView = {
  id: string;
  name: string;
  revision: number;
  document: SpecDocument | null;
  sources: Array<{
    id: string;
    name: string;
    type: "paste" | "txt" | "md" | "pdf";
    content: string;
    createdAt: string;
  }>;
  runs: DemoRun[];
  updatedAt: string;
};

export async function listProjects() {
  const auth = await requireAuthContext();
  if (auth.demo) return listDemoProjects();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, revision, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    revision: row.revision,
    document: null,
    sources: [],
    runs: [],
    updatedAt: row.updated_at,
  }));
}

export async function createProject(name: string) {
  const auth = await requireAuthContext();
  if (auth.demo) return createDemoProject(name);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ name, user_id: auth.userId })
    .select("id, name, revision, updated_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    revision: data.revision,
    document: null,
    sources: [],
    runs: [],
    updatedAt: data.updated_at,
  };
}

export async function getProject(projectId: string): Promise<ProjectView | null> {
  const auth = await requireAuthContext();
  if (auth.demo) return getDemoProject(projectId);

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, revision, current_document_id, updated_at")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!project) return null;

  const [documentResult, sourceResult, runResult] = await Promise.all([
    project.current_document_id
      ? supabase
          .from("project_documents")
          .select("document")
          .eq("id", project.current_document_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("sources")
      .select("id, name, source_type, content, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("compilation_runs")
      .select(
        "id, status, model, prompt_version, duration_ms, error_code, error_message, created_at, finished_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (documentResult.error) throw documentResult.error;
  if (sourceResult.error) throw sourceResult.error;
  if (runResult.error) throw runResult.error;

  return {
    id: project.id,
    name: project.name,
    revision: project.revision,
    document: (documentResult.data?.document as SpecDocument | undefined) ?? null,
    sources: (sourceResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.source_type,
      content: row.content,
      createdAt: row.created_at,
    })),
    runs: (runResult.data ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      model: row.model,
      promptVersion: row.prompt_version,
      durationMs: row.duration_ms ?? undefined,
      errorCode: row.error_code ?? undefined,
      errorMessage: row.error_message ?? undefined,
      createdAt: row.created_at,
      finishedAt: row.finished_at ?? undefined,
    })),
    updatedAt: project.updated_at,
  };
}

export async function addSource(
  projectId: string,
  source: { name: string; type: "paste" | "txt" | "md" | "pdf"; content: string },
) {
  const auth = await requireAuthContext();
  if (auth.demo) return addDemoSource(projectId, source);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sources")
    .insert({
      project_id: projectId,
      user_id: auth.userId,
      name: source.name,
      source_type: source.type,
      content: source.content,
      size_bytes: new TextEncoder().encode(source.content).length,
    })
    .select("id, name, source_type, content, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    type: data.source_type,
    content: data.content,
    createdAt: data.created_at,
  };
}

export async function createCompilationRun(projectId: string) {
  const auth = await requireAuthContext();
  if (auth.demo) return createDemoRun(projectId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compilation_runs")
    .insert({
      project_id: projectId,
      user_id: auth.userId,
      status: "running",
      model: process.env.OPENAI_MODEL ?? "gpt-5.4",
      prompt_version: COMPILER_PROMPT_VERSION,
    })
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    status: data.status,
    model: data.model,
    promptVersion: data.prompt_version,
    createdAt: data.created_at,
  } as DemoRun;
}

export async function finishCompilationRun(
  projectId: string,
  runId: string,
  update: Partial<DemoRun> & { output?: SpecDocument },
) {
  const auth = await requireAuthContext();
  if (auth.demo) return finishDemoRun(projectId, runId, update);

  const supabase = await createClient();
  const { output, ...runUpdate } = update;
  const { data, error } = await supabase
    .from("compilation_runs")
    .update({
      status: runUpdate.status,
      duration_ms: runUpdate.durationMs,
      error_code: runUpdate.errorCode,
      error_message: runUpdate.errorMessage,
      output,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("project_id", projectId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function saveProjectDocument(
  projectId: string,
  expectedRevision: number,
  document: SpecDocument,
  runId?: string,
) {
  const auth = await requireAuthContext();
  if (auth.demo) return saveDemoDocument(projectId, expectedRevision, document);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_project_document", {
    p_project_id: projectId,
    p_expected_revision: expectedRevision,
    p_document: document,
    p_run_id: runId ?? null,
  });
  if (error) throw error;
  return data as number;
}

export async function deleteProject(projectId: string) {
  const auth = await requireAuthContext();
  if (auth.demo) {
    deleteDemoProject(projectId);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", auth.userId);
  if (error) throw error;
}

export async function deleteSource(projectId: string, sourceId: string) {
  const auth = await requireAuthContext();
  if (auth.demo) {
    deleteDemoSource(projectId, sourceId);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("sources")
    .delete()
    .eq("id", sourceId)
    .eq("project_id", projectId)
    .eq("user_id", auth.userId);
  if (error) throw error;
}

export async function updateSource(
  projectId: string,
  sourceId: string,
  patch: { name?: string; content?: string },
) {
  const auth = await requireAuthContext();
  if (auth.demo) return updateDemoSource(projectId, sourceId, patch);

  const supabase = await createClient();
  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.content !== undefined) {
    updates.content = patch.content;
    updates.size_bytes = new TextEncoder().encode(patch.content).length;
  }
  const { data, error } = await supabase
    .from("sources")
    .update(updates)
    .eq("id", sourceId)
    .eq("project_id", projectId)
    .eq("user_id", auth.userId)
    .select("id, name, source_type, content, created_at")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, type: data.source_type, content: data.content, createdAt: data.created_at };
}

export async function renameProject(projectId: string, name: string) {
  const auth = await requireAuthContext();
  if (auth.demo) {
    renameDemoProject(projectId, name);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("user_id", auth.userId);
  if (error) throw error;
}

export async function getCompilationRun(projectId: string, runId: string) {
  const project = await getProject(projectId);
  return project?.runs.find((run) => run.id === runId) ?? null;
}

export async function getDocumentAtRevision(
  projectId: string,
  revision: number,
): Promise<SpecDocument | null> {
  const auth = await requireAuthContext();
  if (auth.demo) {
    const project = getDemoProject(projectId);
    if (!project) return null;
    return revision === project.revision ? project.document : null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_documents")
    .select("document")
    .eq("project_id", projectId)
    .eq("revision", revision)
    .maybeSingle();
  if (error) throw error;
  return (data?.document as SpecDocument | undefined) ?? null;
}

export type DocumentRevisionSummary = {
  revision: number;
  createdAt: string;
  runId: string | null;
};

export async function listDocumentRevisions(
  projectId: string,
): Promise<DocumentRevisionSummary[]> {
  const auth = await requireAuthContext();
  if (auth.demo) {
    const project = getDemoProject(projectId);
    if (!project || project.revision === 0) return [];
    return [{ revision: project.revision, createdAt: project.updatedAt, runId: null }];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_documents")
    .select("revision, created_at, source_run_id")
    .eq("project_id", projectId)
    .order("revision", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    revision: row.revision,
    createdAt: row.created_at,
    runId: row.source_run_id ?? null,
  }));
}
