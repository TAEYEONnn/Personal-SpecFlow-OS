import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProjectsLoading from "@/app/projects/loading";

describe("ProjectsLoading", () => {
  it("renders an accessible project list skeleton", () => {
    render(<ProjectsLoading />);

    expect(
      screen.getByRole("status", { name: "프로젝트 목록 불러오는 중" }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("project-row-skeleton")).toHaveLength(3);
  });
});
