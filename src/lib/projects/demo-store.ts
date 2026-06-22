import { randomUUID } from "node:crypto";
import { COMPILER_PROMPT_VERSION } from "@/lib/ai/compiler";
import { assertRevision } from "@/lib/projects/revision";
import type { SpecDocument } from "@/lib/spec/schema";

export type DemoSource = {
  id: string;
  name: string;
  type: "paste" | "txt" | "md" | "pdf";
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type DemoRun = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  model: string;
  promptVersion: string;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  finishedAt?: string;
};

export type DemoProject = {
  id: string;
  name: string;
  revision: number;
  document: SpecDocument | null;
  sources: DemoSource[];
  runs: DemoRun[];
  updatedAt: string;
  needsRecompile: boolean;
};

type DemoGlobal = typeof globalThis & {
  __specflowDemoProjects?: Map<string, DemoProject>;
};

function store() {
  const global = globalThis as DemoGlobal;
  global.__specflowDemoProjects ??= new Map<string, DemoProject>();
  return global.__specflowDemoProjects;
}

export function resetDemoStore() {
  store().clear();
}

export function createDemoProject(name: string) {
  const project: DemoProject = {
    id: randomUUID(),
    name,
    revision: 0,
    document: null,
    sources: [],
    runs: [],
    updatedAt: new Date().toISOString(),
    needsRecompile: false,
  };
  store().set(project.id, project);
  return structuredClone(project);
}

export function listDemoProjects() {
  return [...store().values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((project) => structuredClone(project));
}

export function getDemoProject(id: string) {
  const project = store().get(id);
  return project ? structuredClone(project) : null;
}

export function addDemoSource(
  projectId: string,
  source: Omit<DemoSource, "id" | "createdAt" | "updatedAt">,
) {
  const project = store().get(projectId);
  if (!project) throw new Error("프로젝트를 찾을 수 없습니다.");
  const now = new Date().toISOString();
  const next: DemoSource = {
    ...source,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  project.sources.push(next);
  project.needsRecompile = true;
  project.updatedAt = next.createdAt;
  return structuredClone(next);
}

export function createDemoRun(projectId: string) {
  const project = store().get(projectId);
  if (!project) throw new Error("프로젝트를 찾을 수 없습니다.");
  const run: DemoRun = {
    id: randomUUID(),
    status: "running",
    model: process.env.OPENAI_MODEL ?? "gpt-5.4",
    promptVersion: COMPILER_PROMPT_VERSION,
    createdAt: new Date().toISOString(),
  };
  project.runs.unshift(run);
  return structuredClone(run);
}

export function finishDemoRun(
  projectId: string,
  runId: string,
  update: Partial<DemoRun>,
) {
  const project = store().get(projectId);
  const run = project?.runs.find((candidate) => candidate.id === runId);
  if (!project || !run) throw new Error("정리 기록을 찾을 수 없습니다.");
  Object.assign(run, update, { finishedAt: new Date().toISOString() });
  return structuredClone(run);
}

export function renameDemoProject(projectId: string, name: string) {
  const project = store().get(projectId);
  if (!project) throw new Error("프로젝트를 찾을 수 없습니다.");
  project.name = name;
  project.updatedAt = new Date().toISOString();
}

export function deleteDemoProject(projectId: string) {
  if (!store().has(projectId)) throw new Error("프로젝트를 찾을 수 없습니다.");
  store().delete(projectId);
}

export function deleteDemoSource(projectId: string, sourceId: string) {
  const project = store().get(projectId);
  if (!project) throw new Error("프로젝트를 찾을 수 없습니다.");
  const before = project.sources.length;
  project.sources = project.sources.filter((s) => s.id !== sourceId);
  if (project.sources.length === before) throw new Error("소스를 찾을 수 없습니다.");
  project.needsRecompile = true;
  project.updatedAt = new Date().toISOString();
}

export function updateDemoSource(
  projectId: string,
  sourceId: string,
  patch: { name?: string; content?: string },
) {
  const project = store().get(projectId);
  if (!project) throw new Error("프로젝트를 찾을 수 없습니다.");
  const source = project.sources.find((s) => s.id === sourceId);
  if (!source) throw new Error("소스를 찾을 수 없습니다.");
  if (patch.name !== undefined) source.name = patch.name;
  if (patch.content !== undefined) {
    source.content = patch.content;
    project.needsRecompile = true;
  }
  source.updatedAt = new Date().toISOString();
  project.updatedAt = source.updatedAt;
  return structuredClone(source);
}

export function saveDemoDocument(
  projectId: string,
  expectedRevision: number,
  document: SpecDocument,
  clearRecompile = false,
) {
  const project = store().get(projectId);
  if (!project) throw new Error("프로젝트를 찾을 수 없습니다.");
  assertRevision(expectedRevision, project.revision);
  project.revision += 1;
  project.document = structuredClone(document);
  project.updatedAt = new Date().toISOString();
  if (clearRecompile) project.needsRecompile = false;
  return project.revision;
}
