"use client";

import { useState } from "react";
import { FileText, TextAlignLeft, Trash } from "@phosphor-icons/react";

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
}: {
  projectId: string;
  initialSources: Source[];
  onSourceDelete?: () => void;
}) {
  const [sources, setSources] = useState(initialSources);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`"${name}" 원문을 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return;
    setDeleting(id);
    await fetch(`/api/projects/${projectId}/sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
    onSourceDelete?.();
  }

  if (!sources.length) {
    return (
      <div className="source-viewer">
        <h2>원문</h2>
        <p className="source-empty">올려진 원문이 없어요. 프로젝트를 만들 때 추가한 원문이 여기에 표시돼요.</p>
      </div>
    );
  }

  return (
    <div className="source-viewer">
      <h2>원문</h2>
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
    </div>
  );
}
