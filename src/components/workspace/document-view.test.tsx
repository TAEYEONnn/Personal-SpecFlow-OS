import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentView } from "@/components/workspace/document-view";
import { demoSpecDocument } from "@/lib/spec/demo-document";
import type { Task } from "@/lib/spec/schema";

describe("DocumentView", () => {
  it("renders the project title", () => {
    render(<DocumentView document={demoSpecDocument} />);
    expect(screen.getByText(demoSpecDocument.brief.title)).toBeInTheDocument();
  });

  it("shows existing tasks", () => {
    render(<DocumentView document={demoSpecDocument} />);
    expect(screen.getByText(demoSpecDocument.tasks[0].title)).toBeInTheDocument();
  });

  it("shows task create input when onTaskCreate provided", () => {
    render(
      <DocumentView
        document={demoSpecDocument}
        onTaskCreate={() => undefined}
      />,
    );
    expect(screen.getByPlaceholderText("새 작업 추가…")).toBeInTheDocument();
  });

  it("hides task create input when onTaskCreate not provided", () => {
    render(<DocumentView document={demoSpecDocument} />);
    expect(screen.queryByPlaceholderText("새 작업 추가…")).not.toBeInTheDocument();
  });

  it("shows delete button for each task when onTaskDelete provided", () => {
    render(
      <DocumentView
        document={demoSpecDocument}
        onTaskDelete={() => undefined}
      />,
    );
    expect(screen.getByLabelText("작업 삭제")).toBeInTheDocument();
  });

  it("calls onTaskCreate with a full Task object including user source", () => {
    const onTaskCreate = vi.fn();
    render(
      <DocumentView
        document={demoSpecDocument}
        onTaskCreate={onTaskCreate}
      />,
    );

    const input = screen.getByPlaceholderText("새 작업 추가…");
    const addButton = screen.getByText("추가");

    fireEvent.change(input, { target: { value: "테스트 작업" } });
    fireEvent.click(addButton);

    expect(onTaskCreate).toHaveBeenCalledWith(
      expect.objectContaining<Partial<Task>>({
        source: "user",
        status: "inbox",
        priority: "medium",
        deletedAt: null,
      }),
    );
  });

  it("calls onTaskUpdate when status changed", () => {
    const onTaskUpdate = vi.fn();
    render(
      <DocumentView
        document={demoSpecDocument}
        onTaskUpdate={onTaskUpdate}
      />,
    );

    const select = screen.getByDisplayValue(/./) as HTMLSelectElement;
    select.value = "done";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onTaskUpdate).toHaveBeenCalledWith(
      demoSpecDocument.tasks[0].id,
      expect.objectContaining({ status: "done" }),
    );
  });

  it("shows empty state when no document title", () => {
    const empty = structuredClone(demoSpecDocument);
    empty.brief.title = "";
    render(<DocumentView document={empty} />);
    expect(
      screen.getByText("아직 정리된 내용이 없어요. 원문을 확인한 뒤 다시 정리해 주세요."),
    ).toBeInTheDocument();
  });

  it("edits a confirmation question and resets it to unresolved", () => {
    const onQuestionUpdate = vi.fn();
    render(
      <DocumentView
        document={demoSpecDocument}
        onQuestionUpdate={onQuestionUpdate}
      />,
    );

    fireEvent.click(
      screen.getByLabelText(`${demoSpecDocument.questions[0].question} 수정`),
    );
    const questionInput = screen.getByDisplayValue(
      demoSpecDocument.questions[0].question,
    );
    fireEvent.change(questionInput, { target: { value: "소셜 로그인도 넣을까요?" } });
    fireEvent.click(screen.getByRole("button", { name: "질문 저장" }));

    expect(onQuestionUpdate).toHaveBeenCalledWith(
      demoSpecDocument.questions[0].id,
      expect.objectContaining({
        question: "소셜 로그인도 넣을까요?",
        resolved: false,
        evidence: expect.objectContaining({
          type: "assumption",
          sourceId: "user-input",
          rationale: expect.stringContaining(
            demoSpecDocument.questions[0].evidence.sourceExcerpt,
          ),
        }),
      }),
    );
  });

  it("moves deleted tasks to a trash section and allows restore", () => {
    const onTaskRestore = vi.fn();
    const deletedTask = {
      ...demoSpecDocument.tasks[0],
      deletedAt: "2026-06-22T00:00:00.000Z",
    };
    render(
      <DocumentView
        document={{ ...demoSpecDocument, tasks: [deletedTask] }}
        onTaskRestore={onTaskRestore}
      />,
    );

    expect(screen.queryByText(deletedTask.title)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "휴지통 열기" }));
    expect(screen.getByText(deletedTask.title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "복원" }));
    expect(onTaskRestore).toHaveBeenCalledWith(deletedTask.id);
  });

  it("requires confirmation before permanently deleting a task", () => {
    const onTaskPurge = vi.fn();
    const deletedTask = {
      ...demoSpecDocument.tasks[0],
      deletedAt: "2026-06-22T00:00:00.000Z",
    };
    global.confirm = vi.fn().mockReturnValue(false);
    render(
      <DocumentView
        document={{ ...demoSpecDocument, tasks: [deletedTask] }}
        onTaskPurge={onTaskPurge}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "휴지통 열기" }));
    fireEvent.click(screen.getByRole("button", { name: "영구 삭제" }));

    expect(global.confirm).toHaveBeenCalled();
    expect(onTaskPurge).not.toHaveBeenCalled();
  });

  it("groups requirements by category", () => {
    render(<DocumentView document={demoSpecDocument} />);
    expect(screen.getByRole("heading", { name: "인증" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "보안" })).toBeInTheDocument();
  });

  it("shows Korean labels instead of state enum values", () => {
    render(<DocumentView document={demoSpecDocument} />);
    expect(screen.getByText("불러오는 중")).toBeInTheDocument();
    expect(screen.queryByText("LOADING")).not.toBeInTheDocument();
  });

  it("groups permissions by role and plain-language status", () => {
    render(<DocumentView document={demoSpecDocument} />);
    expect(screen.getByRole("heading", { name: "디자이너" })).toBeInTheDocument();
    expect(screen.getByText("할 수 있어요")).toBeInTheDocument();
  });
});
