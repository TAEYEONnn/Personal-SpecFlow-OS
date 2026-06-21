import type { Evidence, SpecDocument } from "@/lib/spec/schema";

const evidenceLabel: Record<Evidence["type"], string> = {
  original: "원문",
  inference: "추론",
  assumption: "가정",
};

function evidenceText(evidence: Evidence) {
  const rationale = evidence.rationale ? ` — ${evidence.rationale}` : "";
  return `[${evidenceLabel[evidence.type]}] ${evidence.sourceExcerpt}${rationale}`;
}

export function specDocumentToMarkdown(document: SpecDocument) {
  const lines = [
    `# ${document.brief.title}`,
    "",
    "## 프로젝트 브리프",
    "",
    document.brief.purpose,
    "",
    `- 문제: ${document.brief.problem}`,
    ...document.brief.successCriteria.map((item) => `- 성공 조건: ${item}`),
    "",
    "## 요구사항",
    "",
    ...document.requirements.flatMap((item) => [
      `### ${item.content}`,
      "",
      `- 분류: ${item.category}`,
      `- 근거: ${evidenceText(item.evidence)}`,
      "",
    ]),
    "## 확인 질문",
    "",
    ...document.questions.map(
      (item) =>
        `- **${item.question}** (${item.priority}) — ${evidenceText(item.evidence)}`,
    ),
    "",
    "## 화면 목록",
    "",
    ...document.screens.flatMap((screen) => [
      `### ${screen.name}`,
      "",
      screen.description,
      "",
      `- 진입 조건: ${screen.entryConditions.join(", ")}`,
      `- 주요 행동: ${screen.primaryActions.join(", ")}`,
      `- CTA: ${screen.cta}`,
      `- QA: ${screen.qaCriteria.join(", ")}`,
      `- 근거: ${evidenceText(screen.evidence)}`,
      "",
    ]),
    "## 역할·권한",
    "",
    ...document.permissions.map((item) => {
      const role = document.roles.find((candidate) => candidate.id === item.roleId);
      const value =
        item.allowed === null ? "확인 필요" : item.allowed ? "가능" : "불가";
      return `- ${role?.name ?? item.roleId} / ${item.capability}: ${value}`;
    }),
    "",
    "## 상태·예외",
    "",
    ...document.states.map(
      (item) => `- ${item.name} (${item.kind}): ${item.description}`,
    ),
    "",
    "## UX 문구",
    "",
    ...document.uxCopy.map(
      (item) => `- ${item.context}: “${item.text}” — ${item.toneRule}`,
    ),
    "",
    "## 작업 목록",
    "",
    ...document.tasks.map(
      (item) => `- [${item.status === "done" ? "x" : " "}] ${item.title}`,
    ),
    "",
    "## 일일보고",
    "",
    document.dailyReport.summary,
    "",
    ...document.dailyReport.completed.map((item) => `- 완료: ${item}`),
    ...document.dailyReport.next.map((item) => `- 다음: ${item}`),
    ...document.dailyReport.blockers.map((item) => `- 이슈: ${item}`),
    "",
  ];

  return lines.join("\n");
}
