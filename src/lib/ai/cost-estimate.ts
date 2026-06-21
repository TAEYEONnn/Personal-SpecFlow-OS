/**
 * Token and cost estimation for compilation.
 * Token counts are approximate (4 chars ≈ 1 token heuristic).
 * Prices are per 1M tokens as of 2026-06.
 */

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.5": { input: 75.0, output: 150.0 },
  "gpt-5.4": { input: 30.0, output: 60.0 },
  "o3": { input: 10.0, output: 40.0 },
  "o4-mini": { input: 1.1, output: 4.4 },
};

const DEFAULT_PRICING = { input: 10.0, output: 40.0 };

export type CostEstimate = {
  inputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  model: string;
  chunkCount: number;
  warningThreshold: boolean;
};

const CHARS_PER_TOKEN = 4;
const OUTPUT_TOKEN_MULTIPLIER = 3;
const CHUNK_SIZE_CHARS = 80_000;
const WARNING_COST_USD = 0.5;

/**
 * Returns approximate token count for a string.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Splits long source text into chunks that fit within context windows.
 * Each chunk will be compiled independently if text exceeds CHUNK_SIZE_CHARS.
 */
export function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_SIZE_CHARS) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + CHUNK_SIZE_CHARS;
    // Try to split on paragraph boundary
    const boundary = text.lastIndexOf("\n\n", end);
    const splitAt = boundary > start ? boundary : end;
    chunks.push(text.slice(start, splitAt).trim());
    start = splitAt;
    // Skip leading whitespace
    while (start < text.length && text[start] === "\n") start++;
  }

  return chunks.filter(Boolean);
}

/**
 * Estimates the cost of compiling a source text.
 */
export function estimateCompilationCost(
  sourceText: string,
  model = "gpt-5.4",
): CostEstimate {
  const chunks = splitIntoChunks(sourceText);
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const chunk of chunks) {
    const inputTokens = estimateTokens(chunk);
    const outputTokens = Math.ceil(inputTokens * OUTPUT_TOKEN_MULTIPLIER);
    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
  }

  const inputCost = (totalInputTokens / 1_000_000) * pricing.input;
  const outputCost = (totalOutputTokens / 1_000_000) * pricing.output;
  const estimatedCostUsd = inputCost + outputCost;

  return {
    inputTokens: totalInputTokens,
    estimatedOutputTokens: totalOutputTokens,
    estimatedCostUsd,
    model,
    chunkCount: chunks.length,
    warningThreshold: estimatedCostUsd >= WARNING_COST_USD,
  };
}

export function formatCostEstimate(estimate: CostEstimate): string {
  const cost =
    estimate.estimatedCostUsd < 0.01
      ? "< $0.01"
      : `$${estimate.estimatedCostUsd.toFixed(3)}`;
  const chunks =
    estimate.chunkCount > 1 ? ` (${estimate.chunkCount}개 청크)` : "";
  return `약 ${estimate.inputTokens.toLocaleString()} 토큰 · 예상 비용 ${cost}${chunks}`;
}
