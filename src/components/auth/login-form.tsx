"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ isDemo = false }: { isDemo?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [slowIndicator, setSlowIndicator] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setSlowIndicator(false);
    setPending(true);
    slowTimerRef.current = setTimeout(() => setSlowIndicator(true), 3000);

    const formData = new FormData(event.currentTarget);
    const payload = {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "로그인하지 못했어요.");
        return;
      }
      router.push("/projects");
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      setSlowIndicator(false);
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {isDemo && (
        <p className="login-mode-badge" role="status">데모 모드</p>
      )}
      <label className="field-label">
        아이디
        <input
          className="field"
          name="username"
          autoComplete="username"
          required
          placeholder="designer"
          disabled={pending}
        />
      </label>
      <label className="field-label">
        비밀번호
        <input
          className="field"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder=""
          disabled={pending}
        />
      </label>
      {error ? (
        <>
          <p className="form-error" role="alert">{error}</p>
          {!isDemo && (
            <p className="login-setup-hint">
              계정이 없다면 터미널에서 <code>pnpm admin:create-user</code>로 먼저 만들어 주세요.
            </p>
          )}
        </>
      ) : null}
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? (
          <>
            <span className="btn-spinner" aria-hidden="true" />
            로그인 중…
          </>
        ) : "로그인"}
      </button>
      <p
        className="login-slow-hint"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ visibility: slowIndicator ? "visible" : "hidden" }}
      >
        계정을 확인하고 있어요…
      </p>
    </form>
  );
}
