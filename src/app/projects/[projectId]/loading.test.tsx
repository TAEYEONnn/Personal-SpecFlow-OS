import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProjectLoading from "@/app/projects/[projectId]/loading";

describe("ProjectLoading", () => {
  it("renders an accessible workspace skeleton", () => {
    render(<ProjectLoading />);

    expect(
      screen.getByRole("status", { name: "프로젝트 작업공간 불러오는 중" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("workspace-canvas-skeleton")).toBeInTheDocument();
  });
});
