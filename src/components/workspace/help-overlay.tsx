"use client";

import { useEffect } from "react";

export function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="help-overlay-backdrop" onClick={onClose} role="presentation">
      <div
        className="help-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="도움말"
      >
        <h2 className="help-title">SpecFlow OS 사용 방법</h2>
        <div className="help-steps">
          <div className="help-step">
            <span className="help-step-num">1</span>
            <div>
              <strong>원문 업로드</strong>
              <p>회의록, 요청 메모, 기획 문서를 올려 주세요. TXT, Markdown, PDF를 지원해요.</p>
            </div>
          </div>
          <div className="help-step">
            <span className="help-step-num">2</span>
            <div>
              <strong>AI가 정리</strong>
              <p>화면, 요구사항, 확인 질문으로 나눠서 정리해요. 원문을 바꾼 뒤 다시 정리할 수도 있어요.</p>
            </div>
          </div>
          <div className="help-step">
            <span className="help-step-num">3</span>
            <div>
              <strong>검토하고 공유</strong>
              <p>질문과 작업 상태를 확인한 뒤 Notion이나 Markdown으로 내보내세요.</p>
            </div>
          </div>
        </div>
        <div className="help-nav-guide">
          <strong>좌측 탭 안내</strong>
          <ul>
            <li><strong>개요·요구사항</strong> — 프로젝트 목적과 필요한 기능</li>
            <li><strong>확인 질문·결정 기록</strong> — 더 확인할 내용과 확정된 내용</li>
            <li><strong>화면 흐름</strong> — 화면 연결과 선택한 화면의 상세</li>
            <li><strong>상태·예외·역할·권한</strong> — 화면 상태와 역할별 가능 범위</li>
            <li><strong>작업 목록</strong> — 해야 할 일과 휴지통</li>
            <li><strong>참고</strong> — 원문, 변경 영향, 활동 기록</li>
          </ul>
        </div>
        <div className="help-shortcuts">
          <strong>키보드 단축키</strong>
          <div className="help-shortcut-row"><kbd>?</kbd><span>이 화면 열기</span></div>
          <div className="help-shortcut-row"><kbd>⌘S</kbd><span>문서 저장</span></div>
        </div>
        <button className="button button-primary" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
