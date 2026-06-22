"use client";

import { useRef, useState } from "react";
import { ClipboardText, FileText, PencilSimple, Plus, TextAlignLeft, Trash } from "@phosphor-icons/react";
import { formatKoreanDateTime } from "@/lib/format-date";

export type ProjectSource = {
  id: string;
  name: string;
  type: "paste" | "txt" | "md" | "pdf";
  content: string;
  createdAt: string;
  updatedAt?: string;
};

const typeLabel: Record<ProjectSource["type"], string> = {
  paste: "직접 입력",
  txt: "TXT",
  md: "Markdown",
  pdf: "PDF",
};

export function SourceViewer({
  projectId,
  sources,
  onSourcesChange,
  onSourceChange,
  onBusyChange,
}: {
  projectId: string;
  sources: ProjectSource[];
  onSourcesChange: (sources: ProjectSource[]) => void;
  onSourceChange?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveDone, setSaveDone] = useState(false);
  const saveDoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [addMode, setAddMode] = useState<"paste" | "file" | null>(null);
  const [addText, setAddText] = useState("");
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`"${name}" 원문을 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return;
    setDeleting(id);
    onBusyChange?.(true);
    setSaveError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/sources/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "원문을 삭제하지 못했어요.");
      }
      onSourcesChange(sources.filter((source) => source.id !== id));
      onSourceChange?.();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "원문을 삭제하지 못했어요.",
      );
    } finally {
      setDeleting(null);
      onBusyChange?.(false);
    }
  }

  function startEdit(source: ProjectSource) {
    setEditingId(source.id);
    setEditName(source.name);
    setEditContent(source.content);
    setExpanded(source.id);
    setSaveError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setSaveError("");
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    onBusyChange?.(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/sources/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), content: editContent }),
      });
      if (res.ok) {
        const data = await res.json();
        onSourcesChange(
          sources.map((source) =>
            source.id === id ? { ...source, ...data.source } : source,
          ),
        );
        setEditingId(null);
        onSourceChange?.();
        setSaveDone(true);
        if (saveDoneTimerRef.current) clearTimeout(saveDoneTimerRef.current);
        saveDoneTimerRef.current = setTimeout(() => setSaveDone(false), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? "저장하지 못했어요.");
      }
    } catch {
      setSaveError("저장하지 못했어요.");
    } finally {
      setSaving(false);
      onBusyChange?.(false);
    }
  }

  async function handleAddPaste() {
    if (!addText.trim()) { setAddError("내용을 입력해 주세요."); return; }
    setAdding(true);
    onBusyChange?.(true);
    setAddError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/sources`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: addName.trim() || "직접 입력", type: "paste", content: addText }),
      });
      if (res.ok) {
        const data = await res.json();
        onSourcesChange([...sources, data.source]);
        onSourceChange?.();
        setAddMode(null);
        setAddText("");
        setAddName("");
      } else {
        const data = await res.json().catch(() => ({}));
        setAddError(data.error ?? "추가하지 못했어요.");
      }
    } catch {
      setAddError("추가하지 못했어요.");
    } finally {
      setAdding(false);
      onBusyChange?.(false);
    }
  }

  async function handleAddFile(file: File) {
    setAdding(true);
    onBusyChange?.(true);
    setAddError("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const type = (["txt", "md", "pdf"].includes(ext) ? ext : "txt") as
        | "txt"
        | "md"
        | "pdf";
      const isPdf = type === "pdf";
      const content = isPdf
        ? btoa(
            Array.from(new Uint8Array(await file.arrayBuffer()))
              .map((byte) => String.fromCharCode(byte))
              .join(""),
          )
        : await file.text().catch(() => "");
      const res = await fetch(`/api/projects/${projectId}/sources`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          type,
          content,
          fileSize: file.size,
          isPdfBase64: isPdf,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onSourcesChange([...sources, data.source]);
        onSourceChange?.();
        setAddMode(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setAddError(data.error ?? "추가하지 못했어요.");
      }
    } catch {
      setAddError("추가하지 못했어요.");
    } finally {
      setAdding(false);
      onBusyChange?.(false);
    }
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
            accept=".txt,.md,.pdf"
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
      {saveError && !editingId && (
        <p className="source-add-error" role="alert">{saveError}</p>
      )}

      {saveDone && (
        <p className="source-save-done" role="status" aria-live="polite">저장했어요.</p>
      )}
      {!sources.length ? (
        <p className="source-empty">아직 원문을 추가하지 않았어요. 원문을 추가하면 AI가 다시 정리할 때 반영돼요.</p>
      ) : (
        <div className="source-list">
          {sources.map((source) => (
            <div className={`source-item${editingId === source.id ? " source-item--editing" : ""}`} key={source.id}>
              <div className="source-item-header">
                <FileText size={16} className="source-file-icon" />
                {editingId === source.id ? (
                  <input
                    className="field source-name-edit"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={200}
                    autoFocus
                  />
                ) : (
                  <div className="source-meta">
                    <span className="source-name">{source.name}</span>
                    <span className="source-type">{typeLabel[source.type]}</span>
                    <span className="source-date">
                      {source.updatedAt && source.updatedAt !== source.createdAt
                        ? `수정됨 · ${formatKoreanDateTime(source.updatedAt)}`
                        : formatKoreanDateTime(source.createdAt)}
                    </span>
                  </div>
                )}
                <div className="source-actions">
                  {editingId === source.id ? (
                    <>
                      {saveError && <span className="source-save-error">{saveError}</span>}
                      <button
                        className="button"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        취소
                      </button>
                      <button
                        className="button button-primary"
                        onClick={() => handleSaveEdit(source.id)}
                        disabled={saving || !editName.trim()}
                      >
                        {saving ? "저장 중…" : "저장"}
                      </button>
                    </>
                  ) : (
                    <>
                      {source.type !== "pdf" && (
                        <button className="button" onClick={() => startEdit(source)}>
                          <PencilSimple size={15} />
                          편집
                        </button>
                      )}
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
                    </>
                  )}
                </div>
              </div>
              {(expanded === source.id || editingId === source.id) && (
                editingId === source.id ? (
                  <textarea
                    className="source-preview source-preview--edit"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                ) : (
                  <textarea
                    className="source-preview"
                    value={source.type === "pdf" ? "[PDF — 텍스트 추출본]" : source.content}
                    readOnly
                  />
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
