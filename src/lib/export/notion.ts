import type { SpecDocument } from "@/lib/spec/schema";

export type NotionRichText = {
  type: "text";
  text: { content: string; link?: { url: string } };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
  };
};

export type NotionBlock =
  | { object: "block"; type: "heading_1"; heading_1: { rich_text: NotionRichText[] } }
  | { object: "block"; type: "heading_2"; heading_2: { rich_text: NotionRichText[] } }
  | { object: "block"; type: "heading_3"; heading_3: { rich_text: NotionRichText[] } }
  | { object: "block"; type: "paragraph"; paragraph: { rich_text: NotionRichText[] } }
  | { object: "block"; type: "bulleted_list_item"; bulleted_list_item: { rich_text: NotionRichText[] } }
  | { object: "block"; type: "to_do"; to_do: { rich_text: NotionRichText[]; checked: boolean } }
  | { object: "block"; type: "divider"; divider: Record<string, never> };

function text(content: string, bold?: boolean, italic?: boolean): NotionRichText {
  return {
    type: "text",
    text: { content },
    annotations: bold || italic ? { bold, italic } : undefined,
  };
}

function h1(content: string): NotionBlock {
  return { object: "block", type: "heading_1", heading_1: { rich_text: [text(content)] } };
}

function h2(content: string): NotionBlock {
  return { object: "block", type: "heading_2", heading_2: { rich_text: [text(content)] } };
}

function h3(content: string): NotionBlock {
  return { object: "block", type: "heading_3", heading_3: { rich_text: [text(content)] } };
}

function para(content: string): NotionBlock {
  return { object: "block", type: "paragraph", paragraph: { rich_text: [text(content)] } };
}

function bullet(content: string): NotionBlock {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: [text(content)] },
  };
}

function todo(content: string, checked: boolean): NotionBlock {
  return {
    object: "block",
    type: "to_do",
    to_do: { rich_text: [text(content)], checked },
  };
}

const divider: NotionBlock = { object: "block", type: "divider", divider: {} };

const evidenceLabel: Record<string, string> = {
  original: "원문",
  inference: "추론",
  assumption: "가정",
};

function evidenceSuffix(evidence: { type: string; sourceExcerpt: string }): string {
  return ` [${evidenceLabel[evidence.type] ?? evidence.type}] ${evidence.sourceExcerpt}`;
}

export function specDocumentToNotionBlocks(document: SpecDocument): NotionBlock[] {
  const blocks: NotionBlock[] = [];

  blocks.push(h1(document.brief.title));
  blocks.push(para(document.brief.purpose));
  blocks.push(bullet(`문제: ${document.brief.problem}`));
  document.brief.successCriteria.forEach((c) => blocks.push(bullet(`성공 조건: ${c}`)));
  blocks.push(divider);

  blocks.push(h2("요구사항"));
  document.requirements.forEach((req) => {
    blocks.push(h3(req.content));
    blocks.push(bullet(`분류: ${req.category}`));
    blocks.push(bullet(`근거: ${evidenceSuffix(req.evidence)}`));
  });
  blocks.push(divider);

  blocks.push(h2("확인 질문"));
  document.questions.forEach((q) => {
    const prefix = q.resolved ? "[완료] " : `[${q.priority}] `;
    blocks.push(bullet(`${prefix}${q.question}${evidenceSuffix(q.evidence)}`));
  });
  blocks.push(divider);

  blocks.push(h2("화면 목록"));
  document.screens.forEach((screen) => {
    blocks.push(h3(screen.name));
    blocks.push(para(screen.description));
    blocks.push(bullet(`CTA: ${screen.cta}`));
    if (screen.entryConditions.length) {
      blocks.push(bullet(`진입 조건: ${screen.entryConditions.join(", ")}`));
    }
    if (screen.primaryActions.length) {
      blocks.push(bullet(`주요 행동: ${screen.primaryActions.join(", ")}`));
    }
    screen.qaCriteria.forEach((c) => blocks.push(todo(c, false)));

    const states = document.states.filter((s) => s.screenId === screen.id);
    states.forEach((s) => blocks.push(bullet(`${s.name} (${s.kind}): ${s.description}`)));

    const copy = document.uxCopy.filter((c) => c.screenId === screen.id);
    copy.forEach((c) => blocks.push(bullet(`UX: ${c.context} — "${c.text}"`)));

    blocks.push(bullet(`근거: ${evidenceSuffix(screen.evidence)}`));
  });
  blocks.push(divider);

  blocks.push(h2("작업 목록"));
  document.tasks
    .filter((task) => !task.deletedAt)
    .forEach((task) => blocks.push(todo(task.title, task.status === "done")));
  blocks.push(divider);

  blocks.push(h2("일일보고"));
  blocks.push(para(document.dailyReport.summary));
  document.dailyReport.completed.forEach((item) => blocks.push(bullet(`완료: ${item}`)));
  document.dailyReport.next.forEach((item) => blocks.push(bullet(`다음: ${item}`)));
  document.dailyReport.blockers.forEach((item) => blocks.push(bullet(`이슈: ${item}`)));

  return blocks;
}

export type NotionCreatePageParams = {
  parentPageId: string;
  title: string;
  blocks: NotionBlock[];
  token: string;
};

const NOTION_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28",
});

async function notionFetch(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Notion API 오류 (${response.status}): ${(error as { message?: string }).message ?? response.statusText}`,
    );
  }
  return response.json();
}

async function appendNotionBlocks(pageId: string, blocks: NotionBlock[], token: string) {
  await notionFetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
    method: "PATCH",
    headers: NOTION_HEADERS(token),
    body: JSON.stringify({ children: blocks }),
  });
}

export async function createNotionPage(params: NotionCreatePageParams): Promise<{ pageId: string; url: string }> {
  // Notion API limit: max 100 children per request
  const BATCH = 100;
  const firstBatch = params.blocks.slice(0, BATCH);

  const data = (await notionFetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(params.token),
    body: JSON.stringify({
      parent: { type: "page_id", page_id: params.parentPageId },
      properties: {
        title: {
          title: [{ type: "text", text: { content: params.title } }],
        },
      },
      children: firstBatch,
    }),
  })) as { id: string; url: string };

  // Append remaining blocks in batches
  for (let i = BATCH; i < params.blocks.length; i += BATCH) {
    await appendNotionBlocks(data.id, params.blocks.slice(i, i + BATCH), params.token);
  }

  return { pageId: data.id, url: data.url };
}
