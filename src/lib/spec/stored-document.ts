import type { SpecDocument } from "@/lib/spec/schema";
import { specDocumentSchema } from "@/lib/spec/schema";

export function parseStoredSpecDocument(
  value: unknown,
  projectId: string,
): SpecDocument {
  const parsed = specDocumentSchema.safeParse(value);
  if (parsed.success) return parsed.data;

  const details = parsed.error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "document"}: ${issue.message}`)
    .join("; ");
  throw new Error(
    `저장된 프로젝트 문서 형식이 올바르지 않습니다 (${projectId}): ${details}`,
  );
}
