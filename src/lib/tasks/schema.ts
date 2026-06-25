import { z } from "zod";

const nullableId = z.string().min(1).nullable().optional();

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000).optional(),
    status: z.enum(["todo", "inProgress", "done"]).default("todo"),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    dueDate: z.string().datetime().nullable().optional(),
    isPersonal: z.boolean(),
    teamId: nullableId,
    projectId: nullableId,
    assigneeId: nullableId,
  })
  .superRefine((value, context) => {
    if (!value.isPersonal && !value.teamId) {
      context.addIssue({
        code: "custom",
        path: ["teamId"],
        message: "팀 할 일에는 팀이 필요해요.",
      });
    }
  });

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["todo", "inProgress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  projectId: nullableId,
  assigneeId: nullableId,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
