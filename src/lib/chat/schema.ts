import { z } from "zod";

export const createMessageSchema = z.object({
  teamId: z.string().min(1),
  content: z.string().trim().min(1).max(10_000),
});

export const updateMessageSchema = z.object({
  content: z.string().trim().min(1).max(10_000),
});

export const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
});
