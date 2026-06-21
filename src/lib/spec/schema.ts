import { z } from "zod";

export const evidenceSchema = z.object({
  type: z.enum(["original", "inference", "assumption"]),
  reviewStatus: z.enum(["confirmed", "needs-review", "conflict"]),
  sourceId: z.string().min(1),
  sourceExcerpt: z.string().min(1),
  rationale: z.string().nullable(),
});

const requirementSchema = z.object({
  id: z.string(),
  content: z.string(),
  category: z.string(),
  evidence: evidenceSchema,
  affectedScreenIds: z.array(z.string()),
});

const questionSchema = z.object({
  id: z.string(),
  question: z.string(),
  priority: z.enum(["blocking", "should-decide", "assumable"]),
  context: z.string(),
  evidence: evidenceSchema,
  resolved: z.boolean(),
});

const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  evidence: evidenceSchema,
});

const permissionSchema = z.object({
  id: z.string(),
  roleId: z.string(),
  capability: z.string(),
  allowed: z.boolean().nullable(),
  note: z.string(),
  evidence: evidenceSchema,
});

const screenSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  entryConditions: z.array(z.string()),
  primaryActions: z.array(z.string()),
  requiredData: z.array(z.string()),
  nextScreenIds: z.array(z.string()),
  cta: z.string(),
  qaCriteria: z.array(z.string()),
  evidence: evidenceSchema,
  position: z.object({ x: z.number(), y: z.number() }),
});

const screenStateSchema = z.object({
  id: z.string(),
  screenId: z.string(),
  name: z.string(),
  kind: z.enum([
    "default",
    "loading",
    "empty",
    "error",
    "disabled",
    "permission-denied",
    "network-failure",
    "timeout",
    "validation-error",
    "partial-completion",
    "duplicate-action",
    "session-expiration",
    "unsaved-changes",
  ]),
  description: z.string(),
  evidence: evidenceSchema,
});

const uxCopySchema = z.object({
  id: z.string(),
  screenId: z.string(),
  context: z.string(),
  text: z.string(),
  toneRule: z.string(),
  evidence: evidenceSchema,
});

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "in-progress", "done"]),
  priority: z.enum(["high", "medium", "low"]),
  relatedIds: z.array(z.string()),
  evidence: evidenceSchema,
});

export const specDocumentSchema = z.object({
  brief: z.object({
    title: z.string(),
    purpose: z.string(),
    problem: z.string(),
    successCriteria: z.array(z.string()),
    audience: z.array(z.string()),
    scope: z.array(z.string()),
    outOfScope: z.array(z.string()),
    constraints: z.array(z.string()),
  }),
  requirements: z.array(requirementSchema),
  questions: z.array(questionSchema),
  roles: z.array(roleSchema),
  permissions: z.array(permissionSchema),
  screens: z.array(screenSchema),
  states: z.array(screenStateSchema),
  uxCopy: z.array(uxCopySchema),
  tasks: z.array(taskSchema),
  dailyReport: z.object({
    date: z.string(),
    summary: z.string(),
    completed: z.array(z.string()),
    next: z.array(z.string()),
    blockers: z.array(z.string()),
  }),
});

export const analysisSchema = z.object({
  requirements: z.array(requirementSchema),
});
export type Evidence = z.infer<typeof evidenceSchema>;
export type SpecDocument = z.infer<typeof specDocumentSchema>;
export type Screen = SpecDocument["screens"][number];
export type ScreenState = SpecDocument["states"][number];
