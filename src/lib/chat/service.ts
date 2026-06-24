import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyTeamIds } from "@/lib/teams/service";

export type ChatMessageView = {
  id: string;
  teamId: string;
  content: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  parentMessageId: string | null;
  reactions: { emoji: string; userIds: string[] }[];
  createdAt: string;
  updatedAt: string;
};

type ReactionEntry = { emoji: string; userIds: string[] };

async function assertTeamMember(teamId: string): Promise<void> {
  const teamIds = await getMyTeamIds();
  if (!teamIds.includes(teamId))
    throw new Error("팀 멤버만 이 작업을 수행할 수 있습니다.");
}

async function enrichAuthors(
  rows: Array<{ author_id: string }>,
): Promise<Map<string, { email: string; name: string }>> {
  const userIds = [...new Set(rows.map((r) => r.author_id))];
  if (userIds.length === 0) return new Map();
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, username, internal_email")
    .in("user_id", userIds);
  const map = new Map<string, { email: string; name: string }>();
  for (const p of profiles ?? []) {
    map.set(p.user_id, { email: p.internal_email, name: p.username });
  }
  return map;
}

function mapRow(
  row: Record<string, unknown>,
  authorMap: Map<string, { email: string; name: string }>,
): ChatMessageView {
  const authorId = row.author_id as string;
  const author = authorMap.get(authorId);
  const reactions = Array.isArray(row.reactions)
    ? (row.reactions as ReactionEntry[])
    : [];
  return {
    id: row.id as string,
    teamId: row.team_id as string,
    content: row.content as string,
    authorId,
    authorEmail: author?.email ?? "",
    authorName: author?.name ?? "",
    parentMessageId: (row.parent_message_id as string | null) ?? null,
    reactions,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listMessages(
  teamId: string,
  options: { limit?: number; before?: string; after?: string } = {},
): Promise<ChatMessageView[]> {
  await assertTeamMember(teamId);
  const supabase = await createClient();
  const limit = options.limit ?? 50;

  let query = supabase
    .from("chat_messages")
    .select("*")
    .eq("team_id", teamId)
    .limit(limit);

  if (options.before) {
    const { data: ref } = await supabase
      .from("chat_messages")
      .select("created_at")
      .eq("id", options.before)
      .single();
    if (ref) query = query.lt("created_at", ref.created_at);
  }
  if (options.after) {
    const { data: ref } = await supabase
      .from("chat_messages")
      .select("created_at, team_id")
      .eq("id", options.after)
      .single();
    if (ref) {
      if (ref.team_id !== teamId)
        throw new Error("다른 팀 메시지를 기준으로 조회할 수 없습니다.");
      query = query.gt("created_at", ref.created_at);
    }
  }

  query = options.after
    ? query.order("created_at", { ascending: true })
    : query.order("created_at", { ascending: false });

  const { data: rows } = await query;
  if (!rows || rows.length === 0) return [];

  const authorMap = await enrichAuthors(rows);
  return rows.map((r) => mapRow(r, authorMap));
}

export async function createMessage(
  data: { teamId: string; content: string; parentMessageId?: string },
  userId: string,
): Promise<ChatMessageView> {
  await assertTeamMember(data.teamId);
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("chat_messages")
    .insert({
      team_id: data.teamId,
      content: data.content,
      author_id: userId,
      parent_message_id: data.parentMessageId ?? null,
      reactions: [],
    })
    .select()
    .single();
  if (error || !row) throw new Error("메시지 생성에 실패했습니다.");

  const authorMap = await enrichAuthors([row]);
  return mapRow(row, authorMap);
}

export async function updateMessage(
  messageId: string,
  content: string,
  userId: string,
): Promise<ChatMessageView> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("chat_messages")
    .select("author_id, team_id")
    .eq("id", messageId)
    .single();
  if (!existing) throw new Error("메시지를 찾을 수 없습니다.");
  if (existing.author_id !== userId)
    throw new Error("자신이 작성한 메시지만 수정할 수 있습니다.");

  const { data: row, error } = await supabase
    .from("chat_messages")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .select()
    .single();
  if (error || !row) throw new Error("메시지 수정에 실패했습니다.");

  const authorMap = await enrichAuthors([row]);
  return mapRow(row, authorMap);
}

export async function deleteMessage(
  messageId: string,
  userId: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("chat_messages")
    .select("author_id")
    .eq("id", messageId)
    .single();
  if (!existing) throw new Error("메시지를 찾을 수 없습니다.");
  if (existing.author_id !== userId)
    throw new Error("자신이 작성한 메시지만 삭제할 수 있습니다.");

  await supabase.from("chat_messages").delete().eq("id", messageId);
}

export async function addReaction(
  messageId: string,
  emoji: string,
  userId: string,
): Promise<ChatMessageView> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("id", messageId)
    .single();
  if (!existing) throw new Error("메시지를 찾을 수 없습니다.");
  await assertTeamMember(existing.team_id);

  const reactions: ReactionEntry[] = Array.isArray(existing.reactions)
    ? (existing.reactions as ReactionEntry[])
    : [];

  const idx = reactions.findIndex((r) => r.emoji === emoji);
  if (idx >= 0) {
    const userIds = reactions[idx].userIds;
    if (userIds.includes(userId)) {
      const next = userIds.filter((uid) => uid !== userId);
      if (next.length === 0) {
        reactions.splice(idx, 1);
      } else {
        reactions[idx] = { emoji, userIds: next };
      }
    } else {
      reactions[idx] = { emoji, userIds: [...userIds, userId] };
    }
  } else {
    reactions.push({ emoji, userIds: [userId] });
  }

  const { data: row, error } = await supabase
    .from("chat_messages")
    .update({ reactions })
    .eq("id", messageId)
    .select()
    .single();
  if (error || !row) throw new Error("리액션 추가에 실패했습니다.");

  const authorMap = await enrichAuthors([row]);
  return mapRow(row, authorMap);
}
