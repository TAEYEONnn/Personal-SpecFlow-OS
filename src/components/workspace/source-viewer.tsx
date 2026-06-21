"use client";

import { useRef, useState } from "react";
import { ClipboardText, FileText, Plus, TextAlignLeft, Trash } from "@phosphor-icons/react";

type Source = {
  id: string;
  name: string;
  type: "paste" | "txt" | "md" | "pdf";
  content: string;
  createdAt: string;
};

const typeLabel: Record<Source["type"], string> = {
  paste: "직접 입력",
  txt: "TXT",
  md: "Markdown",
  pdf: "PDF",
};

export function SourceViewer({
  projectId,
  initialSources,
  onSourceDelete,
  onSourceAdd,
}: {
  projectId: string;
  initialSources: Source[];
  onSourceDelete?: () => void;
  onSourceAdd?: () => void;
}) {
  const [sources, setSources] = useState(initialSources);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"paste" | "file" | null>(null);
  const [addText, setAddText] = useState("");
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`"${name}" 원문을 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return;
    setDeleting(id);
    await fetch(`/api/projects/${projectId}/sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
    onSourceDelete?.();
  }

  async function handleAddPaste() {
    if (!addText.trim()) { setAddError("내용을 입력해 주세요."); return; }
    setAdding(true);
    setAddError("");
    const res = await fetch(`/api/projects/${projectId}/sources`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: addName.trim() || "직접 입력", type: "paste", content: addText }),
    });
    if (res.ok) {
      const data = await res.json();
      setSources((prev) => [...prev, data.source]);
      onSourceAdd?.();
      setAddMode(null);
      setAddText("");
      setAddName("");
    } else {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error ?? "추가하지 못했습니다.");
    }
    setAdding(false);
  }

  async function handleAddFile(file: File) {
    setAdding(true);
    setAddError("");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const type = (["txt", "md"].includes(ext) ? ext : "txt") as "txt" | "md";
    const content = await file.text().catch(() => "");
    const res = await fetch(`/api/projects/${projectId}/sources`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: file.name, type, content }),
    });
    if (res.ok) {
      const data = await res.json();
      setSources((prev) => [...prev, data.source]);
      onSourceAdd?.();
      setAddMode(null);
    } else {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error ?? "추가하지 못했습니다.");
    }
    setAdding(false);
  }

  function cancelAdd() {
    setAddMode(null);
    setAddText("");
    setAddName("");
    setAddError("");
  }

  return (
    <div className="source-viewer">
      <div className="source-header">
        <h2>원문</h2>
        <div className="source-add-actions">
          <button className="button" onClick={() => { setAddMode("paste"); setAddError(""); }}>
            <ClipboardText size={15} />
            텍스트 붙여넣기
          </button>
          <button
            className="button"
            onClick={() => {
              setAddMode("file");
              setAddError("");
              fileInputRef.current?.click();
            }}
          >
            <Plus size={15} />
            파일 추가
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAddFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {addMode === "paste" && (
        <div className="source-add-panel">
          <input
            className="field"
            placeholder="원문 이름 (선택)"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            maxLength={120}
          />
          <textarea
            className="source-add-textarea"
            placeholder="원문 내용을 붙여넣거나 직접 입력하세요."
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            autoFocus
          />
          {addError && <p className="source-add-error">{addError}</p>}
          <div className="source-add-footer">
            <button className="button" onClick={cancelAdd} disabled={adding}>취소</button>
            <button
              className="button button-primary"
              onClick={handleAddPaste}
              disabled={adding || !addText.trim()}
            >
              {adding ? "추가 중…" : "추가"}
            </button>
          </div>
        </div>
      )}

      {addMode === "file" && adding && (
        <div className="source-add-panel">
          <p className="source-add-status">파일을 업로드하는 중…</p>
        </div>
      )}

      {addError && addMode === "file" && !adding && (
        <p className="source-add-error">{addError}</p>
      )}

      {!sources.length ? (
        <p className="source-empty">올려진 원문이 없어요. 원문을 추가하면 AI가 다시 정리할 때 반영돼요.</p>
      ) : (
        <div className="source-list">
          {sources.map((source) => (
            <div className="source-item" key={source.id}>
              <div className="source-item-header">
                <FileText size={16} className="source-file-icon" />
                <div className="source-meta">
                  <span className="source-name">{source.name}</span>
                  <span className="source-type">{typeLabel[source.type]}</span>
                  <span className="source-date">
                    {new Date(source.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
                <div className="source-actions">
                  <button
                    className="button"
                    onClick={() => setExpanded(expanded === source.id ? null : source.id)}
                  >
                    <TextAlignLeft size={15} />
                    {expanded === source.id ? "접기" : "미리보기"}
                  </button>
                  <button
                    className="source-delete-button"
                    aria-label={`${source.name} 삭제`}
                    disabled={deleting === source.id}
                    onClick={() => handleDelete(source.id, source.name)}
                  >
                    <Trash size={15} />
                  </button>
                </div>
              </div>
              {expanded === source.id && (
                <textarea
                  className="source-preview"
                  value={source.type === "pdf" ? "[PDF — 텍스트 추출본]" : source.content}
                  readOnly
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
