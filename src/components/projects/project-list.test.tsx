import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectList } from "./project-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const originalTimezone = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTimezone;
});

describe("ProjectList hydration", () => {
  it("renders the same initial markup in the server and browser timezones", () => {
    const projects = [
      {
        id: "project-1",
        name: "테스트 프로젝트",
        revision: 3,
        updatedAt: "2026-06-22T05:33:28.000Z",
      },
    ];

    process.env.TZ = "UTC";
    const serverMarkup = renderToString(
      <ProjectList projects={projects} />,
    );

    process.env.TZ = "Asia/Seoul";
    const browserMarkup = renderToString(
      <ProjectList projects={projects} />,
    );

    expect(browserMarkup).toBe(serverMarkup);
  });
});
