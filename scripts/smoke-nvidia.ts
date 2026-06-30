/**
 * Manual smoke test for NVIDIA Build API.
 * Requires NVIDIA_API_KEY in environment. Never runs in CI.
 *
 * Usage: pnpm ai:smoke:nvidia
 */
import { loadEnvConfig } from "@next/env";
import { createNvidiaProvider } from "../src/lib/ai/providers/nvidia";
import { normalizeToSpecDocument } from "../src/lib/ai/provider";

loadEnvConfig(process.cwd());

const apiKey = process.env.NVIDIA_API_KEY?.trim();
if (!apiKey) {
  console.error("NVIDIA_API_KEY not set. Add it to .env.local and retry.");
  process.exit(1);
}

const SAMPLE_SOURCE = `
회의록: 사용자 로그인 화면 개선
- 이메일/비밀번호 로그인 지원
- 소셜 로그인(Google) 추가 검토
- 비밀번호 찾기 링크 필요
`.trim();

async function main() {
  console.log("NVIDIA smoke test starting...");
  console.log("Model:", process.env.NVIDIA_MODEL ?? "mistralai/mistral-medium-3.5-128b");

  const provider = createNvidiaProvider();

  const start = Date.now();
  const result = await provider.generateStructured({
    systemPrompt:
      "당신은 정확성과 추적 가능성을 최우선으로 하는 프로덕트 디자인 업무 컴파일러입니다.",
    userPrompt: SAMPLE_SOURCE,
  });

  const doc = normalizeToSpecDocument(result);
  const elapsed = Date.now() - start;

  console.log("Success in", elapsed, "ms");
  console.log("Brief title:", doc.brief.title);
  console.log("Screens:", doc.screens.length);
  console.log("Requirements:", doc.requirements.length);
  console.log("Tasks:", doc.tasks.length);
}

main().catch((err) => {
  console.error("Smoke test failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
