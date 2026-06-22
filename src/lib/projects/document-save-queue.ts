import type { SpecDocument } from "@/lib/spec/schema";

export function createDocumentSaveQueue(
  initialRevision: number,
  save: (revision: number, document: SpecDocument) => Promise<number>,
) {
  let revision = initialRevision;
  let tail = Promise.resolve();

  return {
    enqueue(document: SpecDocument) {
      const operation = tail.then(async () => {
        revision = await save(revision, document);
        return revision;
      });
      tail = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
    runExclusive<T>(
      operation: (
        revision: number,
      ) => Promise<{ revision: number; value: T }>,
    ) {
      const queuedOperation = tail.then(async () => {
        const result = await operation(revision);
        revision = result.revision;
        return result;
      });
      tail = queuedOperation.then(
        () => undefined,
        () => undefined,
      );
      return queuedOperation;
    },
    getRevision() {
      return revision;
    },
    setRevision(nextRevision: number) {
      revision = nextRevision;
    },
  };
}
