import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_CANVAS_HEIGHT,
  parseStoredCanvasHeight,
  useWorkspacePreferences,
} from "./browser-state";

function PreferenceHarness() {
  const { canvasHeight, evidencePanelCollapsed } = useWorkspacePreferences();
  return (
    <output>
      {canvasHeight}:{String(evidencePanelCollapsed)}
    </output>
  );
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("workspace browser preferences", () => {
  it("uses the same fixed values for server render and client first render", () => {
    window.localStorage.setItem("specflow-canvas-height", "640");
    window.localStorage.setItem("specflow-evidence-collapsed", "true");
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);

    expect(renderToString(<PreferenceHarness />).replaceAll("<!-- -->", "")).toContain(
      "360:false",
    );
    render(<PreferenceHarness />);
    expect(screen.getByRole("status").textContent).toBe("360:false");
  });

  it("restores canvas height and evidence collapse after hydration", () => {
    let restore: FrameRequestCallback | undefined;
    window.localStorage.setItem("specflow-canvas-height", "640");
    window.localStorage.setItem("specflow-evidence-collapsed", "true");
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      restore = callback;
      return 7;
    });
    const cancel = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => undefined);

    const view = render(<PreferenceHarness />);
    expect(screen.getByRole("status").textContent).toBe("360:false");

    act(() => restore?.(0));
    expect(screen.getByRole("status").textContent).toBe("640:true");

    view.unmount();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it("uses the default height for malformed storage values", () => {
    expect(parseStoredCanvasHeight("12px")).toBe(DEFAULT_CANVAS_HEIGHT);
    expect(parseStoredCanvasHeight("-1")).toBe(DEFAULT_CANVAS_HEIGHT);
    expect(parseStoredCanvasHeight(null)).toBe(DEFAULT_CANVAS_HEIGHT);
  });
});
