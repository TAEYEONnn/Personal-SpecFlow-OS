"use client";

import { useEffect, useState } from "react";
import { diffDocuments, type DocumentDiff } from "@/lib/spec/impact";
import type { SpecDocument } from "@/lib/spec/schema";

function DiffBadge({ count, kind }: { count: number; kind: "added" | "removed" | "changed" }) {
  if (count === 0) return null;
  const label = kind === "added" ? `+${count}` : kind === "removed" ? `-${count}` : `~${count}`;
  return <span className={`diff-badge diff-badge--${kind}`}>{label}</span>;
}

function DiffSection({
  title,
  added,
  removed,
  changed,
  labels,
}: {
  title: string;
  added: string[];
  removed: string[];
  changed: string[];
  labels: Map<string, string>;
}) {
  const total = added.length + removed.length + changed.length;
  if (total === 0) return null;

  return (
    <section className="diff-section">
      <h3>
        {title}
        <DiffBadge count={added.length} kind="added" />
        <DiffBadge count={removed.length} kind="removed" />
        <DiffBadge count={changed.length} kind="changed" />
      </h3>
      <ul className="diff-list">
        {added.map((id) => (
          <li key={id} className="diff-item diff-item--added">
            <span className="diff-marker">+</span>
            {labels.get(id) ?? id}
          </li>
        ))}
        {removed.map((id) => (
          <li key={id} className="diff-item diff-item--removed">
            <span className="diff-marker">−</span>
            {labels.get(id) ?? id}
          </li>
        ))}
        {changed.map((id) => (
          <li key={id} className="diff-item diff-item--changed">
            <span className="diff-marker">~</span>
            {labels.get(id) ?? id}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DiffView({
  projectId,
  current,
  currentRevision,
}: {
  projectId: string;
  current: SpecDocument;
  currentRevision: number;
}) {
  const [compareRevision, setCompareRevision] = useState<number | null>(null);

  const [comparison, setComparison] = useState<{
    revision: number;
    document: SpecDocument | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (compareRevision === null) return;

    const controller = new AbortController();
    const revision = compareRevision;

    async function loadRevision() {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/revisions/${revision}`,
          {
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (controller.signal.aborted) return;

        if (!response.ok || data.error) {
          setComparison({
            revision,
            document: null,
            error: data.error ?? "이전 버전을 불러오지 못했어요.",
          });
          return;
        }

        setComparison({
          revision,
          document: data.document,
          error: null,
        });
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setComparison({
          revision,
          document: null,
          error: "이전 버전을 불러오지 못했어요.",
        });
      }
    }

    void loadRevision();

    return () => {
      controller.abort();
    };
  }, [projectId, compareRevision]);

  const isCurrentComparison =
    compareRevision !== null &&
    comparison?.revision === compareRevision;

  const loading =
    compareRevision !== null &&
    !isCurrentComparison;

  const error =
    isCurrentComparison
      ? comparison.error ?? ""
      : "";

  const prevDocument =
    isCurrentComparison
      ? comparison.document
      : null;

  const diff: DocumentDiff | null =
    prevDocument
      ? diffDocuments(prevDocument, current)
      : null;
  const screenLabels = new Map([
    ...current.screens.map((s) => [s.id, s.name] as [string, string]),
  ]);
  const reqLabels = new Map(
    current.requirements.map((r) => [r.id, r.content.slice(0, 60)] as [string, string]),
  );
  const stateLabels = new Map(
    current.states.map((s) => [s.id, s.name] as [string, string]),
  );
  const copyLabels = new Map(
    current.uxCopy.map((c) => [c.id, c.context] as [string, string]),
  );

  const hasDiff = diff && (
    diff.addedScreenIds.length +
    diff.removedScreenIds.length +
    diff.changedScreenIds.length +
    diff.addedRequirementIds.length +
    diff.removedRequirementIds.length +
    diff.changedRequirementIds.length +
    diff.addedStateIds.length +
    diff.removedStateIds.length +
    diff.addedCopyIds.length +
    diff.removedCopyIds.length +
    diff.taskStatusChanges.length
  ) > 0;

  return (
    <div className="diff-view">
      <div className="diff-header">
        <h2>변경 내역 비교</h2>
        <div className="diff-controls">
          <label className="field-label" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            비교할 버전
            <input
              className="field"
              type="number"
              min={1}
              max={currentRevision - 1}
              placeholder={`1 – ${currentRevision - 1}`}
              style={{ width: 100 }}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setCompareRevision(isNaN(v) ? null : v);
              }}
            />
          </label>
          <span className="diff-current-label">현재 버전: {currentRevision}</span>
        </div>
      </div>

      {!compareRevision && (
        <p className="diff-hint">이전 버전을 입력하면 달라진 항목을 볼 수 있어요.</p>
      )}

      {loading && <p className="diff-hint">버전 불러오는 중…</p>}
      {error && <p className="form-error">{error}</p>}

      {diff && !hasDiff && (
        <p className="diff-hint">두 버전 사이에 달라진 구조가 없어요.</p>
      )}

      {diff && hasDiff && (
        <div className="diff-body">
          <DiffSection
            title="화면"
            added={diff.addedScreenIds}
            removed={diff.removedScreenIds}
            changed={diff.changedScreenIds}
            labels={screenLabels}
          />
          <DiffSection
            title="요구사항"
            added={diff.addedRequirementIds}
            removed={diff.removedRequirementIds}
            changed={diff.changedRequirementIds}
            labels={reqLabels}
          />
          <DiffSection
            title="상태·예외"
            added={diff.addedStateIds}
            removed={diff.removedStateIds}
            changed={[]}
            labels={stateLabels}
          />
          <DiffSection
            title="UX 문구"
            added={diff.addedCopyIds}
            removed={diff.removedCopyIds}
            changed={[]}
            labels={copyLabels}
          />
          {diff.taskStatusChanges.length > 0 && (
            <section className="diff-section">
              <h3>작업 상태 변경</h3>
              <ul className="diff-list">
                {diff.taskStatusChanges.map((c) => {
                  const task = current.tasks.find((t) => t.id === c.id);
                  return (
                    <li key={c.id} className="diff-item diff-item--changed">
                      <span className="diff-marker">~</span>
                      {task?.title ?? c.id}{" "}
                      <span className="diff-status-change">
                        {c.from} → {c.to}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
