import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScreenDetail } from "@/components/workspace/screen-detail";
import { demoSpecDocument } from "@/lib/spec/demo-document";
import type { UxCopy } from "@/lib/spec/schema";

const demoScreen = demoSpecDocument.screens[0];

describe("ScreenDetail", () => {
  it("shows the selected screen specification", () => {
    render(
      <ScreenDetail
        screen={demoScreen}
        editing={false}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText("진입 조건")).toBeInTheDocument();
    expect(screen.getByText("주요 행동")).toBeInTheDocument();
    expect(screen.getByText("QA 기준")).toBeInTheDocument();
  });

  it("renders uxCopy section when uxCopy prop is provided", () => {
    render(
      <ScreenDetail
        screen={demoScreen}
        editing={false}
        onChange={() => undefined}
        uxCopy={[]}
        onUxCopyChange={() => undefined}
      />,
    );

    expect(screen.getByText("화면 문구")).toBeInTheDocument();
    expect(screen.getByText("이 화면에 등록된 문구가 없어요.")).toBeInTheDocument();
  });

  it("does not render uxCopy section when uxCopy prop is absent", () => {
    render(
      <ScreenDetail
        screen={demoScreen}
        editing={false}
        onChange={() => undefined}
      />,
    );

    expect(screen.queryByText("화면 문구")).not.toBeInTheDocument();
  });

  it("displays existing copy items", () => {
    const copy: UxCopy[] = [
      {
        id: "copy-1",
        screenId: demoScreen.id,
        context: "버튼",
        text: "로그인하기",
        toneRule: "",
        evidence: { type: "original", reviewStatus: "confirmed", sourceId: "s1", sourceExcerpt: "로그인하기", rationale: null },
      },
    ];

    render(
      <ScreenDetail
        screen={demoScreen}
        editing={false}
        onChange={() => undefined}
        uxCopy={copy}
        onUxCopyChange={() => undefined}
      />,
    );

    expect(screen.getByText("버튼")).toBeInTheDocument();
    expect(screen.getByText("로그인하기")).toBeInTheDocument();
  });

  it("shows add form when editing and onUxCopyChange provided", () => {
    render(
      <ScreenDetail
        screen={demoScreen}
        editing={true}
        onChange={() => undefined}
        uxCopy={[]}
        onUxCopyChange={() => undefined}
      />,
    );

    expect(screen.getByPlaceholderText("새 문구 추가…")).toBeInTheDocument();
  });

  it("calls onUxCopyChange with new item when delete clicked", () => {
    const onUxCopyChange = vi.fn();
    const copy: UxCopy[] = [
      {
        id: "copy-del",
        screenId: demoScreen.id,
        context: "레이블",
        text: "삭제할 문구",
        toneRule: "",
        evidence: { type: "assumption", reviewStatus: "needs-review", sourceId: "user-input", sourceExcerpt: "삭제할 문구", rationale: null },
      },
    ];

    render(
      <ScreenDetail
        screen={demoScreen}
        editing={true}
        onChange={() => undefined}
        uxCopy={copy}
        onUxCopyChange={onUxCopyChange}
      />,
    );

    screen.getByLabelText("문구 삭제").click();
    expect(onUxCopyChange).toHaveBeenCalledWith([]);
  });

  it("shows toneRule as badge in view mode when set", () => {
    const copy: UxCopy[] = [
      {
        id: "copy-tone",
        screenId: demoScreen.id,
        context: "버튼",
        text: "시작하기",
        toneRule: "짧고 행동 유도",
        evidence: { type: "original", reviewStatus: "confirmed", sourceId: "s1", sourceExcerpt: "시작하기", rationale: null },
      },
    ];

    render(
      <ScreenDetail
        screen={demoScreen}
        editing={false}
        onChange={() => undefined}
        uxCopy={copy}
        onUxCopyChange={() => undefined}
      />,
    );

    expect(screen.getByText("짧고 행동 유도")).toBeInTheDocument();
  });

  it("shows toneRule input field in edit mode", () => {
    const copy: UxCopy[] = [
      {
        id: "copy-tone-edit",
        screenId: demoScreen.id,
        context: "버튼",
        text: "계속하기",
        toneRule: "친근하게",
        evidence: { type: "original", reviewStatus: "confirmed", sourceId: "s1", sourceExcerpt: "계속하기", rationale: null },
      },
    ];

    render(
      <ScreenDetail
        screen={demoScreen}
        editing={true}
        onChange={() => undefined}
        uxCopy={copy}
        onUxCopyChange={() => undefined}
      />,
    );

    expect(screen.getByPlaceholderText("톤 규칙 (예: 친근하고 간결하게)")).toBeInTheDocument();
  });
});
