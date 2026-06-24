"use client";

import Link from "next/link";
import { useState } from "react";

type InvitationView = {
  id: string;
  token: string;
  email: string;
  status: "pending" | "accepted" | "rejected";
  role: "owner" | "admin" | "member";
  expiresAt: string;
  teamId: string;
  teamName: string;
};

export function InvitationAction({
  invitation,
  isLoggedIn,
  token,
}: {
  invitation: InvitationView;
  isLoggedIn: boolean;
  token: string;
}) {
  const [status, setStatus] = useState<"idle" | "accepting" | "rejecting" | "done-accept" | "done-reject">("idle");
  const [error, setError] = useState("");

  const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < new Date();

  if (invitation.status === "accepted") {
    return (
      <>
        <h2>이미 수락된 초대예요</h2>
        <p><strong>{invitation.teamName}</strong> 팀에 이미 참여하고 있어요.</p>
        <Link className="button button-primary" href="/projects" style={{ display: "block", marginTop: "16px", textAlign: "center" }}>
          프로젝트로 이동
        </Link>
      </>
    );
  }

  if (invitation.status === "rejected") {
    return (
      <>
        <h2>거절된 초대예요</h2>
        <p>이 초대는 이미 거절됐어요.</p>
      </>
    );
  }

  if (isExpired) {
    return (
      <>
        <h2>만료된 초대예요</h2>
        <p>초대 링크의 유효기간이 지났어요. 팀 관리자에게 다시 요청해 주세요.</p>
      </>
    );
  }

  if (status === "done-accept") {
    return (
      <>
        <h2>팀에 참여했어요!</h2>
        <p><strong>{invitation.teamName}</strong> 팀에 합류했어요.</p>
        <Link className="button button-primary" href="/projects" style={{ display: "block", marginTop: "16px", textAlign: "center" }}>
          프로젝트 보기
        </Link>
      </>
    );
  }

  if (status === "done-reject") {
    return (
      <>
        <h2>초대를 거절했어요</h2>
        <p>언제든지 팀 관리자에게 다시 초대를 요청할 수 있어요.</p>
      </>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <h2>{invitation.teamName} 팀 초대</h2>
        <p>
          <strong>{invitation.email}</strong>으로 초대가 왔어요.
          수락하려면 먼저 로그인해 주세요.
        </p>
        <Link
          className="button button-primary"
          href={`/login?next=/invitations/${token}`}
          style={{ display: "block", marginTop: "16px", textAlign: "center" }}
        >
          로그인하고 수락하기
        </Link>
        <Link
          className="button button-ghost"
          href={`/signup?next=/invitations/${token}`}
          style={{ display: "block", marginTop: "8px", textAlign: "center" }}
        >
          계정 만들고 수락하기
        </Link>
      </>
    );
  }

  async function handleAccept() {
    setError("");
    setStatus("accepting");
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "수락하지 못했어요."); setStatus("idle"); return; }
      setStatus("done-accept");
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
      setStatus("idle");
    }
  }

  async function handleReject() {
    setError("");
    setStatus("rejecting");
    try {
      const res = await fetch(`/api/invitations/${token}/reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "처리하지 못했어요."); setStatus("idle"); return; }
      setStatus("done-reject");
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
      setStatus("idle");
    }
  }

  return (
    <>
      <h2>{invitation.teamName} 팀 초대</h2>
      <p>
        <strong>{invitation.email}</strong>으로 초대가 왔어요.
        팀에 합류하시겠어요?
      </p>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions" style={{ marginTop: "20px" }}>
        <button
          className="button button-ghost"
          onClick={handleReject}
          disabled={status !== "idle"}
        >
          {status === "rejecting" ? "처리 중…" : "거절"}
        </button>
        <button
          className="button button-primary"
          onClick={handleAccept}
          disabled={status !== "idle"}
        >
          {status === "accepting" ? "참여 중…" : "팀에 참여하기"}
        </button>
      </div>
    </>
  );
}
