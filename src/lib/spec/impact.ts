import type { SpecDocument } from "@/lib/spec/schema";

export type ImpactReport = {
  requirementId: string;
  affectedScreenIds: string[];
  affectedStateIds: string[];
  affectedCopyIds: string[];
  affectedTaskIds: string[];
  affectedQuestionIds: string[];
};

/**
 * Given a requirement ID, returns all entities that reference or depend on it.
 * Uses affectedScreenIds from the requirement itself, plus cross-references through screenId.
 */
export function computeImpact(doc: SpecDocument, requirementId: string): ImpactReport {
  const req = doc.requirements.find((r) => r.id === requirementId);
  const affectedScreenIds = req?.affectedScreenIds ?? [];
  const affectedScreenSet = new Set(affectedScreenIds);

  const affectedStateIds = doc.states
    .filter((s) => affectedScreenSet.has(s.screenId))
    .map((s) => s.id);

  const affectedCopyIds = doc.uxCopy
    .filter((c) => affectedScreenSet.has(c.screenId))
    .map((c) => c.id);

  const affectedTaskIds = doc.tasks
    .filter((t) => !t.deletedAt && t.relatedIds.includes(requirementId))
    .map((t) => t.id);

  const affectedQuestionIds = doc.questions
    .filter((q) => q.evidence.sourceId === req?.evidence.sourceId)
    .map((q) => q.id);

  return {
    requirementId,
    affectedScreenIds,
    affectedStateIds,
    affectedCopyIds,
    affectedTaskIds,
    affectedQuestionIds,
  };
}

export type DocumentDiff = {
  addedScreenIds: string[];
  removedScreenIds: string[];
  changedScreenIds: string[];
  addedRequirementIds: string[];
  removedRequirementIds: string[];
  changedRequirementIds: string[];
  addedStateIds: string[];
  removedStateIds: string[];
  addedCopyIds: string[];
  removedCopyIds: string[];
  addedQuestionIds: string[];
  removedQuestionIds: string[];
  changedQuestionIds: string[];
  addedRoleIds: string[];
  removedRoleIds: string[];
  briefChanged: boolean;
  taskStatusChanges: Array<{ id: string; from: string; to: string }>;
};

/**
 * Computes a structural diff between two SpecDocuments (previous vs current).
 * Compares by entity ID; content changes are detected by JSON serialization.
 */
export function diffDocuments(prev: SpecDocument, current: SpecDocument): DocumentDiff {
  function diffEntities<T extends { id: string }>(
    prevList: T[],
    currList: T[],
  ): { added: string[]; removed: string[]; changed: string[] } {
    const prevMap = new Map(prevList.map((e) => [e.id, JSON.stringify(e)]));
    const currMap = new Map(currList.map((e) => [e.id, JSON.stringify(e)]));
    const added = currList.filter((e) => !prevMap.has(e.id)).map((e) => e.id);
    const removed = prevList.filter((e) => !currMap.has(e.id)).map((e) => e.id);
    const changed = currList
      .filter((e) => prevMap.has(e.id) && prevMap.get(e.id) !== currMap.get(e.id))
      .map((e) => e.id);
    return { added, removed, changed };
  }

  const screens = diffEntities(prev.screens, current.screens);
  const requirements = diffEntities(prev.requirements, current.requirements);
  const states = diffEntities(prev.states, current.states);
  const copy = diffEntities(prev.uxCopy, current.uxCopy);
  const questions = diffEntities(prev.questions, current.questions);
  const roles = diffEntities(prev.roles, current.roles);

  const prevTaskMap = new Map(
    prev.tasks
      .filter((task) => !task.deletedAt)
      .map((task) => [task.id, task.status]),
  );
  const taskStatusChanges = current.tasks
    .filter((task) => !task.deletedAt)
    .filter((t) => {
      const prevStatus = prevTaskMap.get(t.id);
      return prevStatus !== undefined && prevStatus !== t.status;
    })
    .map((t) => ({ id: t.id, from: prevTaskMap.get(t.id)!, to: t.status }));

  return {
    addedScreenIds: screens.added,
    removedScreenIds: screens.removed,
    changedScreenIds: screens.changed,
    addedRequirementIds: requirements.added,
    removedRequirementIds: requirements.removed,
    changedRequirementIds: requirements.changed,
    addedStateIds: states.added,
    removedStateIds: states.removed,
    addedCopyIds: copy.added,
    removedCopyIds: copy.removed,
    addedQuestionIds: questions.added,
    removedQuestionIds: questions.removed,
    changedQuestionIds: questions.changed,
    addedRoleIds: roles.added,
    removedRoleIds: roles.removed,
    briefChanged: JSON.stringify(prev.brief) !== JSON.stringify(current.brief),
    taskStatusChanges,
  };
}
