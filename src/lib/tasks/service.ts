import { createClient } from "@/lib/supabase/server";
import { getMyTeamIds } from "@/lib/teams/service";
import {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@/lib/tasks/schema";

export type WorkspaceTaskView = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "inProgress" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  isPersonal: boolean;
  teamId: string | null;
  projectId: string | null;
  assigneeId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

function mapTask(row: Record<string, unknown>): WorkspaceTaskView {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    status: row.status as "todo" | "inProgress" | "done",
    priority: row.priority as "low" | "medium" | "high",
    dueDate: (row.due_date as string | null) ?? null,
    isPersonal: row.is_personal as boolean,
    teamId: (row.team_id as string | null) ?? null,
    projectId: (row.project_id as string | null) ?? null,
    assigneeId: (row.assignee_id as string | null) ?? null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listTasks(
  userId: string,
  options: {
    teamId?: string;
    personal?: boolean;
    assignedToMe?: boolean;
    status?: string;
    search?: string;
  } = {},
): Promise<WorkspaceTaskView[]> {
  const supabase = await createClient();
  const teamIds = await getMyTeamIds();

  if (options.teamId && !teamIds.includes(options.teamId)) {
    throw new Error("팀 할 일에 접근할 수 없습니다.");
  }

  let query = supabase
    .from("tasks")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (options.teamId) query = query.eq("team_id", options.teamId);
  if (options.personal) query = query.eq("is_personal", true);
  if (options.assignedToMe) query = query.eq("assignee_id", userId);
  if (options.status) query = query.eq("status", options.status);
  if (options.search) query = query.ilike("title", `%${options.search}%`);

  const { data } = await query;
  return (data ?? []).map(mapTask);
}

export async function createTask(
  input: CreateTaskInput,
  userId: string,
): Promise<WorkspaceTaskView> {
  const data = createTaskSchema.parse(input);
  const teamId = data.isPersonal ? null : (data.teamId ?? null);

  if (teamId) {
    const teamIds = await getMyTeamIds();
    if (!teamIds.includes(teamId))
      throw new Error("팀 멤버만 팀 할 일을 생성할 수 있습니다.");
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("tasks")
    .insert({
      title: data.title,
      description: data.description ?? null,
      status: data.status,
      priority: data.priority,
      due_date: data.dueDate ?? null,
      is_personal: data.isPersonal,
      team_id: teamId,
      project_id: data.projectId ?? null,
      assignee_id: data.isPersonal ? userId : (data.assigneeId ?? null),
      created_by: userId,
    })
    .select()
    .single();
  if (error || !row) throw new Error("할 일 생성에 실패했습니다.");
  return mapTask(row);
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
  userId: string,
): Promise<WorkspaceTaskView> {
  void userId;
  const patch = updateTaskSchema.parse(input);
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();
  if (!current) throw new Error("할 일을 찾을 수 없습니다.");

  const { projectId, assigneeId, ...fields } = patch;
  const { data: row, error } = await supabase
    .from("tasks")
    .update({
      ...fields,
      ...(projectId !== undefined ? { project_id: projectId } : {}),
      ...(assigneeId !== undefined ? { assignee_id: assigneeId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();
  if (error || !row) throw new Error("할 일 수정에 실패했습니다.");
  return mapTask(row);
}

export async function deleteTask(
  taskId: string,
  userId: string,
): Promise<void> {
  void userId;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .single();
  if (!data) throw new Error("할 일을 찾을 수 없습니다.");

  await supabase.from("tasks").delete().eq("id", taskId);
}
