"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { TeamRole } from "@/lib/teams/service";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Member = {
  id: string;
  userId: string;
  email: string;
  username: string;
  displayName: string;
  role: TeamRole;
};
type Invitation = {
  id: string;
  email: string | null;
  username: string | null;
  role: TeamRole;
  token: string;
  expiresAt: string;
};

export function TeamSettings({
  teamId,
  teamName: initialTeamName,
  ownerId,
  myUserId,
  myRole,
  initialMembers,
  initialInvitations,
}: {
  teamId: string;
  teamName: string;
  ownerId: string;
  myUserId: string;
  myRole: TeamRole;
  initialMembers: Member[];
  initialInvitations: Invitation[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteError, setInviteError] = useState("");
  const [invitePending, setInvitePending] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  // Team rename
  const [teamName, setTeamName] = useState(initialTeamName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(initialTeamName);
  const [renameError, setRenameError] = useState("");
  const [renamePending, setRenamePending] = useState(false);

  // Role change
  const [roleChangePending, setRoleChangePending] = useState<string | null>(null);

  // Transfer ownership
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferError, setTransferError] = useState("");
  const [transferPending, setTransferPending] = useState(false);

  // Leave team
  const [showLeave, setShowLeave] = useState(false);
  const [leavePending, setLeavePending] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  // Delete team
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Confirm dialogs for destructive member/invitation actions
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [cancelInvTarget, setCancelInvTarget] = useState<string | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  const isOwner = myRole === "owner";
  const isManager = myRole === "owner" || myRole === "admin";

  // Detect unsaved changes (rename form open + value differs from saved name)
  const isDirty = isRenaming && renameValue.trim() !== teamName;

  void ownerId;

  function handleBack() {
    if (isDirty) {
      const confirmed = window.confirm(
        "변경사항을 저장하지 않고 나갈까요?\n저장하지 않은 내용은 사라져요.",
      );
      if (!confirmed) return;
    }
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace("/projects");
    }
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === teamName) { setIsRenaming(false); return; }
    setRenamePending(true); setRenameError("");
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setRenameError(data.error ?? "이름을 바꾸지 못했어요."); return; }
      setTeamName(trimmed); setIsRenaming(false);
    } catch { setRenameError("네트워크 연결을 확인해요."); }
    finally { setRenamePending(false); }
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (invitePending) return;
    setInviteError(""); setInviteLink(""); setInvitePending(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/invitations`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: inviteUsername.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error ?? "초대를 보내지 못했어요."); return; }
      const token: string = data.invitation?.token ?? "";
      const link = `${window.location.origin}/invitations/${token}`;
      setInviteLink(link); setInviteUsername("");
      setInvitations((prev) => [...prev, {
        id: data.invitation.id ?? "",
        email: data.invitation.email ?? "",
        username: data.invitation.username ?? (inviteUsername.trim() || null),
        role: inviteRole, token, expiresAt: data.invitation.expiresAt ?? "",
      }]);
    } catch { setInviteError("네트워크 연결을 확인해요."); }
    finally { setInvitePending(false); }
  }

  async function handleRemove(userId: string) {
    const res = await fetch(`/api/teams/${teamId}/members/${userId}`, { method: "DELETE" });
    if (res.ok) { setMembers((prev) => prev.filter((m) => m.userId !== userId)); }
    setRemoveTarget(null);
  }

  async function handleRoleChange(userId: string, newRole: "admin" | "member") {
    setRoleChangePending(userId);
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role: newRole } : m));
      }
    } finally { setRoleChangePending(null); }
  }

  async function handleCancelInvitation(invitationId: string) {
    const res = await fetch(`/api/teams/${teamId}/invitations/${invitationId}`, { method: "DELETE" });
    if (res.ok) setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    setCancelInvTarget(null);
  }

  function requestTransfer(event: FormEvent) {
    event.preventDefault();
    if (!transferTo.trim()) return;
    const target = members.find((m) =>
      m.username === transferTo.trim() || m.userId === transferTo.trim()
    );
    if (!target) { setTransferError("현재 팀 멤버의 아이디를 입력해요."); return; }
    setConfirmTransfer(true);
  }

  async function handleTransfer() {
    const target = members.find((m) =>
      m.username === transferTo.trim() || m.userId === transferTo.trim()
    );
    if (!target) return;
    setConfirmTransfer(false);
    setTransferPending(true); setTransferError("");
    try {
      const res = await fetch(`/api/teams/${teamId}/transfer-ownership`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ toUserId: target.userId }),
      });
      const data = await res.json();
      if (!res.ok) { setTransferError(data.error ?? "소유권을 이전하지 못했어요."); return; }
      setShowTransfer(false); router.refresh();
    } catch { setTransferError("네트워크 연결을 확인해요."); }
    finally { setTransferPending(false); }
  }

  async function handleLeave() {
    setLeavePending(true); setLeaveError("");
    try {
      const res = await fetch(`/api/teams/${teamId}/leave`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setLeaveError(data.error ?? "팀을 나가지 못했어요."); return; }
      router.push("/projects");
    } catch { setLeaveError("네트워크 연결을 확인해요."); }
    finally { setLeavePending(false); }
  }

  async function handleDelete() {
    if (deleteConfirm !== teamName) return;
    setDeletePending(true); setDeleteError("");
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error ?? "팀을 삭제하지 못했어요."); return; }
      router.push("/projects");
    } catch { setDeleteError("네트워크 연결을 확인해요."); }
    finally { setDeletePending(false); }
  }

  const roleLabel: Record<TeamRole, string> = { owner: "소유자", admin: "관리자", member: "멤버" };

  return (
    <div className="team-settings">
      {/* Back navigation */}
      <div className="team-settings-back">
        <button
          type="button"
          className="button button-ghost button-sm"
          onClick={handleBack}
          aria-label="프로젝트 목록으로 돌아가기"
        >
          ← 뒤로
        </button>
      </div>

      {/* Team Name */}
      {isRenaming ? (
        <form className="rename-form" onSubmit={handleRename}>
          <input className="field rename-field" value={renameValue} autoFocus maxLength={100}
            onChange={(e) => setRenameValue(e.target.value)} disabled={renamePending} />
          <button className="button button-primary button-sm" type="submit" disabled={renamePending}>
            {renamePending ? "저장 중…" : "저장"}
          </button>
          <button className="button button-ghost button-sm" type="button"
            onClick={() => { setIsRenaming(false); setRenameValue(teamName); setRenameError(""); }}>
            취소
          </button>
          {renameError && <p className="form-error">{renameError}</p>}
        </form>
      ) : (
        <div className="team-title-row">
          <h1 className="team-settings-title">{teamName}</h1>
          {isManager && (
            <button className="button button-ghost button-sm"
              onClick={() => { setRenameValue(teamName); setIsRenaming(true); }}>
              이름 수정
            </button>
          )}
        </div>
      )}

      {/* Members */}
      <section className="team-section">
        <h2>멤버 ({members.length}명)</h2>
        <ul className="member-list">
          {members.map((m) => (
            <li key={m.id} className="member-item">
              <span className="member-email">{m.displayName || m.username}</span>
              {m.displayName && m.displayName !== m.username ? (
                <span className="member-role">@{m.username}</span>
              ) : null}
              {isOwner && m.role !== "owner" ? (
                <select
                  className="member-role-select"
                  value={m.role}
                  disabled={roleChangePending === m.userId}
                  onChange={(e) => handleRoleChange(m.userId, e.target.value as "admin" | "member")}
                >
                  <option value="admin">관리자</option>
                  <option value="member">멤버</option>
                </select>
              ) : (
                <span className={`member-role member-role--${m.role}`}>{roleLabel[m.role]}</span>
              )}
              {isManager && m.userId !== myUserId && m.role !== "owner" && (
                <button className="button button-ghost button-sm" onClick={() => setRemoveTarget(m.userId)}>
                  제거
                </button>
              )}
              {isOwner && m.role !== "owner" && (
                <button className="button button-ghost button-sm"
                  onClick={() => { setTransferTo(m.username); setShowTransfer(true); }}>
                  소유권 이전
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Invite */}
      {isManager && (
        <section className="team-section">
          <h2>팀원 초대</h2>
          <form className="invite-form" onSubmit={handleInvite}>
            <input className="field" placeholder="아이디를 몰라도 비워두고 링크 생성"
              value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)}
              disabled={invitePending} />
            <select className="field invite-role-select" value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
              disabled={invitePending}>
              <option value="member">멤버</option>
              <option value="admin">관리자</option>
            </select>
            <button className="button button-primary" type="submit" disabled={invitePending}>
              {invitePending ? "초대 중…" : "초대 링크 생성"}
            </button>
          </form>
          {inviteError && <p className="form-error">{inviteError}</p>}
          {inviteLink && (
            <div className="invite-link-box">
              <p>초대 링크가 생성됐어요. 복사해서 전달해요.</p>
              <div className="invite-link-row">
                <input className="field" readOnly value={inviteLink}
                  onClick={(e) => (e.target as HTMLInputElement).select()} />
                <button className="button" type="button"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}>복사</button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <section className="team-section">
          <h2>대기 중인 초대 ({invitations.length})</h2>
          <ul className="member-list">
            {invitations.map((inv) => (
              <li key={inv.id} className="member-item">
                <span className="member-email">{inv.username ?? "초대 링크"}</span>
                <span className="member-role member-role--pending">대기 중</span>
                <span className={`member-role member-role--${inv.role}`}>{roleLabel[inv.role]}</span>
                {isManager && (
                  <button className="button button-ghost button-sm"
                    onClick={() => setCancelInvTarget(inv.id)}>취소</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Transfer Ownership Modal */}
      {showTransfer && isOwner && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h2>소유권 이전</h2>
            <p>소유권을 이전할 멤버의 아이디를 입력해요.</p>
            <form onSubmit={requestTransfer} style={{ marginTop: 16 }}>
              <input className="field" list="member-usernames" value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)} placeholder="아이디 입력" required />
              <datalist id="member-usernames">
                {members.filter((m) => m.role !== "owner").map((m) => (
                  <option key={m.userId} value={m.username} />
                ))}
              </datalist>
              {transferError && <p className="form-error">{transferError}</p>}
              <div className="form-actions" style={{ marginTop: 16 }}>
                <button className="button button-ghost" type="button"
                  onClick={() => { setShowTransfer(false); setTransferTo(""); setTransferError(""); }}>
                  취소
                </button>
                <button className="button button-danger" type="submit" disabled={transferPending}>
                  {transferPending ? "이전 중…" : "소유권 이전"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <section className="team-section team-section--danger">
        <h2>위험 영역</h2>

        {/* Leave Team (non-owner) */}
        {!isOwner && (
          <div className="danger-action">
            <div>
              <strong>팀 나가기</strong>
              <p>팀을 나가면 이 팀의 프로젝트에 접근할 수 없어요.</p>
            </div>
            <button className="button button-danger-outline" onClick={() => setShowLeave(true)}>
              팀 나가기
            </button>
          </div>
        )}

        {/* Owner: must transfer first */}
        {isOwner && (
          <div className="danger-action">
            <div>
              <strong>팀 나가기</strong>
              <p>소유자는 먼저 소유권을 이전해야 팀을 나갈 수 있어요.</p>
            </div>
            <button className="button button-ghost button-sm" onClick={() => setShowTransfer(true)}>
              소유권 이전하기
            </button>
          </div>
        )}

        {/* Delete Team (owner only) */}
        {isOwner && (
          <div className="danger-action">
            <div>
              <strong>팀 삭제</strong>
              <p>팀에 속한 멤버 정보와 초대가 함께 삭제돼요. 프로젝트는 개인 프로젝트로 유지됩니다.</p>
            </div>
            <button className="button button-danger-outline" onClick={() => setShowDelete(true)}>
              팀 삭제
            </button>
          </div>
        )}
      </section>

      {/* Leave Confirm Dialog */}
      {showLeave && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h2>이 팀에서 나갈까요?</h2>
            <p>나간 후에는 이 팀의 프로젝트에 접근할 수 없어요.</p>
            {leaveError && <p className="form-error">{leaveError}</p>}
            <div className="form-actions" style={{ marginTop: 24 }}>
              <button className="button button-ghost" onClick={() => { setShowLeave(false); setLeaveError(""); }}>
                취소
              </button>
              <button className="button button-danger" onClick={handleLeave} disabled={leavePending}>
                {leavePending ? "나가는 중…" : "팀 나가기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove member confirm */}
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="이 멤버를 팀에서 제거할까요?"
        confirmLabel="제거"
        cancelLabel="취소"
        danger
        onConfirm={() => { if (removeTarget) handleRemove(removeTarget); }}
        onCancel={() => setRemoveTarget(null)}
      />

      {/* Cancel invitation confirm */}
      <ConfirmDialog
        open={Boolean(cancelInvTarget)}
        title="이 초대를 취소할까요?"
        confirmLabel="취소하기"
        cancelLabel="돌아가기"
        danger
        onConfirm={() => { if (cancelInvTarget) handleCancelInvitation(cancelInvTarget); }}
        onCancel={() => setCancelInvTarget(null)}
      />

      {/* Transfer ownership confirm */}
      <ConfirmDialog
        open={confirmTransfer}
        title="소유권을 이전할까요?"
        description="이전 후에는 되돌리기 어려워요."
        confirmLabel="소유권 이전"
        cancelLabel="취소"
        danger
        loading={transferPending}
        onConfirm={handleTransfer}
        onCancel={() => setConfirmTransfer(false)}
      />

      {/* Delete Confirm Dialog */}
      {showDelete && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h2>팀을 삭제할까요?</h2>
            <p>
              팀에 속한 멤버 정보와 초대가 함께 삭제돼요.
              팀 프로젝트는 각 소유자의 개인 프로젝트로 유지됩니다.
              <strong> 이 작업은 되돌릴 수 없어요.</strong>
            </p>
            <p style={{ marginTop: 16 }}>
              계속하려면 팀 이름 <strong>&ldquo;{teamName}&rdquo;</strong>을 입력해요.
            </p>
            <input className="field" style={{ marginTop: 8 }} value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={teamName} />
            {deleteError && <p className="form-error">{deleteError}</p>}
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="button button-ghost"
                onClick={() => { setShowDelete(false); setDeleteConfirm(""); setDeleteError(""); }}>
                취소
              </button>
              <button className="button button-danger"
                disabled={deleteConfirm !== teamName || deletePending}
                onClick={handleDelete}>
                {deletePending ? "삭제 중…" : "팀 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
