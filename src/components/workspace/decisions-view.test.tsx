import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DecisionsView } from "@/components/workspace/decisions-view";
import { demoSpecDocument } from "@/lib/spec/demo-document";
import type { SpecDocument } from "@/lib/spec/schema";

describe("DecisionsView", () => {
  it("shows empty state when no confirmed or resolved items", () => {
    const doc: SpecDocument = {
      ...demoSpecDocument,
      requirements: demoSpecDocument.requirements.map((r) => ({
        ...r,
        evidence: { ...r.evidence, reviewStatus: "needs-review" },
      })),
      questions: demoSpecDocument.questions.map((q) => ({ ...q, resolved: false })),
    };

    render(<DecisionsView document={doc} />);

    expect(screen.getByText("결정 기록")).toBeInTheDocument();
    expect(screen.getByText(/아직 확정된 결정이 없어요/)).toBeInTheDocument();
  });

  it("shows confirmed requirements section", () => {
    const doc: SpecDocument = {
      ...demoSpecDocument,
      requirements: [
        {
          ...demoSpecDocument.requirements[0],
          evidence: { ...demoSpecDocument.requirements[0].evidence, reviewStatus: "confirmed" },
        },
      ],
      questions: demoSpecDocument.questions.map((q) => ({ ...q, resolved: false })),
    };

    render(<DecisionsView document={doc} />);

    expect(screen.getByText("확정된 요구사항")).toBeInTheDocument();
  });

  it("shows resolved questions section", () => {
    const doc: SpecDocument = {
      ...demoSpecDocument,
      requirements: demoSpecDocument.requirements.map((r) => ({
        ...r,
        evidence: { ...r.evidence, reviewStatus: "needs-review" },
      })),
      questions: [
        { ...demoSpecDocument.questions[0], resolved: true },
      ],
    };

    render(<DecisionsView document={doc} />);

    expect(screen.getByText("해결된 질문")).toBeInTheDocument();
  });
});
