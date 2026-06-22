import type { Evidence, Question, Screen, SpecDocument, Task, UxCopy } from "@/lib/spec/schema";

type MergeStats = {
  added: number;
  proposedUpdates: number;
  preserved: number;
  conflicts: number;
};

export type MergeCompiledResult = {
  document: SpecDocument;
  stats: MergeStats;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
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

function mergeEvidence(next: Evidence, previous?: Evidence) {
  return previous
    ? { ...next, reviewStatus: previous.reviewStatus }
    : next;
}

function mergeQuestion(next: Question, previous: Question | undefined, stats: MergeStats): Question {
  if (!previous) return next;
  const answer = previous.answer?.trim() ? previous.answer : next.answer;
  if (answer && answer === previous.answer) stats.preserved += 1;
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
  stats.preserved += 1;
  return {
    ...next,
    position: previous.position,
    evidence: mergeEvidence(next.evidence, previous.evidence),
  };
}

function mergeTask(next: Task, previous: Task | undefined, stats: MergeStats): Task {
  if (!previous) return next;
  stats.preserved += 1;
  return {
    ...next,
    status: previous.status,
    priority: previous.priority,
    description: previous.description ?? next.description,
    dueDate: previous.dueDate ?? next.dueDate,
    blockerReason: previous.blockerReason ?? next.blockerReason,
    source: previous.source ?? next.source,
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
      },
    };
  }

  const stats: MergeStats = {
    added: 0,
    proposedUpdates: 0,
    preserved: 0,
    conflicts: 0,
  };

  const previousScreens = new Map(previous.screens.map((item) => [item.id, item]));
  const previousTasks = new Map(previous.tasks.map((item) => [item.id, item]));
  const previousUxCopy = new Map(previous.uxCopy.map((item) => [item.id, item]));
  const previousStates = new Map(previous.states.map((item) => [item.id, item]));
  const previousRequirements = new Map(previous.requirements.map((item) => [item.id, item]));

  const questions = compiled.questions.map((question) =>
    mergeQuestion(question, findMatchingQuestion(question, previous.questions), stats),
  );
  const matchedQuestionIds = new Set(questions.map((question) => question.id));
  const orphanedAnswers = previous.questions.filter(
    (question) => question.answer?.trim() && !matchedQuestionIds.has(question.id),
  );

  return {
    document: {
      ...compiled,
      requirements: compiled.requirements.map((requirement) => {
        const previousRequirement = previousRequirements.get(requirement.id);
        return previousRequirement
          ? {
              ...requirement,
              content: previousRequirement.content,
              category: previousRequirement.category,
              evidence: mergeEvidence(requirement.evidence, previousRequirement.evidence),
            }
          : requirement;
      }),
      questions: [
        ...questions,
        ...orphanedAnswers.map((question) => ({
          ...question,
          resolved: question.resolved,
          context: `${question.context}\n\n새 정리 결과와 자동 매칭되지 않아 답변을 보존했어요.`,
        })),
      ],
      roles: compiled.roles.map((role) => ({
        ...role,
        evidence: mergeEvidence(
          role.evidence,
          previous.roles.find((candidate) => candidate.id === role.id)?.evidence,
        ),
      })),
      permissions: compiled.permissions.map((permission) => ({
        ...permission,
        evidence: mergeEvidence(
          permission.evidence,
          previous.permissions.find((candidate) => candidate.id === permission.id)?.evidence,
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
      tasks: [
        ...compiled.tasks.map((task) =>
          mergeTask(task, previousTasks.get(task.id), stats),
        ),
        ...previous.tasks.filter((task) => task.source === "user"),
      ].filter(
        (task, index, tasks) =>
          tasks.findIndex((candidate) => candidate.id === task.id) === index,
      ),
      figmaMapping: previous.figmaMapping,
    },
    stats,
  };
}
