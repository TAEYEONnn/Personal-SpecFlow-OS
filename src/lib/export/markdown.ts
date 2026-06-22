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

function activeTasks(document: SpecDocument) {
  return document.tasks.filter((task) => !task.deletedAt);
}

export type ExportTemplate = "full" | "screen-spec" | "qa-checklist" | "daily-report";

export function specDocumentToMarkdown(document: SpecDocument): string {
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
      (item) => `- ${item.context}: "${item.text}" — ${item.toneRule}`,
    ),
    "",
    "## 작업 목록",
    "",
    ...activeTasks(document).map(
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

export function screenSpecToMarkdown(document: SpecDocument): string {
  const lines = [
    `# ${document.brief.title} — 화면 정의서`,
    "",
    `> ${document.brief.purpose}`,
    "",
  ];

  for (const screen of document.screens) {
    const states = document.states.filter((s) => s.screenId === screen.id);
    const copy = document.uxCopy.filter((c) => c.screenId === screen.id);

    lines.push(`## ${screen.name}`, "");
    lines.push(screen.description, "");

    if (screen.entryConditions.length) {
      lines.push("**진입 조건**", "");
      screen.entryConditions.forEach((c) => lines.push(`- ${c}`));
      lines.push("");
    }

    if (screen.primaryActions.length) {
      lines.push("**주요 행동**", "");
      screen.primaryActions.forEach((a) => lines.push(`- ${a}`));
      lines.push("");
    }

    if (screen.requiredData.length) {
      lines.push("**필요한 데이터**", "");
      screen.requiredData.forEach((d) => lines.push(`- ${d}`));
      lines.push("");
    }

    lines.push(`**CTA:** ${screen.cta}`, "");

    if (states.length) {
      lines.push("**상태·예외**", "");
      states.forEach((s) => lines.push(`- **${s.name}** (${s.kind}): ${s.description}`));
      lines.push("");
    }

    if (copy.length) {
      lines.push("**UX 문구**", "");
      copy.forEach((c) => lines.push(`- ${c.context}: "${c.text}"`));
      lines.push("");
    }

    lines.push(`*근거: ${evidenceText(screen.evidence)}*`, "", "---", "");
  }

  return lines.join("\n");
}

export function qaChecklistToMarkdown(document: SpecDocument): string {
  const lines = [
    `# ${document.brief.title} — QA 체크리스트`,
    "",
    `생성일: ${new Date().toLocaleDateString("ko-KR")}`,
    "",
  ];

  for (const screen of document.screens) {
    lines.push(`## ${screen.name}`, "");
    screen.qaCriteria.forEach((c) => lines.push(`- [ ] ${c}`));

    const states = document.states.filter((s) => s.screenId === screen.id);
    if (states.length) {
      lines.push("", "**상태 검증**", "");
      states.forEach((s) =>
        lines.push(`- [ ] **${s.name}**: ${s.description}`),
      );
    }
    lines.push("");
  }

  if (document.questions.filter((q) => !q.resolved).length) {
    lines.push("## 미결 확인 질문", "");
    document.questions
      .filter((q) => !q.resolved)
      .forEach((q) =>
        lines.push(`- [ ] [${q.priority}] ${q.question}`),
      );
    lines.push("");
  }

  return lines.join("\n");
}

export function dailyReportToMarkdown(document: SpecDocument): string {
  const report = document.dailyReport;
  const tasks = activeTasks(document);
  const doneTasks = tasks.filter((t) => t.status === "done");
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress");

  const lines = [
    `# ${document.brief.title} — 일일보고`,
    "",
    `**날짜:** ${report.date}`,
    "",
    "## 요약",
    "",
    report.summary,
    "",
  ];

  if (report.completed.length) {
    lines.push("## 완료 항목", "");
    report.completed.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  if (doneTasks.length) {
    lines.push("## 완료된 작업", "");
    doneTasks.forEach((t) => lines.push(`- [x] ${t.title}`));
    lines.push("");
  }

  if (inProgressTasks.length) {
    lines.push("## 진행 중인 작업", "");
    inProgressTasks.forEach((t) => lines.push(`- [ ] ${t.title}`));
    lines.push("");
  }

  if (report.next.length) {
    lines.push("## 다음 계획", "");
    report.next.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  if (report.blockers.length) {
    lines.push("## 이슈·블로커", "");
    report.blockers.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  return lines.join("\n");
}

export function exportByTemplate(document: SpecDocument, template: ExportTemplate): string {
  switch (template) {
    case "screen-spec": return screenSpecToMarkdown(document);
    case "qa-checklist": return qaChecklistToMarkdown(document);
    case "daily-report": return dailyReportToMarkdown(document);
    default: return specDocumentToMarkdown(document);
  }
}

export const exportTemplateFileSuffix: Record<ExportTemplate, string> = {
  full: "",
  "screen-spec": "-화면정의서",
  "qa-checklist": "-QA체크리스트",
  "daily-report": "-일일보고",
};
