"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending || !name.trim()) return;
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "팀을 만들지 못했어요."); return; }
      window.localStorage.setItem("specflow-active-team-id", data.team.id);
      router.push(`/teams/${data.team.id}`);
    } catch {
      setError("네트워크 연결을 확인해요.");
    } finally {
      setPending(false);
    }
  }

  function handleCancel() {
    if (name.trim()) {
      const confirmed = window.confirm(
        "팀 만들기를 중단할까요?\n입력한 내용은 저장되지 않아요.",
      );
      if (!confirmed) return;
    }
    router.push("/projects");
  }

  return (
    <form className="source-form" onSubmit={handleSubmit}>
      <label className="field-label">
        팀 이름
        <input
          className="field"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder="디자인팀, 개발팀 등"
          required
          disabled={pending}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="button button-ghost" type="button" onClick={handleCancel} disabled={pending}>
          취소
        </button>
        <button className="button button-primary" type="submit" disabled={pending || !name.trim()}>
          {pending ? "만드는 중…" : "팀 만들기"}
        </button>
      </div>
    </form>
  );
}
