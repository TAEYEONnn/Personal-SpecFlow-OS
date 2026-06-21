"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { FileText, Sparkle } from "@phosphor-icons/react";

export function NewProjectForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("리디자인 프로젝트 (MVP)");
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<number | undefined>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    setContent(await file.text());
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const projectData = await projectResponse.json();
      if (!projectResponse.ok) throw new Error(projectData.error);
      const projectId = projectData.project.id;
      const extension = fileName.toLowerCase().endsWith(".md") ? "md" : "txt";
      const sourceResponse = await fetch(`/api/projects/${projectId}/sources`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fileName || "직접 입력",
          type: fileName ? extension : "paste",
          content,
          fileSize,
        }),
      });
      const sourceData = await sourceResponse.json();
      if (!sourceResponse.ok) throw new Error(sourceData.error);
      const compileResponse = await fetch(`/api/projects/${projectId}/compile`, {
        method: "POST",
      });
      const compileData = await compileResponse.json();
      if (!compileResponse.ok) throw new Error(compileData.error);
      router.push(`/projects/${projectId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "프로젝트를 만들지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="source-form" onSubmit={handleSubmit}>
      <label className="field-label">
        프로젝트 이름
        <input className="field" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field-label">
        업무 원문
        <textarea
          className="field source-textarea"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="회의록, 요청 메시지, 기획서 텍스트를 붙여 넣으세요."
          required
        />
      </label>
      <div className="file-row">
        <button className="button" type="button" onClick={() => fileRef.current?.click()}>
          <FileText size={18} />
          TXT/MD 불러오기
        </button>
        <span>{fileName || "최대 1MB · 100,000자"}</span>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          onChange={handleFile}
        />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        <Link className="button button-ghost" href="/projects">취소</Link>
        <button className="button button-primary" disabled={pending || !content.trim()}>
          <Sparkle size={18} weight="fill" />
          {pending ? "업무 컴파일 중…" : "프로젝트 만들고 컴파일"}
        </button>
      </div>
    </form>
  );
}
