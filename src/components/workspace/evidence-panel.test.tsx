import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvidencePanel } from "@/components/workspace/evidence-panel";
import { demoSpecDocument } from "@/lib/spec/demo-document";

describe("EvidencePanel", () => {
  it("separates original excerpts from inference rationale", () => {
    render(
      <EvidencePanel
        evidence={demoSpecDocument.screens[1].evidence}
        onStatusChange={() => undefined}
      />,
    );

    expect(screen.getByText("추론 근거")).toBeInTheDocument();
    expect(screen.getByText("검토 상태")).toBeInTheDocument();
  });
});
