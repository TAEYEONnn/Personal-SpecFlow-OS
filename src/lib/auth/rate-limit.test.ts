import { describe, expect, it } from "vitest";
import {
  LOGIN_BLOCK_MS,
  LOGIN_WINDOW_MS,
  nextFailureState,
  shouldBlockLogin,
} from "@/lib/auth/rate-limit";

describe("login rate limiting", () => {
  const now = new Date("2026-06-21T10:00:00.000Z");

  it("blocks the fifth failed attempt", () => {
    const state = nextFailureState(
      {
        attemptCount: 4,
        windowStartedAt: new Date(now.getTime() - 1000),
        blockedUntil: null,
      },
      now,
    );

    expect(state.attemptCount).toBe(5);
    expect(state.blockedUntil?.getTime()).toBe(now.getTime() + LOGIN_BLOCK_MS);
    expect(shouldBlockLogin(state, now)).toBe(true);
  });

  it("starts a new window after the previous window expires", () => {
    const state = nextFailureState(
      {
        attemptCount: 4,
        windowStartedAt: new Date(now.getTime() - LOGIN_WINDOW_MS - 1),
        blockedUntil: null,
      },
      now,
    );

    expect(state.attemptCount).toBe(1);
    expect(state.windowStartedAt).toEqual(now);
    expect(state.blockedUntil).toBeNull();
  });

  it("unblocks after the block duration", () => {
    expect(
      shouldBlockLogin(
        {
          attemptCount: 5,
          windowStartedAt: now,
          blockedUntil: new Date(now.getTime() - 1),
        },
        now,
      ),
    ).toBe(false);
  });
});
