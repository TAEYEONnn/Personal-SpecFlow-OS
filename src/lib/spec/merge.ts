import type { Evidence, Question, Screen, SpecDocument, Task, UxCopy } from "@/lib/spec/schema";

export type MergeStats = {
  added: number;
  proposedUpdates: number;
  preserved: number;
  conflicts: number;
  deduplicated: number;
  preservedCompletedTasks: number;
  preservedAnsweredQuestions: number;
  preservedScreenPositions: number;
};

export type MergeCompiledResult = {
  document: SpecDocument;
  stats: MergeStats;
};

// ─── text normalization ───────────────────────────────────────────────────────

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function normalizeTaskTitle(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,!?()[\]{}:;'"`]/g, "")
    .trim();
}

function similarity(a: string, b: string) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.86;
  const leftTokens = new Set(left.match(/.{1,2}/gu) ?? []);
  const rightTokens = new Set(right.match(/.{1,2}/gu) ?? []);
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
}

// ─── task identity ────────────────────────────────────────────────────────────

function taskSemanticKey(task: Task): string {
  const relIds = [
    ...(task.relatedRequirementIds ?? []),
    ...(task.relatedScreenIds ?? []),
  ].sort();
  return `${normalizeTaskTitle(task.title)}|${relIds.join(",")}`;
}

function findMatchingTask(aiTask: Task, candidates: Task[]): Task | undefined {
  const byId = candidates.find((t) => t.id === aiTask.id);
  if (byId) return byId;
  const aiKey = taskSemanticKey(aiTask);
  return candidates.find((t) => taskSemanticKey(t) === aiKey);
}

/**
 * An unmatched previous task is preserved when the user has actively touched it:
 * completed, started work, or manually created it. Pure-AI todo/inbox tasks that
 * the new compile no longer generates are dropped.
 */
function shouldPreserveUnmatchedTask(task: Task): boolean {
  if (task.deletedAt) return false;
  if (task.source === "user") return true;
  return task.status === "done" || task.status === "in-progress" || task.status === "blocked";
}

// ─── per-entity merge functions ───────────────────────────────────────────────

function mergeEvidence(next: Evidence, previous?: Evidence): Evidence {
  return previous ? { ...next, reviewStatus: previous.reviewStatus } : next;
}

function findMatchingQuestion(question: Question, previous: Question[]) {
  const byId = previous.find((candidate) => candidate.id === question.id);
  if (byId) return byId;
  return previous
    .map((candidate) => ({
      candidate,
      score: similarity(question.question, candidate.question),
    }))
    .filter(({ score }) => score >= 0.72)
    .sort((a, b) => b.score - a.score)[0]?.candidate;
}

function mergeQuestion(
  next: Question,
  previous: Question | undefined,
  stats: MergeStats,
): Question {
  if (!previous) return next;
  const answer = previous.answer?.trim() ? previous.answer : next.answer;
  if (answer && answer === previous.answer) {
    stats.preservedAnsweredQuestions += 1;
  }
  return {
    ...next,
    evidence: mergeEvidence(next.evidence, previous.evidence),
    resolved: previous.resolved || Boolean(answer) || next.resolved,
    answer: answer ?? null,
    answeredAt: answer === previous.answer ? previous.answeredAt ?? null : next.answeredAt ?? null,
    answeredBy: answer === previous.answer ? previous.answeredBy ?? null : next.answeredBy ?? null,
  };
}

function mergeScreen(next: Screen, previous: Screen | undefined, stats: MergeStats): Screen {
  if (!previous) return next;
  stats.preservedScreenPositions += 1;
  return {
    ...next,
    position: previous.position,
    evidence: mergeEvidence(next.evidence, previous.evidence),
  };
}

function mergeTask(next: Task, previous: Task, stats: MergeStats): Task {
  if (previous.status === "done") {
    stats.preservedCompletedTasks += 1;
  } else {
    stats.preserved += 1;
  }
  return {
    ...next,
    id: previous.id,
    status: previous.status,
    source: previous.source,
    priority: previous.source === "user" ? previous.priority : next.priority,
    description: previous.description || next.description,
    dueDate: previous.dueDate ?? next.dueDate,
    blockerReason: previous.blockerReason ?? next.blockerReason,
    deletedAt: previous.deletedAt ?? next.deletedAt ?? null,
    evidence: mergeEvidence(next.evidence, previous.evidence),
  };
}

function mergeUxCopy(next: UxCopy, previous: UxCopy | undefined, stats: MergeStats): UxCopy {
  if (!previous) return next;
  if (previous.text !== next.text) stats.conflicts += 1;
  return {
    ...next,
    text: previous.text,
    toneRule: previous.toneRule,
    evidence: mergeEvidence(next.evidence, previous.evidence),
  };
}

// ─── brief field preservation ─────────────────────────────────────────────────

type BriefShape = SpecDocument["brief"];

