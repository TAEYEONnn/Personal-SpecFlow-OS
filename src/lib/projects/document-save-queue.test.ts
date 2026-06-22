import { describe, expect, it, vi } from "vitest";
import { createDocumentSaveQueue } from "@/lib/projects/document-save-queue";
import { demoSpecDocument } from "@/lib/spec/demo-document";

describe("createDocumentSaveQueue", () => {
  it("serializes saves and passes the latest revision to the next request", async () => {
    const calls: number[] = [];
    const save = vi.fn(async (revision: number) => {
      calls.push(revision);
      await Promise.resolve();
      return revision + 1;
    });
    const queue = createDocumentSaveQueue(3, save);

    const first = queue.enqueue(demoSpecDocument);
    const second = queue.enqueue(demoSpecDocument);

    await expect(first).resolves.toBe(4);
    await expect(second).resolves.toBe(5);
    expect(calls).toEqual([3, 4]);
    expect(queue.getRevision()).toBe(5);
  });

  it("continues after a failed save without reusing a stale revision", async () => {
    const save = vi
      .fn<(revision: number) => Promise<number>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(8);
    const queue = createDocumentSaveQueue(7, save);

    await expect(queue.enqueue(demoSpecDocument)).rejects.toThrow("network");
    await expect(queue.enqueue(demoSpecDocument)).resolves.toBe(8);
    expect(save).toHaveBeenNthCalledWith(2, 7, demoSpecDocument);
  });

  it("accepts a server revision after a full recompile", async () => {
    const save = vi.fn(async (revision: number) => revision + 1);
    const queue = createDocumentSaveQueue(1, save);
    queue.setRevision(8);

    await expect(queue.enqueue(demoSpecDocument)).resolves.toBe(9);
    expect(save).toHaveBeenCalledWith(8, demoSpecDocument);
  });

  it("serializes a full re-analysis with document saves", async () => {
    const calls: string[] = [];
    const save = vi.fn(async (revision: number) => {
      calls.push(`save:${revision}`);
      return revision + 1;
    });
    const queue = createDocumentSaveQueue(2, save);

    const firstSave = queue.enqueue(demoSpecDocument);
    const analysis = queue.runExclusive(async (revision) => {
      calls.push(`analysis:${revision}`);
      return { revision: revision + 1, value: "compiled" };
    });
    const laterSave = queue.enqueue(demoSpecDocument);

    await expect(firstSave).resolves.toBe(3);
    await expect(analysis).resolves.toEqual({
      revision: 4,
      value: "compiled",
    });
    await expect(laterSave).resolves.toBe(5);
    expect(calls).toEqual(["save:2", "analysis:3", "save:4"]);
  });
});
