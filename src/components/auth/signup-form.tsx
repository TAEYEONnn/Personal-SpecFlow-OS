"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignupForm({ next }: { next?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json") ? await res.json() : null;
      if (!res.ok) {
        setError(data?.error ?? "계정을 만들지 못했어요.");
        return;
      }
      const redirectTo = next && next.startsWith("/") ? next : "/projects";
      const invitationToken = redirectTo.match(/^\/invitations\/([^/?#]+)/)?.[1];
      if (invitationToken) {
        const acceptRes = await fetch(`/api/invitations/${invitationToken}/accept`, {
          method: "POST",
          credentials: "include",
        });
        if (acceptRes.ok) {
          const acceptData = await acceptRes.json();
          router.push(acceptData?.teamId ? `/teams/${acceptData.teamId}` : "/projects");
          return;
        }
      }
      router.push(redirectTo);
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <label className="field-label">
        아이디
        <input
          className="field"
          name="username"
          autoComplete="username"
          required
          placeholder="아이디 입력"
          disabled={pending}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label className="field-label">
        비밀번호
        <input
          className="field"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="8자 이상"
          disabled={pending}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="field-label">
        비밀번호 확인
        <input
          className="field"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          disabled={pending}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? (
          <><span className="btn-spinner" aria-hidden="true" />가입 중…</>
        ) : "계정 만들기"}
      </button>
      <p style={{ textAlign: "center", marginTop: "12px", fontSize: "14px", color: "var(--fg-muted)" }}>
        이미 계정이 있나요?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} style={{ color: "var(--accent)" }}>로그인</Link>
      </p>
    </form>
  );
}
