"use client";

import { useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import type { Screen, UxCopy } from "@/lib/spec/schema";

export function ScreenDetail({
  screen,
  editing,
  onChange,
  uxCopy,
  onUxCopyChange,
}: {
  screen: Screen;
  editing: boolean;
  onChange: (screen: Screen) => void;
  uxCopy?: UxCopy[];
  onUxCopyChange?: (items: UxCopy[]) => void;
}) {
  const [newCopyText, setNewCopyText] = useState("");
  const [newCopyContext, setNewCopyContext] = useState("");
  const [newCopyTone, setNewCopyTone] = useState("");

  const rows = [
    ["진입 조건", screen.entryConditions],
    ["주요 행동", screen.primaryActions],
    ["필요한 데이터", screen.requiredData],
    ["CTA", [screen.cta]],
    ["QA 기준", screen.qaCriteria],
  ] as const;

  function handleAddCopy() {
    if (!newCopyText.trim() || !onUxCopyChange || !uxCopy) return;
    const item: UxCopy = {
      id: crypto.randomUUID(),
      screenId: screen.id,
      context: newCopyContext.trim() || "일반",
      text: newCopyText.trim(),
      toneRule: newCopyTone.trim(),
      evidence: {
        type: "assumption",
        reviewStatus: "needs-review",
        sourceId: "user-input",
        sourceExcerpt: newCopyText.trim().slice(0, 80),
        rationale: null,
      },
    };
    onUxCopyChange([...uxCopy, item]);
    setNewCopyText("");
    setNewCopyContext("");
    setNewCopyTone("");
  }

  function handleDeleteCopy(id: string) {
    if (!uxCopy || !onUxCopyChange) return;
    onUxCopyChange(uxCopy.filter((c) => c.id !== id));
  }

  function handleCopyChange(id: string, field: "context" | "text" | "toneRule", value: string) {
    if (!uxCopy || !onUxCopyChange) return;
    onUxCopyChange(uxCopy.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  return (
    <div>
      <div className="detail-table">
        {rows.map(([label, values]) => (
          <div className="detail-row" key={label}>
            <div className="detail-label">{label}</div>
            <div className="detail-value">
              {editing ? (
                <textarea
                  className="field"
                  aria-label={label}
                  value={values.join("\n")}
                  onChange={(event) => {
                    const next = event.target.value.split("\n").filter(Boolean);
                    if (label === "CTA") onChange({ ...screen, cta: next[0] ?? "" });
                    else if (label === "진입 조건")
                      onChange({ ...screen, entryConditions: next });
                    else if (label === "주요 행동")
                      onChange({ ...screen, primaryActions: next });
                    else if (label === "필요한 데이터")
                      onChange({ ...screen, requiredData: next });
                    else onChange({ ...screen, qaCriteria: next });
                  }}
                />
              ) : (
                <ul>
                  {values.map((value, i) => (
                    <li key={i}>{value}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {uxCopy !== undefined && (
        <div className="copy-section">
          <h3 className="copy-section-title">화면 문구</h3>
          {uxCopy.length === 0 ? (
            <p className="copy-empty">이 화면에 등록된 문구가 없어요.</p>
          ) : (
            <div className="copy-list">
              {uxCopy.map((item) => (
                <div className="copy-item" key={item.id}>
                  {editing ? (
                    <>
                      <input
                        className="field copy-context-field"
                        placeholder="맥락 (예: 버튼, 오류 메시지)"
                        value={item.context}
                        onChange={(e) => handleCopyChange(item.id, "context", e.target.value)}
                      />
                      <textarea
                        className="field copy-text-field"
                        placeholder="문구 내용"
                        value={item.text}
                        onChange={(e) => handleCopyChange(item.id, "text", e.target.value)}
                      />
                      <input
                        className="field copy-tone-field"
                        placeholder="톤 규칙 (예: 친근하고 간결하게)"
                        value={item.toneRule}
                        onChange={(e) => handleCopyChange(item.id, "toneRule", e.target.value)}
                      />
                      <button
                        className="copy-delete-btn"
                        aria-label="문구 삭제"
                        onClick={() => handleDeleteCopy(item.id)}
                      >
                        <Trash size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="copy-context-tag">{item.context}</span>
                      <span className="copy-text">{item.text}</span>
                      {item.toneRule && (
                        <span className="copy-tone-tag">{item.toneRule}</span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {editing && onUxCopyChange && (
            <div className="copy-add-row">
              <input
                className="field copy-context-field"
                placeholder="맥락"
                value={newCopyContext}
                onChange={(e) => setNewCopyContext(e.target.value)}
              />
              <input
                className="field copy-text-field"
                placeholder="새 문구 추가…"
                value={newCopyText}
                onChange={(e) => setNewCopyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCopy()}
              />
              <input
                className="field copy-tone-field"
                placeholder="톤 규칙"
                value={newCopyTone}
                onChange={(e) => setNewCopyTone(e.target.value)}
              />
              <button className="button" onClick={handleAddCopy} disabled={!newCopyText.trim()}>
                <Plus size={14} />
                추가
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
