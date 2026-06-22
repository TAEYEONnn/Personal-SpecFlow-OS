import { useEffect, useState } from "react";

export const DEFAULT_CANVAS_HEIGHT = 360;

export function parseStoredCanvasHeight(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return DEFAULT_CANVAS_HEIGHT;
  const height = Number(value);
  return Number.isSafeInteger(height) && height >= 120
    ? height
    : DEFAULT_CANVAS_HEIGHT;
}

export function useWorkspacePreferences() {
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CANVAS_HEIGHT);
  const [evidencePanelCollapsed, setEvidencePanelCollapsed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const storedHeight = parseStoredCanvasHeight(
          window.localStorage.getItem("specflow-canvas-height"),
        );
        setCanvasHeight(storedHeight);
        setEvidencePanelCollapsed(
          window.localStorage.getItem("specflow-evidence-collapsed") === "true",
        );
      } catch {
        setCanvasHeight(DEFAULT_CANVAS_HEIGHT);
        setEvidencePanelCollapsed(false);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return {
    canvasHeight,
    setCanvasHeight,
    evidencePanelCollapsed,
    setEvidencePanelCollapsed,
  };
}

export function useHydratedMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    const frame = window.requestAnimationFrame(() => {
      setMatches(mediaQuery.matches);
    });

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      window.cancelAnimationFrame(frame);
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
