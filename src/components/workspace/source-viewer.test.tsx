import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SourceViewer } from "@/components/workspace/source-viewer";

const baseSource = {
  id: "src-1",
  name: "테스트 원문",
  type: "paste" as const,
  content: "내용",
  createdAt: "2026-06-22T09:00:00.000Z",
  updatedAt: "2026-06-22T09:00:00.000Z",
};

describe("SourceViewer", () => {
  it("renders source name and type label", () => {
    render(
      <SourceViewer
        projectId="proj-1"
        initialSources={[baseSource]}
      />,
    );

    expect(screen.getByText("테스트 원문")).toBeInTheDocument();
    expect(screen.getByText("직접 입력")).toBeInTheDocument();
  });

  it("shows creation date when updatedAt equals createdAt", () => {
    render(
      <SourceViewer
        projectId="proj-1"
        initialSources={[baseSource]}
      />,
    );

    expect(screen.queryByText(/수정됨/)).not.toBeInTheDocument();
  });

  it("shows modified date when updatedAt differs from createdAt", () => {
    const modified = {
      ...baseSource,
      updatedAt: "2026-06-22T12:00:00.000Z",
    };

    render(
      <SourceViewer
        projectId="proj-1"
        initialSources={[modified]}
      />,
    );

    expect(screen.getByText(/수정됨/)).toBeInTheDocument();
  });

  it("calls onSourceDelete callback after deletion", async () => {
    const onSourceDelete = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.confirm = vi.fn().mockReturnValue(true);

    render(
      <SourceViewer
        projectId="proj-1"
        initialSources={[baseSource]}
        onSourceDelete={onSourceDelete}
      />,
    );

    screen.getByLabelText("테스트 원문 삭제").click();
    await vi.waitFor(() => expect(onSourceDelete).toHaveBeenCalledTimes(1));
  });
});
