import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EvidencePanel } from "@/components/workspace/evidence-panel";
import { demoSpecDocument } from "@/lib/spec/demo-document";

const evidence = demoSpecDocument.screens[1].evidence;

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("applies matchMedia after hydration, reacts to changes, and cleans up", () => {
    let restore: FrameRequestCallback | undefined;
    let onChange: ((event: MediaQueryListEvent) => void) | undefined;
    const removeEventListener = vi.fn();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      restore = callback;
      return 9;
    });
    const cancelAnimationFrame = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => undefined);
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({
          matches: true,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
            onChange = listener as (event: MediaQueryListEvent) => void;
          },
          removeEventListener,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );

    const view = render(
      <EvidencePanel
        evidence={evidence}
        onStatusChange={() => undefined}
        onToggleCollapse={() => undefined}
      />,
    );

    expect(document.querySelector(".evidence-overlay-backdrop")).toBeNull();
    act(() => restore?.(0));
    expect(document.querySelector(".evidence-overlay-backdrop")).not.toBeNull();

    act(() => onChange?.({ matches: false } as MediaQueryListEvent));
    expect(document.querySelector(".evidence-overlay-backdrop")).toBeNull();

    view.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(9);
    expect(removeEventListener).toHaveBeenCalledWith("change", onChange);
  });
});
