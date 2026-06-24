"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ProfileForm({ initialDisplayName, email }: { initialDisplayName: string; email: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [nameError, setNameError] = useState("");
  const [namePending, setNamePending] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwPending, setPwPending] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handleNameSave(event: FormEvent) {
    event.preventDefault();
    setNameError("");
    setNameSuccess(false);
    setNamePending(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setNameError(data.error ?? "저장하지 못했어요."); return; }
      setNameSuccess(true);
      router.refresh();
    } catch {
      setNameError("네트워크 연결을 확인해 주세요.");
    } finally {
      setNamePending(false);
    }
  }

  async function handlePasswordChange(event: FormEvent) {
    event.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (newPassword !== confirmPassword) { setPwError("새 비밀번호가 일치하지 않아요."); return; }
    if (newPassword.length < 8) { setPwError("새 비밀번호는 8자 이상이어야 해요."); return; }
    setPwPending(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error ?? "비밀번호를 바꾸지 못했어요."); return; }
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwError("네트워크 연결을 확인해 주세요.");
    } finally {
      setPwPending(false);
    }
  }

  return (
    <div className="profile-sections">
      <section className="profile-section">
        <h2>기본 정보</h2>
        <form onSubmit={handleNameSave}>
          <label className="field-label">
            이메일
            <input className="field" value={email} disabled readOnly />
          </label>
          <label className="field-label">
            표시 이름
            <input
              className="field"
              value={displayName}
              maxLength={50}
              onChange={(e) => { setDisplayName(e.target.value); setNameSuccess(false); }}
              disabled={namePending}
              placeholder="이름을 입력해 주세요"
            />
          </label>
          {nameError && <p className="form-error">{nameError}</p>}
          {nameSuccess && <p className="form-success">저장됐어요.</p>}
          <button className="button button-primary" type="submit" disabled={namePending}>
            {namePending ? "저장 중…" : "저장"}
          </button>
        </form>
      </section>

      <section className="profile-section">
        <h2>비밀번호 변경</h2>
        <form onSubmit={handlePasswordChange}>
          <label className="field-label">
            현재 비밀번호
            <input
              className="field"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={pwPending}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="field-label">
            새 비밀번호
            <input
              className="field"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwSuccess(false); }}
              disabled={pwPending}
              autoComplete="new-password"
              placeholder="8자 이상"
              required
            />
          </label>
          <label className="field-label">
            새 비밀번호 확인
            <input
              className="field"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={pwPending}
              autoComplete="new-password"
              required
            />
          </label>
          {pwError && <p className="form-error">{pwError}</p>}
          {pwSuccess && <p className="form-success">비밀번호가 변경됐어요.</p>}
          <button className="button button-primary" type="submit" disabled={pwPending}>
            {pwPending ? "변경 중…" : "비밀번호 변경"}
          </button>
        </form>
      </section>
    </div>
  );
}
