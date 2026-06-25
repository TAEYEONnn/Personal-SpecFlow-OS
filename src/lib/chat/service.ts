import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { getMyTeamIds } from "@/lib/teams/service";

export type Mention = {
  userId: string;
  displayName: string;
};

export type ChatMessageView = {
  id: string;
  teamId: string;
  content: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  parentMessageId: string | null;
  reactions: { emoji: string; userIds: string[] }[];
  mentions: Mention[];
  isDeleted: boolean;
  deletedAt: string | null;
  isAnnouncement: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChatAnnouncement = {
  id: string;
  teamId: string;
  messageId: string;
  message: ChatMessageView;
  announcedBy: string;
  announcedAt: string;
};

type ReactionEntry = { emoji: string; userIds: string[] };

const getMyTeamIdsCached = cache(getMyTeamIds);

async function assertTeamMember(teamId: string): Promise<void> {
  const teamIds = await getMyTeamIdsCached();
  if (!teamIds.includes(teamId))
    throw new Error("팀 멤버만 이 작업을 할 수 있어요.");
}

async function getMyRole(
  teamId: string,
): Promise<"owner" | "admin" | "member" | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .single();
  return (data?.role as "owner" | "admin" | "member") ?? null;
}

async function enrichAuthors(
  rows: Array<{ author_id: string }>,
): Promise<Map<string, { email: string; name: string }>> {
  const userIds = [...new Set(rows.map((r) => r.author_id))];
  if (userIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, internal_email")
    .in("user_id", userIds);
  const map = new Map<string, { email: string; name: string }>();
  for (const p of profiles ?? []) {
    map.set(p.user_id, {
      email: p.internal_email ?? "",
      name: p.display_name ?? p.username ?? "",
    });
  }
  return map;
}

function mapRow(
  row: Record<string, unknown>,
  authorMap: Map<string, { email: string; name: string }>,
  mentionMap: Map<string, Mention[]>,
  announcedIds: Set<string>,
): ChatMessageView {
  const authorId = row.author_id as string;
  const author = authorMap.get(authorId);
  const reactions = Array.isArray(row.reactions)
    ? (row.reactions as ReactionEntry[])
    : [];
  const isDeleted = Boolean(row.deleted_at);
  return {
    id: row.id as string,
    teamId: row.team_id as string,
    content: isDeleted ? "" : (row.content as string),
    authorId,
    authorEmail: author?.email ?? "",
    authorName: author?.name ?? "",
    parentMessageId: (row.parent_message_id as string | null) ?? null,
    reactions: isDeleted ? [] : reactions,
    mentions: mentionMap.get(row.id as string) ?? [],
    isDeleted,
    deletedAt: (row.deleted_at as string | null) ?? null,
    isAnnouncement: announcedIds.has(row.id as string),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function getMentionsForMessages(
  messageIds: string[],
): Promise<Map<string, Mention[]>> {
  if (messageIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_message_mentions")
    .select("message_id, mentioned_user_id")
    .in("message_id", messageIds);

  if (!data || data.length === 0) return new Map();

  // Batch-fetch profiles for mentioned users
  const mentionedUserIds = [...new Set(data.map((r) => r.mentioned_user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, display_name")
    .in("user_id", mentionedUserIds);

  const profileMap = new Map<string, { username?: string; display_name?: string }>();
  for (const p of profiles ?? []) {
    profileMap.set(p.user_id, p);
  }

  const map = new Map<string, Mention[]>();
  for (const row of data) {
    const profile = profileMap.get(row.mentioned_user_id);
    const mention: Mention = {
      userId: row.mentioned_user_id,
      displayName:
        profile?.display_name ?? profile?.username ?? row.mentioned_user_id,
    };
    const list = map.get(row.message_id) ?? [];
    list.push(mention);
    map.set(row.message_id, list);
  }
  return map;
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
    query = query.lt("id", options.before);
  }
  if (options.after) {
    query = query.gt("id", options.after);
  }

  query = options.after
    ? query.order("created_at", { ascending: true })
    : query.order("created_at", { ascending: false });

  const [{ data: rows }, { data: announcedRows }] = await Promise.all([
    query,
    supabase
      .from("chat_announcements")
      .select("message_id")
      .eq("team_id", teamId),
  ]);

  if (!rows || rows.length === 0) return [];

  const announcedIds = new Set(
    (announcedRows ?? []).map((r) => r.message_id),
  );
  const messageIds = rows.map((r) => r.id);

  const [authorMap, mentionMap] = await Promise.all([
    enrichAuthors(rows),
    getMentionsForMessages(messageIds),
  ]);

  return rows.map((r) =>
    mapRow(r as Record<string, unknown>, authorMap, mentionMap, announcedIds),
  );
}

export async function createMessage(
  data: {
    teamId: string;
    content: string;
    parentMessageId?: string;
    mentionedUserIds?: string[];
  },
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
  if (error || !row) throw new Error("메시지를 보내지 못했어요.");

  // Insert mentions (ignore duplicates)
  const mentionedUserIds = (data.mentionedUserIds ?? []).filter(
    (id) => id !== userId,
  );
  if (mentionedUserIds.length > 0) {
    await supabase.from("chat_message_mentions").insert(
      mentionedUserIds.map((uid) => ({
        message_id: row.id,
        mentioned_user_id: uid,
        team_id: data.teamId,
      })),
    );
  }

  const [authorMap, mentionMap] = await Promise.all([
    enrichAuthors([row]),
    getMentionsForMessages([row.id]),
  ]);
  return mapRow(row as Record<string, unknown>, authorMap, mentionMap, new Set());
}

export async function updateMessage(
  messageId: string,
  content: string,
  userId: string,
): Promise<ChatMessageView> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("chat_messages")
    .select("author_id, team_id, deleted_at")
    .eq("id", messageId)
    .single();
  if (!existing) throw new Error("메시지를 찾을 수 없어요.");
  if (existing.deleted_at) throw new Error("삭제된 메시지는 수정할 수 없어요.");
  if (existing.author_id !== userId)
    throw new Error("자신이 작성한 메시지만 수정할 수 있어요.");

  const { data: row, error } = await supabase
    .from("chat_messages")
    .update({ content })
    .eq("id", messageId)
    .select()
    .single();
  if (error || !row) throw new Error("메시지를 수정하지 못했어요.");

  const [authorMap, mentionMap] = await Promise.all([
    enrichAuthors([row]),
    getMentionsForMessages([row.id]),
  ]);
  return mapRow(row as Record<string, unknown>, authorMap, mentionMap, new Set());
}

export async function deleteMessage(
  messageId: string,
  userId: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("chat_messages")
    .select("author_id, team_id, deleted_at")
    .eq("id", messageId)
    .single();
  if (!existing) throw new Error("메시지를 찾을 수 없어요.");
  if (existing.deleted_at) return;

  const isAuthor = existing.author_id === userId;
  if (!isAuthor) {
    const role = await getMyRole(existing.team_id);
    if (!role || !["owner", "admin"].includes(role)) {
      throw new Error("삭제할 권한이 없어요.");
    }
  }

  const { error } = await supabase
    .from("chat_messages")
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq("id", messageId);
  if (error) throw new Error("메시지를 삭제하지 못했어요.");
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
  if (!existing) throw new Error("메시지를 찾을 수 없어요.");
  if (existing.deleted_at) throw new Error("삭제된 메시지에는 반응할 수 없어요.");
  await assertTeamMember(existing.team_id);

  const reactions: ReactionEntry[] = Array.isArray(existing.reactions)
    ? (existing.reactions as ReactionEntry[])
    : [];

  const idx = reactions.findIndex((r) => r.emoji === emoji);
  if (idx >= 0) {
    const userIds = reactions[idx].userIds;
    const next = userIds.includes(userId)
      ? userIds.filter((uid) => uid !== userId)
      : [...userIds, userId];
    if (next.length === 0) reactions.splice(idx, 1);
    else reactions[idx] = { emoji, userIds: next };
  } else {
    reactions.push({ emoji, userIds: [userId] });
  }

  const { data: row, error } = await supabase
    .from("chat_messages")
    .update({ reactions })
    .eq("id", messageId)
    .select()
    .single();
  if (error || !row) throw new Error("리액션을 추가하지 못했어요.");

  const [authorMap, mentionMap] = await Promise.all([
    enrichAuthors([row]),
    getMentionsForMessages([row.id]),
  ]);
  return mapRow(row as Record<string, unknown>, authorMap, mentionMap, new Set());
}

export async function listAnnouncements(
  teamId: string,
): Promise<ChatAnnouncement[]> {
  await assertTeamMember(teamId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_announcements")
    .select("*")
    .eq("team_id", teamId)
    .order("announced_at", { ascending: false });

  if (!data || data.length === 0) return [];

  // Fetch linked messages
  const messageIds = data.map((r) => r.message_id);
  const { data: msgRows } = await supabase
    .from("chat_messages")
    .select("*")
    .in("id", messageIds);

  if (!msgRows) return [];

  const announcedIds = new Set(messageIds);
  const validMsgs = msgRows.filter((m) => !m.deleted_at);
  const validMsgIds = new Set(validMsgs.map((m) => m.id));

  const [authorMap, mentionMap] = await Promise.all([
    enrichAuthors(validMsgs),
    getMentionsForMessages(validMsgs.map((m) => m.id)),
  ]);

  const msgMap = new Map<string, ChatMessageView>();
  for (const m of validMsgs) {
    msgMap.set(
      m.id,
      mapRow(m as Record<string, unknown>, authorMap, mentionMap, announcedIds),
    );
  }

  return data
    .filter((r) => validMsgIds.has(r.message_id))
    .map((r) => ({
      id: r.id,
      teamId: r.team_id,
      messageId: r.message_id,
      message: msgMap.get(r.message_id)!,
      announcedBy: r.announced_by,
      announcedAt: r.announced_at,
    }));
}

export async function toggleAnnouncement(
  teamId: string,
  messageId: string,
  userId: string,
): Promise<{ announced: boolean }> {
  await assertTeamMember(teamId);
  const role = await getMyRole(teamId);
  if (!role || !["owner", "admin"].includes(role)) {
    throw new Error("팀 관리자만 공지를 등록할 수 있어요.");
  }
  const supabase = await createClient();

  const { data: msg } = await supabase
    .from("chat_messages")
    .select("id, deleted_at")
    .eq("id", messageId)
    .eq("team_id", teamId)
    .single();
  if (!msg) throw new Error("메시지를 찾을 수 없어요.");
  if (msg.deleted_at) throw new Error("삭제된 메시지는 공지로 등록할 수 없어요.");

  const { data: existing } = await supabase
    .from("chat_announcements")
    .select("id")
    .eq("team_id", teamId)
    .eq("message_id", messageId)
    .single();

  if (existing) {
    await supabase.from("chat_announcements").delete().eq("id", existing.id);
    return { announced: false };
  } else {
    await supabase.from("chat_announcements").insert({
      team_id: teamId,
      message_id: messageId,
      announced_by: userId,
    });
    return { announced: true };
  }
}

export async function getTeamMembersForMention(
  teamId: string,
): Promise<
  Array<{
    userId: string;
    username: string;
    displayName: string;
    role: string;
  }>
> {
  await assertTeamMember(teamId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("user_id, role")
    .eq("team_id", teamId);

  if (!data || data.length === 0) return [];

  const userIds = data.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, display_name")
    .in("user_id", userIds);

  const profileMap = new Map<
    string,
    { username?: string; display_name?: string }
  >();
  for (const p of profiles ?? []) {
    profileMap.set(p.user_id, p);
  }

  return data.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      userId: row.user_id,
      username: profile?.username ?? "",
      displayName: profile?.display_name ?? profile?.username ?? "",
      role: row.role,
    };
  });
}
