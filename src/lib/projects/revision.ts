export class RevisionConflictError extends Error {
  constructor() {
    super("다른 곳에서 문서가 수정됐어요. 새로고침하고 다시 시도해요.");
    this.name = "RevisionConflictError";
  }
}

export function assertRevision(expected: number, current: number) {
  if (expected !== current) {
    throw new RevisionConflictError();
  }
}
