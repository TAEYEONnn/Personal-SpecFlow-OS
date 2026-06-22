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
    expect(screen.getByText("정리된 문서가 없어요. 다시 정리하기를 시도해 보세요.")).toBeInTheDocument();
  });
});
