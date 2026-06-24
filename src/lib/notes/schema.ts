import { z } from "zod";

const nullableId = z.string().min(1).nullable().optional();

export const createNoteSchema = z
  .object({
    title: z.string().trim().max(200).nullable().optional(),
    content: z.string().max(100_000).default(""),
    kind: z.enum(["note", "scratch"]),
    visibility: z.enum(["personal", "team"]),
    teamId: nullableId,
    projectId: nullableId,
    pinned: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.visibility === "team" && !value.teamId) {
      context.addIssue({
        code: "custom",
        path: ["teamId"],
        message: "공유 메모에는 팀이 필요합니다.",
      });
    }
  });

export const updateNoteSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  content: z.string().max(100_000).optional(),
  visibility: z.enum(["personal", "team"]).optional(),
  teamId: nullableId,
  projectId: nullableId,
  pinned: z.boolean().optional(),
});

export const convertScratchSchema = z.object({
  target: z.enum(["note", "task"]),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
