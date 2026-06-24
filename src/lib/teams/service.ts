import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthContext } from "@/lib/auth/context";

export type TeamRole = "owner" | "admin" | "member";

export type TeamView = {
  id: string;
  name: string;
  ownerId: string;
  myRole: TeamRole;
};

export type TeamMemberView = {
  id: string;
  userId: string;
  email: string;
  username: string;
  displayName: string;
  role: TeamRole;
};

export type InvitationView = {
  id: string;
  token: string;
  email: string;
  username: string;
  role: TeamRole;
  status: "pending" | "accepted" | "rejected";
  expiresAt: string;
  teamId: string;
  teamName: string;
};

async function getMyRole(
  teamId: string,
  userId: string,
): Promise<TeamRole | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return data.role as TeamRole;
}

async function assertManager(teamId: string, msg: string): Promise<void> {
  const auth = await requireAuthContext();
  const role = await getMyRole(teamId, auth.userId);
  if (role !== "owner" && role !== "admin") throw new Error(msg);
}

async function assertOwner(teamId: string): Promise<void> {
  const auth = await requireAuthContext();
  const role = await getMyRole(teamId, auth.userId);
  if (role !== "owner") throw new Error("팀 소유자만 이 작업을 수행할 수 있습니다.");
}

export async function createTeam(name: string): Promise<TeamView> {
  const auth = await requireAuthContext();
  const supabase = await createClient();

  const { data: team, error } = await supabase
    .rpc("create_team_with_owner", { p_name: name })
    .single();
  if (error || !team) {
    console.error("team_create_rpc_failed", {
      code: error?.code,
      operation: "create_team_with_owner",
    });
    throw new Error("팀을 만들지 못했어요.");
  }

  const createdTeam = team as { id: string; name: string; owner_id: string };

  return {
    id: createdTeam.id,
    name: createdTeam.name,
    ownerId: createdTeam.owner_id ?? auth.userId,
    myRole: "owner",
  };
}

export async function renameTeam(teamId: string, name: string): Promise<void> {
  await assertManager(teamId, "팀 소유자 또는 관리자만 이름을 변경할 수 있습니다.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ name })
    .eq("id", teamId);
  if (error) throw new Error("팀 이름 변경에 실패했습니다.");
}

export async function deleteTeam(teamId: string): Promise<void> {
  await assertOwner(teamId);
  const supabase = await createClient();

  // Detach projects
  await supabase.from("projects").update({ team_id: null }).eq("team_id", teamId);

  // Cascading deletes handle team_members, team_invitations, chat_messages via FK
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw new Error("팀 삭제에 실패했습니다.");
}

export async function leaveTeam(teamId: string): Promise<void> {
  const auth = await requireAuthContext();
  const role = await getMyRole(teamId, auth.userId);
  if (role === null) throw new Error("팀에 속해 있지 않아요.");
  if (role === "owner")
    throw new Error("소유자는 바로 팀을 나갈 수 없어요. 먼저 소유권을 이전해 주세요.");

  const supabase = await createClient();
  await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", auth.userId);
}

export async function transferOwnership(
  teamId: string,
  toUserId: string,
): Promise<void> {
  const auth = await requireAuthContext();
  await assertOwner(teamId);
  if (toUserId === auth.userId)
    throw new Error("자기 자신에게 소유권을 이전할 수 없어요.");

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", toUserId)
    .maybeSingle();
  if (!target) throw new Error("대상 사용자는 팀 멤버여야 해요.");

  // Demote current owner
  await supabase
    .from("team_members")
    .update({ role: "admin" })
    .eq("team_id", teamId)
    .eq("user_id", auth.userId);

  // Promote new owner
  await supabase
    .from("team_members")
    .update({ role: "owner" })
    .eq("team_id", teamId)
    .eq("user_id", toUserId);

  // Update team record
  await supabase.from("teams").update({ owner_id: toUserId }).eq("id", teamId);
}

export async function changeMemberRole(
  teamId: string,
  userId: string,
  newRole: "admin" | "member",
): Promise<void> {
  const auth = await requireAuthContext();
  await assertOwner(teamId);
  if (userId === auth.userId)
    throw new Error("자기 자신의 역할은 변경할 수 없어요.");

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) throw new Error("멤버를 찾을 수 없어요.");
  if (member.role === "owner")
    throw new Error("소유자의 역할은 소유권 이전을 통해 변경할 수 있어요.");

  await supabase
    .from("team_members")
    .update({ role: newRole })
    .eq("team_id", teamId)
    .eq("user_id", userId);
}

