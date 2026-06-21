export class RevisionConflictError extends Error {
  constructor() {
    super("다른 곳에서 문서가 수정되었습니다. 새로고침 후 다시 시도해 주세요.");
    this.name = "RevisionConflictError";
  }
}

export function assertRevision(expected: number, current: number) {
  if (expected !== current) {
    throw new RevisionConflictError();
  }
}
