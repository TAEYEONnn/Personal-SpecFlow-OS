export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_BLOCK_MS = 15 * 60 * 1000;
export const MAX_LOGIN_ATTEMPTS = 5;

export type LoginAttemptState = {
  attemptCount: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
};

export function shouldBlockLogin(state: LoginAttemptState | null, now = new Date()) {
  return Boolean(state?.blockedUntil && state.blockedUntil.getTime() > now.getTime());
}

export function nextFailureState(
  current: LoginAttemptState | null,
  now = new Date(),
): LoginAttemptState {
  const windowExpired =
    !current ||
    now.getTime() - current.windowStartedAt.getTime() > LOGIN_WINDOW_MS;
  const attemptCount = windowExpired ? 1 : current.attemptCount + 1;

  return {
    attemptCount,
    windowStartedAt: windowExpired ? now : current.windowStartedAt,
    blockedUntil:
      attemptCount >= MAX_LOGIN_ATTEMPTS
        ? new Date(now.getTime() + LOGIN_BLOCK_MS)
        : null,
  };
}
