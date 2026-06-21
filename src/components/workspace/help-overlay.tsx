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
              <p>회의록, 요청 메모, 기획 문서를 올려주세요. 여러 파일을 올릴수록 정리 품질이 높아집니다.</p>
            </div>
          </div>
          <div className="help-step">
            <span className="help-step-num">2</span>
            <div>
              <strong>AI가 정리</strong>
              <p>화면 구조, 요구사항, 확인 질문으로 자동 정리됩니다. "다시 정리하기"로 언제든 재실행할 수 있어요.</p>
            </div>
          </div>
          <div className="help-step">
            <span className="help-step-num">3</span>
            <div>
              <strong>검토하고 공유</strong>
              <p>확인 질문을 해결하고 작업 상태를 업데이트하세요. Notion으로 내보내거나 Markdown으로 저장할 수 있어요.</p>
            </div>
          </div>
        </div>
        <div className="help-nav-guide">
          <strong>좌측 탭 안내</strong>
          <ul>
            <li><strong>브리프</strong> — 목적, 성공 조건 요약</li>
            <li><strong>확인 질문</strong> — AI가 원문에서 발견한 불확실한 사항</li>
            <li><strong>화면 목록</strong> — 화면 흐름도 + 선택한 화면 상세</li>
            <li><strong>역할과 권한 / 상태와 예외</strong> — 매트릭스 뷰</li>
            <li><strong>원문</strong> — 업로드한 원본 문서 확인 및 삭제</li>
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