export async function listMyTeams(): Promise<TeamView[]> {
  const auth = await requireAuthContext();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("team_members")
    .select("role, team_id, teams(id, name, owner_id)")
    .eq("user_id", auth.userId)
    .limit(100);

  if (!memberships) return [];

  return memberships.map((m) => {
    const team = m.teams as unknown as { id: string; name: string; owner_id: string };
    return {
      id: team.id,
      name: team.name,
      ownerId: team.owner_id,
      myRole: m.role as TeamRole,
    };
  });
}

export async function getMyTeamIds(): Promise<string[]> {
  const auth = await requireAuthContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", auth.userId)
    .limit(100);

  return (data ?? []).map((r) => r.team_id);
}

export async function getTeam(
  teamId: string,
): Promise<{ id: string; name: string; ownerId: string; members: TeamMemberView[] }> {
  const auth = await requireAuthContext();
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, owner_id")
    .eq("id", teamId)
    .single();
  if (!team) throw new Error("팀을 찾을 수 없습니다.");

  const { data: members } = await supabase
    .from("team_members")
    .select("id, user_id, role")
    .eq("team_id", teamId)
    .limit(100);

  const isMember = (members ?? []).some((m) => m.user_id === auth.userId);
  if (!isMember) throw new Error("접근 권한이 없습니다.");

  // Get member profile labels
  const userIds = (members ?? []).map((m) => m.user_id);
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, username, display_name, internal_email")
    .in("user_id", userIds);
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, p]),
  );

  return {
    id: team.id,
    name: team.name,
    ownerId: team.owner_id,
    members: (members ?? []).map((m) => ({
      id: m.id,
      userId: m.user_id,
      email: profileMap.get(m.user_id)?.internal_email ?? "",
      username: profileMap.get(m.user_id)?.username ?? "",
      displayName:
        profileMap.get(m.user_id)?.display_name ??
        profileMap.get(m.user_id)?.username ??
        "",
      role: m.role as TeamRole,
    })),
  };
}

export async function inviteMember(
  teamId: string,
  username: string,
  role: "admin" | "member" = "member",
): Promise<{ token: string; email: string; username: string; expiresAt: string; id: string }> {
  await assertManager(teamId, "팀 소유자 또는 관리자만 초대할 수 있습니다.");
  const auth = await requireAuthContext();
  const admin = createAdminClient();

  // Check if account exists
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id, username, internal_email")
    .eq("username", username)
    .maybeSingle();
  if (!profile)
    throw new Error("등록된 계정이 없는 아이디예요. 먼저 가입을 안내해 주세요.");

  // Already a member?
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", profile.user_id)
    .maybeSingle();
  if (existing) throw new Error("이미 팀 멤버인 사용자예요.");

  // Pending invitation?
  const { data: pending } = await supabase
    .from("team_invitations")
    .select("id")
    .eq("team_id", teamId)
    .eq("email", profile.internal_email)
    .eq("status", "pending")
    .maybeSingle();
  if (pending) throw new Error("이미 초대가 발송됐습니다.");

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: inv, error } = await supabase
    .from("team_invitations")
    .insert({
      team_id: teamId,
      email: profile.internal_email,
      role,
      token,
      status: "pending",
      expires_at: expiresAt,
      invited_by: auth.userId,
    })
    .select()
    .single();
  if (error || !inv) throw new Error("초대 생성에 실패했습니다.");

  return { token, email: profile.internal_email, username: profile.username, expiresAt, id: inv.id };
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("team_invitations")
    .select("team_id")
    .eq("id", invitationId)
    .single();
  if (!inv) throw new Error("초대를 찾을 수 없습니다.");

  await assertManager(inv.team_id, "팀 소유자 또는 관리자만 초대를 취소할 수 있습니다.");
  await supabase.from("team_invitations").delete().eq("id", invitationId);
}

