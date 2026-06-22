import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
        sources={[baseSource]}
        onSourcesChange={() => undefined}
      />,
    );

    expect(screen.getByText("테스트 원문")).toBeInTheDocument();
    expect(screen.getByText("직접 입력")).toBeInTheDocument();
  });

  it("shows creation date when updatedAt equals createdAt", () => {
    render(
      <SourceViewer
        projectId="proj-1"
        sources={[baseSource]}
        onSourcesChange={() => undefined}
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
        sources={[modified]}
        onSourcesChange={() => undefined}
      />,
    );

    expect(screen.getByText(/수정됨/)).toBeInTheDocument();
  });

  it("returns the next source list after deletion", async () => {
    const onSourcesChange = vi.fn();
    const onBusyChange = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.confirm = vi.fn().mockReturnValue(true);

    render(
      <SourceViewer
        projectId="proj-1"
        sources={[baseSource]}
        onSourcesChange={onSourcesChange}
        onBusyChange={onBusyChange}
      />,
    );

    screen.getByLabelText("테스트 원문 삭제").click();
    await vi.waitFor(() => expect(onSourcesChange).toHaveBeenCalledWith([]));
    expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
  });

  it("keeps a source visible when deletion fails", async () => {
    const onSourcesChange = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "삭제 실패" }),
    });
    global.confirm = vi.fn().mockReturnValue(true);

    render(
      <SourceViewer
        projectId="proj-1"
        sources={[baseSource]}
        onSourcesChange={onSourcesChange}
      />,
    );

    screen.getByLabelText("테스트 원문 삭제").click();

    expect(await screen.findByRole("alert")).toHaveTextContent("삭제 실패");
    expect(onSourcesChange).not.toHaveBeenCalled();
    expect(screen.getByText("테스트 원문")).toBeInTheDocument();
  });

  it("returns the saved source so the parent keeps it across tab changes", async () => {
    const user = userEvent.setup();
    const onSourcesChange = vi.fn();
    const savedSource = {
      ...baseSource,
      id: "src-2",
      name: "새 원문",
      content: "새 내용",
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ source: savedSource }),
    });

    render(
      <SourceViewer
        projectId="proj-1"
        sources={[baseSource]}
        onSourcesChange={onSourcesChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "텍스트 붙여넣기" }));
    await user.type(screen.getByPlaceholderText("원문 이름 (선택)"), "새 원문");
    await user.type(
      screen.getByPlaceholderText("원문 내용을 붙여넣거나 직접 입력하세요."),
      "새 내용",
    );
    await user.click(screen.getByRole("button", { name: "추가" }));

    await vi.waitFor(() =>
      expect(onSourcesChange).toHaveBeenCalledWith([baseSource, savedSource]),
    );
  });

  it("uploads PDF files as base64 with file metadata", async () => {
    const user = userEvent.setup();
    const onSourcesChange = vi.fn();
    const pdfSource = {
      ...baseSource,
      id: "src-pdf",
      name: "요구사항.pdf",
      type: "pdf" as const,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ source: pdfSource }),
    });

    const { container } = render(
      <SourceViewer
        projectId="proj-1"
        sources={[]}
        onSourcesChange={onSourcesChange}
      />,
    );
    const file = new File([new Uint8Array([1, 2, 3])], "요구사항.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "arrayBuffer", {
      value: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const request = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(String((request[1] as RequestInit).body));
    expect(body).toMatchObject({
      name: "요구사항.pdf",
      type: "pdf",
      content: "AQID",
      fileSize: 3,
      isPdfBase64: true,
    });
  });
});
