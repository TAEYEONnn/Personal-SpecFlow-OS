import { describe, expect, it } from "vitest";
import { computeAutoLayout } from "@/components/workspace/flow-canvas";
import type { Screen, ScreenState } from "@/lib/spec/schema";

function makeScreen(id: string, nextIds: string[] = []): Screen {
  return {
    id,
    name: id,
    description: "",
    entryConditions: [],
    primaryActions: [],
    requiredData: [],
    nextScreenIds: nextIds,
    cta: "",
    qaCriteria: [],
    evidence: { type: "original", reviewStatus: "confirmed", sourceId: "s1", sourceExcerpt: "x", rationale: null },
    position: { x: 0, y: 0 },
  };
}

describe("computeAutoLayout", () => {
  it("returns empty object for empty screens", () => {
    expect(computeAutoLayout([], [])).toEqual({});
  });

  it("places a single screen at a positive x,y", () => {
    const result = computeAutoLayout([makeScreen("a")], []);
    expect(result["a"]).toBeDefined();
    expect(result["a"].x).toBeGreaterThanOrEqual(0);
  });

  it("assigns later layer to downstream screens (x increases)", () => {
    const screens = [makeScreen("a", ["b"]), makeScreen("b", ["c"]), makeScreen("c")];
    const result = computeAutoLayout(screens, []);
    expect(result["a"].x).toBeLessThan(result["b"].x);
    expect(result["b"].x).toBeLessThan(result["c"].x);
  });

  it("puts parallel screens in the same column (same x)", () => {
    const screens = [makeScreen("root", ["left", "right"]), makeScreen("left"), makeScreen("right")];
    const result = computeAutoLayout(screens, []);
    expect(result["left"].x).toBe(result["right"].x);
  });

  it("assigns positions to all screens including disconnected ones", () => {
    const screens = [makeScreen("a"), makeScreen("b")];
    const result = computeAutoLayout(screens, [] as ScreenState[]);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result["a"]).toBeDefined();
    expect(result["b"]).toBeDefined();
  });

  it("positions are finite numbers", () => {
    const screens = [makeScreen("a", ["b"]), makeScreen("b")];
    const result = computeAutoLayout(screens, []);
    for (const pos of Object.values(result)) {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    }
  });
});
