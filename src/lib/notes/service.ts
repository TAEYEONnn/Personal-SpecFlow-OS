import { createClient } from "@/lib/supabase/server";
import { getMyTeamIds } from "@/lib/teams/service";
import {
  createNoteSchema,
  updateNoteSchema,
  type CreateNoteInput,
  type UpdateNoteInput,
} from "@/lib/notes/schema";
import { createTask, type WorkspaceTaskView } from "@/lib/tasks/service";

export type WorkspaceNoteView = {
  id: string;
  title: string | null;
  content: string;
  kind: "note" | "scratch";
  visibility: "personal" | "team";
  teamId: string | null;
  projectId: string | null;
  createdBy: string;
  updatedBy: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapNote(row: Record<string, unknown>): WorkspaceNoteView {
  return {
    id: row.id as string,
    title: (row.title as string | null) ?? null,
    content: (row.content as string) ?? "",
    kind: row.kind as "note" | "scratch",
    visibility: row.visibility as "personal" | "team",
    teamId: (row.team_id as string | null) ?? null,
    projectId: (row.project_id as string | null) ?? null,
    createdBy: row.created_by as string,
    updatedBy: row.updated_by as string,
    pinned: (row.pinned as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listNotes(
  userId: string,
  options: {
    teamId?: string;
    personal?: boolean;
    kind?: string;
    search?: string;
  } = {},
): Promise<WorkspaceNoteView[]> {
  const supabase = await createClient();
  const teamIds = await getMyTeamIds();

  if (options.teamId && !teamIds.includes(options.teamId)) {
    throw new Error("팀 메모에 접근할 수 없어요.");
  }

  let query = supabase
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);

  // RLS handles visibility, but add explicit filters
  if (options.teamId) {
    query = query.eq("team_id", options.teamId);
  }
  if (options.personal) {
    query = query.eq("visibility", "personal");
  }
  if (options.kind) {
    query = query.eq("kind", options.kind);
  }
  if (options.search) {
    query = query.or(
      `title.ilike.%${options.search}%,content.ilike.%${options.search}%`,
    );
  }

  const { data } = await query;
  return (data ?? []).map(mapNote);
}

export async function getNote(
  noteId: string,
  userId: string,
): Promise<WorkspaceNoteView> {
  void userId;
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .single();
  if (!data) throw new Error("메모를 찾을 수 없어요.");
  return mapNote(data);
}

export async function createNote(
  input: CreateNoteInput,
  userId: string,
): Promise<WorkspaceNoteView> {
  const data = createNoteSchema.parse(input);
  const teamId = data.visibility === "team" ? (data.teamId ?? null) : null;

  if (teamId) {
    const teamIds = await getMyTeamIds();
    if (!teamIds.includes(teamId))
      throw new Error("팀 멤버만 팀 메모를 만들 수 있어요.");
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("notes")
    .insert({
      title: data.title ?? null,
      content: data.content,
      kind: data.kind,
      visibility: data.visibility,
      team_id: teamId,
      project_id: data.projectId ?? null,
      pinned: data.pinned,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();
  if (error || !row) throw new Error("메모를 만들지 못했어요.");
  return mapNote(row);
}

export async function updateNote(
  noteId: string,
  input: UpdateNoteInput,
  userId: string,
): Promise<WorkspaceNoteView> {
  const patch = updateNoteSchema.parse(input);
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .single();
  if (!current) throw new Error("메모를 찾을 수 없어요.");

  const visibility = patch.visibility ?? current.visibility;
  const teamId =
    visibility === "team"
      ? patch.teamId === undefined
        ? current.team_id
        : patch.teamId
      : null;

  if (visibility === "team" && !teamId) {
    throw new Error("공유 메모에는 팀이 필요해요.");
  }
  if (teamId) {
    const teamIds = await getMyTeamIds();
    if (!teamIds.includes(teamId))
      throw new Error("팀 멤버만 팀 메모를 수정할 수 있어요.");
  }

  const { projectId } = patch;
  const fields = {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.content !== undefined ? { content: patch.content } : {}),
    ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
    ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
  };
  const { data: row, error } = await supabase
    .from("notes")
    .update({
      ...fields,
      team_id: teamId,
      ...(projectId !== undefined ? { project_id: projectId } : {}),
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .select()
    .single();
  if (error || !row) throw new Error("메모를 수정하지 못했어요.");
  return mapNote(row);
}

export async function deleteNote(
  noteId: string,
  userId: string,
): Promise<void> {
  void userId;
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id")
    .eq("id", noteId)
    .single();
  if (!data) throw new Error("메모를 찾을 수 없어요.");

  await supabase.from("notes").delete().eq("id", noteId);
}

export async function convertScratch(
  noteId: string,
  target: "note" | "task",
  userId: string,
): Promise<{ type: "note" | "task"; note?: WorkspaceNoteView; task?: WorkspaceTaskView }> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .single();
  if (!current) throw new Error("메모를 찾을 수 없어요.");
  if (current.kind !== "scratch")
    throw new Error("낙서만 전환할 수 있어요.");

  if (target === "note") {
    const { data: row, error } = await supabase
      .from("notes")
      .update({
        kind: "note",
        title:
          current.title ||
          (current.content ?? "").split("\n")[0].slice(0, 80) ||
          "새 메모",
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId)
      .select()
      .single();
    if (error || !row) throw new Error("전환하지 못했어요.");
    return { type: "note", note: mapNote(row) };
  }

  // Convert to task
  const content = (current.content ?? "").trim();
  if (!content) throw new Error("빈 낙서는 할 일로 전환할 수 없어요.");

  const task = await createTask(
    {
      title: (current.title || content.split("\n")[0]).slice(0, 200),
      description: content,
      isPersonal: current.visibility === "personal",
      teamId: current.team_id,
      projectId: current.project_id,
      assigneeId: current.visibility === "personal" ? userId : null,
      status: "todo",
      priority: "medium",
    },
    userId,
  );

  await supabase.from("notes").delete().eq("id", noteId);
  return { type: "task", task };
}
