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
  position: z.object({ x: z.number(), y: z.number() }).nullable().catch(null),
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
  status: z.enum(["inbox", "todo", "in-progress", "blocked", "done"]).catch("todo"),
  priority: z.enum(["high", "medium", "low"]),
  relatedIds: z.array(z.string()),
  evidence: evidenceSchema,
  source: z.enum(["ai", "user"]).catch("ai"),
  description: z.string().catch(""),
  dueDate: z.string().nullable().catch(null),
  blockerReason: z.string().nullable().catch(null),
  relatedScreenIds: z.array(z.string()).catch([]),
  relatedRequirementIds: z.array(z.string()).catch([]),
  deletedAt: z.string().nullable().catch(null),
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
type ParsedSpecDocument = z.infer<typeof specDocumentSchema>;
type ParsedTask = ParsedSpecDocument["tasks"][number];
type ParsedState = ParsedSpecDocument["states"][number];

export type Evidence = z.infer<typeof evidenceSchema>;
export type SpecDocument = Omit<ParsedSpecDocument, "states" | "tasks"> & {
  states: Array<
    Omit<ParsedState, "position"> & {
      position?: { x: number; y: number } | null;
    }
  >;
  tasks: Array<Omit<ParsedTask, "deletedAt"> & { deletedAt?: string | null }>;
};
export type Screen = SpecDocument["screens"][number];
export type ScreenState = SpecDocument["states"][number];
export type Requirement = SpecDocument["requirements"][number];
export type Question = SpecDocument["questions"][number];
export type Role = SpecDocument["roles"][number];
export type Permission = SpecDocument["permissions"][number];
export type Task = SpecDocument["tasks"][number];
export type UxCopy = SpecDocument["uxCopy"][number];