function mergeBrief(previous: BriefShape, compiled: BriefShape): BriefShape {
  const userEditedFields = previous.userEditedFields ?? [];
  const merged: BriefShape = { ...compiled, userEditedFields };
  for (const field of userEditedFields) {
    const key = field as keyof BriefShape;
    if (key !== "userEditedFields" && key in previous) {
      (merged as Record<string, unknown>)[key] = previous[key];
    }
  }
  // Always preserve problem and successCriteria if user wrote them
  // (legacy: before userEditedFields was tracked)
  if (!userEditedFields.includes("problem") && previous.problem) {
    merged.problem = previous.problem;
  }
  if (!userEditedFields.includes("successCriteria") && previous.successCriteria.length > 0) {
    merged.successCriteria = previous.successCriteria;
  }
  return merged;
}

// ─── main merge ───────────────────────────────────────────────────────────────

export function mergeCompiledDocument(
  previous: SpecDocument | null,
  compiled: SpecDocument,
): MergeCompiledResult {
  if (!previous) {
    return {
      document: compiled,
      stats: {
        added: compiled.requirements.length + compiled.screens.length + compiled.tasks.length,
        proposedUpdates: 0,
        preserved: 0,
        conflicts: 0,
        deduplicated: 0,
        preservedCompletedTasks: 0,
        preservedAnsweredQuestions: 0,
        preservedScreenPositions: 0,
      },
    };
  }

  const stats: MergeStats = {
    added: 0,
    proposedUpdates: 0,
    preserved: 0,
    conflicts: 0,
    deduplicated: 0,
    preservedCompletedTasks: 0,
    preservedAnsweredQuestions: 0,
    preservedScreenPositions: 0,
  };

  const previousScreens = new Map(previous.screens.map((item) => [item.id, item]));
  const previousUxCopy = new Map(previous.uxCopy.map((item) => [item.id, item]));
  const previousStates = new Map(previous.states.map((item) => [item.id, item]));
  const previousRequirements = new Map(previous.requirements.map((item) => [item.id, item]));

  // ── questions ──
  const questions = compiled.questions.map((question) =>
    mergeQuestion(question, findMatchingQuestion(question, previous.questions), stats),
  );
  const matchedQuestionIds = new Set(questions.map((q) => q.id));
  const orphanedAnswers = previous.questions.filter(
    (q) => q.answer?.trim() && !matchedQuestionIds.has(q.id),
  );

  // ── tasks — semantic dedup ──
  const previousTasksList = previous.tasks;
  const matchedPreviousTaskIds = new Set<string>();

  const mergedAiTasks = compiled.tasks.map((aiTask) => {
    const candidates = previousTasksList.filter((t) => !matchedPreviousTaskIds.has(t.id));
    const match = findMatchingTask(aiTask, candidates);
    if (match) {
      matchedPreviousTaskIds.add(match.id);
      if (match.id !== aiTask.id) stats.deduplicated += 1;
      return mergeTask(aiTask, match, stats);
    }
    stats.added += 1;
    return aiTask;
  });

  // Preserve previous tasks the user has actively worked on but AI didn't regenerate
  const unmatchedPreservedTasks = previousTasksList.filter(
    (t) => !matchedPreviousTaskIds.has(t.id) && shouldPreserveUnmatchedTask(t),
  );
  for (const t of unmatchedPreservedTasks) {
    if (t.status === "done") stats.preservedCompletedTasks += 1;
    else stats.preserved += 1;
  }

  const allTasks = [...mergedAiTasks, ...unmatchedPreservedTasks].filter(
    (task, index, arr) => arr.findIndex((t) => t.id === task.id) === index,
  );

  return {
    document: {
      ...compiled,
      brief: mergeBrief(previous.brief, compiled.brief),
      suppressedTaskKeys: previous.suppressedTaskKeys ?? [],
      requirements: compiled.requirements.map((requirement) => {
        const prev = previousRequirements.get(requirement.id);
        return prev
          ? {
              ...requirement,
              content: prev.content,
              category: prev.category,
              evidence: mergeEvidence(requirement.evidence, prev.evidence),
            }
          : requirement;
      }),
      questions: [
        ...questions,
        ...orphanedAnswers.map((q) => ({
          ...q,
          resolved: q.resolved,
          context: `${q.context}\n\n새 정리 결과와 자동 매칭되지 않아 답변을 보존했어요.`,
        })),
      ],
      roles: compiled.roles.map((role) => ({
        ...role,
        evidence: mergeEvidence(
          role.evidence,
          previous.roles.find((r) => r.id === role.id)?.evidence,
        ),
      })),
      permissions: compiled.permissions.map((permission) => ({
        ...permission,
        evidence: mergeEvidence(
          permission.evidence,
          previous.permissions.find((p) => p.id === permission.id)?.evidence,
        ),
      })),
      screens: compiled.screens.map((screen) =>
        mergeScreen(screen, previousScreens.get(screen.id), stats),
      ),
      states: compiled.states.map((state) => {
        const previousState = previousStates.get(state.id);
        return previousState
          ? {
              ...state,
              position: previousState.position ?? state.position ?? null,
              evidence: mergeEvidence(state.evidence, previousState.evidence),
            }
          : state;
      }),
      uxCopy: compiled.uxCopy.map((copy) =>
        mergeUxCopy(copy, previousUxCopy.get(copy.id), stats),
      ),
      tasks: allTasks,
      figmaMapping: previous.figmaMapping,
    },
    stats,
  };
}
