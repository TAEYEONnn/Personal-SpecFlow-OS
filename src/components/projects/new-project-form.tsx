"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { FileText, Sparkle, Warning } from "@phosphor-icons/react";
import { estimateCompilationCost, formatCostEstimate } from "@/lib/ai/cost-estimate";

function sourceType(fileName: string): "pdf" | "md" | "txt" {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".md")) return "md";
  return "txt";
}

export function NewProjectForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("리디자인 프로젝트 (MVP)");
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<number | undefined>();
  const [isPdf, setIsPdf] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "creating" | "uploading" | "compiling">("idle");

  const costEstimate = useMemo(
    () => (content.trim() ? estimateCompilationCost(content) : null),
    [content],
  );

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    const isPdfFile = file.name.toLowerCase().endsWith(".pdf");
    setIsPdf(isPdfFile);
    if (isPdfFile) {
      // PDF: send as base64 to server for extraction
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      setContent(btoa(binary));
    } else {
      setIsPdf(false);
      setContent(await file.text());
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStep("creating");
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
      setStep("uploading");
      const type = fileName ? sourceType(fileName) : "paste";
      const sourceResponse = await fetch(`/api/projects/${projectId}/sources`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fileName || "직접 입력",
          type,
          content,
          fileSize,
          isPdfBase64: isPdf,
        }),
      });
      const sourceData = await sourceResponse.json();
      if (!sourceResponse.ok) throw new Error(sourceData.error);
      setStep("compiling");
      const compileResponse = await fetch(`/api/projects/${projectId}/compile`, {
        method: "POST",
      });
      const compileData = await compileResponse.json();
      if (!compileResponse.ok) throw new Error(compileData.error);
      router.push(`/projects/${projectId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "프로젝트를 만들지 못했어요.");
    } finally {
      setStep("idle");
    }
  }

  return (
    <form className="source-form" onSubmit={handleSubmit}>
      <label className="field-label">
        프로젝트 이름
        <input className="field" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field-label">
        원문
        <textarea
          className="field source-textarea"
          value={isPdf ? "" : content}
          onChange={(event) => { setContent(event.target.value); setIsPdf(false); }}
          placeholder="회의록, 요청 메모, 기획 내용을 붙여 넣어도 괜찮아요."
          required={!isPdf}
          disabled={isPdf}
        />
      </label>
      {isPdf && (
        <p className="pdf-notice">PDF 파일이 선택됐습니다. 서버에서 텍스트를 추출합니다.</p>
      )}
      {costEstimate && !isPdf && (
        <p className={`cost-estimate${costEstimate.warningThreshold ? " cost-estimate--warn" : ""}`}>
          {costEstimate.warningThreshold && <Warning size={14} weight="fill" />}
          {formatCostEstimate(costEstimate)}
        </p>
      )}
      <div className="file-row">
        <button className="button" type="button" onClick={() => fileRef.current?.click()}>
          <FileText size={18} />
          TXT / MD / PDF 불러오기
        </button>
        <span>{fileName || "최대 10MB"}</span>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
          onChange={handleFile}
        />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        <Link className="button button-ghost" href="/projects">취소</Link>
        <button className="button button-primary" disabled={step !== "idle" || (!content.trim() && !isPdf)}>
          <Sparkle size={18} weight="fill" />
          {step === "creating" ? "프로젝트 생성 중…"
           : step === "uploading" ? "원문 업로드 중…"
           : step === "compiling" ? "AI가 정리 중이에요…"
           : "프로젝트 만들고 정리하기"}
        </button>
      </div>
    </form>
  );
}