export async function getInvitation(token: string): Promise<InvitationView> {
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("team_invitations")
    .select("id, token, email, role, status, expires_at, team_id, teams(name)")
    .eq("token", token)
    .single();
  if (!inv) throw new Error("초대를 찾을 수 없습니다.");

  const { data: profile } = await admin
    .from("profiles")
    .select("username")
    .eq("internal_email", inv.email)
    .maybeSingle();

  const team = inv.teams as unknown as { name: string };
  return {
    id: inv.id,
    token: inv.token,
    email: inv.email,
    username: profile?.username ?? inv.email,
    role: inv.role as TeamRole,
    status: inv.status as "pending" | "accepted" | "rejected",
    expiresAt: inv.expires_at,
    teamId: inv.team_id,
    teamName: team?.name ?? "",
  };
}

export async function acceptInvitation(
  token: string,
): Promise<{ teamId: string; teamName: string }> {
  const auth = await requireAuthContext();
  const inv = await getInvitation(token);
  if (inv.status !== "pending") throw new Error("이미 처리된 초대입니다.");
  if (new Date(inv.expiresAt) < new Date()) throw new Error("초대가 만료됐습니다.");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("internal_email")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (profile?.internal_email?.toLowerCase() !== inv.email.toLowerCase()) {
    throw new Error("초대받은 이메일로 로그인해 주세요.");
  }

  await admin
    .from("team_invitations")
    .update({ status: "accepted" })
    .eq("id", inv.id);

  const { data: existing } = await admin
    .from("team_members")
    .select("id")
    .eq("team_id", inv.teamId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!existing) {
    await admin.from("team_members").insert({
      team_id: inv.teamId,
      user_id: auth.userId,
      role: inv.role === "owner" ? "member" : inv.role,
    });
  }

  return { teamId: inv.teamId, teamName: inv.teamName };
}

export async function rejectInvitation(token: string): Promise<void> {
  const auth = await requireAuthContext();
  const inv = await getInvitation(token);
  if (inv.status !== "pending") throw new Error("이미 처리된 초대입니다.");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("internal_email")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (profile?.internal_email?.toLowerCase() !== inv.email.toLowerCase()) {
    throw new Error("초대받은 이메일로 로그인해 주세요.");
  }

  await admin
    .from("team_invitations")
    .update({ status: "rejected" })
    .eq("id", inv.id);
}

export async function removeMember(
  teamId: string,
  userId: string,
): Promise<void> {
  const auth = await requireAuthContext();
  await assertManager(teamId, "팀 소유자 또는 관리자만 멤버를 제거할 수 있습니다.");
  if (userId === auth.userId) throw new Error("자기 자신은 제거할 수 없습니다.");

  const myRole = await getMyRole(teamId, auth.userId);
  if (myRole === "admin") {
    const targetRole = await getMyRole(teamId, userId);
    if (targetRole === "owner")
      throw new Error("관리자는 소유자를 제거할 수 없습니다.");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("멤버를 찾을 수 없습니다.");

  await supabase.from("team_members").delete().eq("id", data.id);
}

export async function listPendingInvitations(
  teamId: string,
): Promise<
  Array<{ id: string; email: string; username: string; role: TeamRole; token: string; expiresAt: string }>
> {
  await getTeam(teamId); // auth check
  const supabase = await createClient();

  const { data } = await supabase
    .from("team_invitations")
    .select("id, email, role, token, expires_at")
    .eq("team_id", teamId)
    .eq("status", "pending")
    .limit(100);

  const emails = (data ?? []).map((inv) => inv.email);
  const admin = createAdminClient();
  const { data: profiles } = emails.length
    ? await admin
        .from("profiles")
        .select("internal_email, username")
        .in("internal_email", emails)
    : { data: [] };
  const usernameMap = new Map(
    (profiles ?? []).map((profile) => [profile.internal_email, profile.username]),
  );

  return (data ?? []).map((inv) => ({
    id: inv.id,
    email: inv.email,
    username: usernameMap.get(inv.email) ?? inv.email,
    role: inv.role as TeamRole,
    token: inv.token,
    expiresAt: inv.expires_at,
  }));
}
