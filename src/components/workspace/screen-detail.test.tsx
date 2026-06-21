import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScreenDetail } from "@/components/workspace/screen-detail";
import { demoSpecDocument } from "@/lib/spec/demo-document";

describe("ScreenDetail", () => {
  it("shows the selected screen specification", () => {
    render(
      <ScreenDetail
        screen={demoSpecDocument.screens[0]}
        editing={false}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText("진입 조건")).toBeInTheDocument();
    expect(screen.getByText("주요 행동")).toBeInTheDocument();
    expect(screen.getByText("QA 기준")).toBeInTheDocument();
  });
});
