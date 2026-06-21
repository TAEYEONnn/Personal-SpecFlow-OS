import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EvidencePanel } from "@/components/workspace/evidence-panel";
import { demoSpecDocument } from "@/lib/spec/demo-document";

const evidence = demoSpecDocument.screens[1].evidence;

describe("EvidencePanel", () => {
  it("separates original excerpts from inference rationale", () => {
    render(
      <EvidencePanel
        evidence={evidence}
        onStatusChange={() => undefined}
      />,
    );

    expect(screen.getByText("추론 근거")).toBeInTheDocument();
    expect(screen.getByText("검토 상태")).toBeInTheDocument();
  });

  it("renders collapse button when onToggleCollapse provided", () => {
    render(
      <EvidencePanel
        evidence={evidence}
        onStatusChange={() => undefined}
        onToggleCollapse={() => undefined}
      />,
    );

    expect(screen.getByLabelText("근거 패널 접기")).toBeInTheDocument();
  });

  it("renders slim collapsed strip when collapsed=true", () => {
    const toggle = vi.fn();
    render(
      <EvidencePanel
        evidence={evidence}
        onStatusChange={() => undefined}
        collapsed={true}
        onToggleCollapse={toggle}
      />,
    );

    expect(screen.queryByText("검토 상태")).not.toBeInTheDocument();
    const btn = screen.getByLabelText("근거 패널 펼치기");
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it("shows full panel when collapsed=false", () => {
    render(
      <EvidencePanel
        evidence={evidence}
        onStatusChange={() => undefined}
        collapsed={false}
        onToggleCollapse={() => undefined}
      />,
    );

    expect(screen.getByText("검토 상태")).toBeInTheDocument();
    expect(screen.getByLabelText("근거 패널 접기")).toBeInTheDocument();
  });
});
