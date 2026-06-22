import type { DemoRun } from "@/lib/projects/demo-store";
import { formatKoreanDateTime } from "@/lib/format-date";

const statusLabel: Record<DemoRun["status"], string> = {
  queued: "대기",
  running: "실행 중",
  completed: "완료",
  failed: "실패",
};

const statusClass: Record<DemoRun["status"], string> = {
  queued: "run-status--queued",
  running: "run-status--running",
  completed: "run-status--completed",
  failed: "run-status--failed",
};

export function RunsView({ runs }: { runs: DemoRun[] }) {
  if (!runs.length) {
    return (
      <div className="runs-view">
        <h2>활동 기록</h2>
        <p className="runs-empty">아직 정리 기록이 없어요.</p>
      </div>
    );
  }

  return (
    <div className="runs-view">
      <h2>활동 기록</h2>
      <table className="matrix-table" aria-label="활동 기록">
        <thead>
          <tr>
            <th>상태</th>
            <th>모델</th>
            <th>프롬프트 버전</th>
            <th>처리 시간</th>
            <th>오류 유형</th>
            <th>실행 시각</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>
                <span className={`run-status ${statusClass[run.status]}`}>
                  {statusLabel[run.status]}
                </span>
              </td>
              <td className="run-model">{run.model}</td>
              <td className="run-version">{run.promptVersion}</td>
              <td>
                {run.durationMs != null
                  ? `${(run.durationMs / 1000).toFixed(1)}s`
                  : "—"}
              </td>
              <td>{run.errorCode ?? "—"}</td>
              <td className="run-time">
                {formatKoreanDateTime(run.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
