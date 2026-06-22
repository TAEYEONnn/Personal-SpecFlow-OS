# Testing Patterns

**Analysis Date:** 2026-06-22

## Test Framework

**Runner:**
- Vitest 4.x
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest built-in (`expect`) + `@testing-library/jest-dom` matchers (imported via `src/test/setup.ts`)

**Component Testing:**
- `@testing-library/react` 16.x — `render`, `screen`, `findBy*`, `queryBy*`
- `@testing-library/user-event` 14.x — for realistic user interactions

**E2E:**
- `@playwright/test` 1.61.x — configured separately, run via `npm run test:e2e`

**Run Commands:**
```bash
npm run test          # Run all unit/integration tests once (vitest run)
npm run test:watch    # Watch mode (vitest)
npm run test:e2e      # Playwright E2E tests
npm run typecheck     # Type-check without running tests (tsc --noEmit)
```

## Test File Organization

**Location:** Co-located alongside source files in the same directory

**Naming:**
- Unit/integration: `<name>.test.ts` or `<name>.test.tsx`
- Regression fixtures: `src/lib/ai/fixtures/compiler-regression.test.ts`

**Structure:**
```
src/
  components/
    auth/
      login-form.tsx
      login-form.test.tsx          # Component test
    workspace/
      document-view.tsx
      document-view.test.tsx       # Component test
      flow-canvas.tsx
      flow-canvas.test.ts          # Pure logic test (no JSX)
  lib/
    auth/
      rate-limit.ts
      rate-limit.test.ts           # Pure logic test
      messages.ts
      messages.test.ts             # Pure logic test
    ai/
      compiler.ts
      compiler.test.ts             # Unit test
      fixtures/
        compiler-regression.test.ts  # Regression suite
        sample-sources.ts            # Fixture data
    spec/
      spec-document.test.ts
    export/
      markdown.test.ts
  test/
    setup.ts                       # Global test setup
```

## Test Setup

**Global setup** (`src/test/setup.ts`):
```typescript
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);
```

**Vitest config** (`vitest.config.ts`):
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },   // @/ alias works in tests
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from "vitest";
import { functionUnderTest } from "@/lib/domain/module";

describe("functionUnderTest", () => {
  it("describes the specific behavior being tested", () => {
    // arrange
    // act
    // assert
  });
});
```

**Patterns:**
- `describe` groups by the function/component under test
- `it` describes the specific behavior in plain language (Korean or English)
- Korean test descriptions used for domain/business-logic regression suites
- English test descriptions used for technical/structural tests
- `beforeEach` used for state reset in stateful modules: `beforeEach(() => resetDemoStore())`
- No `afterAll`/`beforeAll` observed — prefer isolated tests

## Mocking

**Framework:** Vitest (`vi`)

**Next.js navigation mocking:**
```typescript
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
```

**Global `fetch` mocking:**
```typescript
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

vi.mocked(fetch).mockResolvedValue(
  new Response(JSON.stringify({ error: "..." }), {
    status: 401,
    headers: { "content-type": "application/json" },
  }),
);
```

**Callback prop mocking:**
```typescript
const onTaskCreate = vi.fn();
render(<DocumentView document={demoSpecDocument} onTaskCreate={onTaskCreate} />);
// later...
expect(onTaskCreate).toHaveBeenCalledWith(expect.objectContaining({ ... }));
```

**What to Mock:**
- `next/navigation` hooks (`useRouter`, `usePathname`) in component tests
- Global `fetch` when testing components that call APIs
- Callback props passed to components under test

**What NOT to Mock:**
- Pure utility functions — test them directly with real inputs
- Zod schemas — use real `.parse()` / `.safeParse()` calls
- In-memory stores (`demo-store`) — reset with `resetDemoStore()` instead of mocking

## Fixtures and Factories

**Shared demo document** (`src/lib/spec/demo-document.ts`):
- `demoSpecDocument` — a fully populated `SpecDocument` used across component and regression tests
- Import: `import { demoSpecDocument } from "@/lib/spec/demo-document"`

**Factory functions in test files:**
```typescript
// flow-canvas.test.ts — inline factory for Screen objects
function makeScreen(id: string, nextIds: string[] = []): Screen {
  return {
    id,
    name: id,
    description: "",
    entryConditions: [],
    primaryActions: [],
    requiredData: [],
    nextScreenIds: nextIds,
    cta: "",
    qaCriteria: [],
    evidence: { type: "original", reviewStatus: "confirmed", sourceId: "s1", sourceExcerpt: "x", rationale: null },
    position: { x: 0, y: 0 },
  };
}
```

**Regression sample fixtures** (`src/lib/ai/fixtures/`):
- `sample-sources.ts` — array of `{ name, text }` objects used by `compiler-regression.test.ts`
- Used for snapshot/regression testing of prompt generation across multiple inputs

**Location:**
- Shared fixtures: `src/lib/spec/demo-document.ts`, `src/lib/ai/fixtures/`
- Local factories: defined inline at the top of the test file that needs them

## Coverage

**Requirements:** Not enforced — no `coverage` threshold in `vitest.config.ts`

**View Coverage:**
```bash
npx vitest run --coverage    # (no dedicated npm script — invoke vitest directly)
```

## Test Types

**Unit Tests:**
- Pure functions in `src/lib/**` tested directly with no mocking
- Examples: `rate-limit.test.ts`, `messages.test.ts`, `username.test.ts`, `cost-estimate.test.ts`
- No external dependencies required

**Integration Tests:**
- Component tests with Testing Library render real component trees with mocked boundaries (fetch, next/navigation)
- Examples: `login-form.test.tsx`, `document-view.test.tsx`, `evidence-panel.test.tsx`

**Regression Tests:**
- Dedicated regression suite for prompt versioning: `src/lib/ai/fixtures/compiler-regression.test.ts`
- Asserts on `COMPILER_PROMPT_VERSION` constant to force intentional updates when prompts change
- Tests schema compliance of `demoSpecDocument` on every run

**E2E Tests:**
- Playwright (`@playwright/test`) — config not inspected; run via `npm run test:e2e`

## Common Patterns

**Async Testing (component interactions):**
```typescript
it("shows error after failed login", async () => {
  const user = userEvent.setup();
  vi.mocked(fetch).mockResolvedValue(new Response(...));
  render(<LoginForm />);
  await user.type(screen.getByLabelText("아이디"), "designer");
  await user.click(screen.getByRole("button", { name: "로그인" }));
  expect(await screen.findByText("...error text...")).toBeInTheDocument();
});
```

**Error/throw Testing:**
```typescript
it("throws when project does not exist", () => {
  expect(() => updateDemoSource("nonexistent", "any", { name: "x" })).toThrow();
});

it("does not throw for valid input", () => {
  expect(() => specDocumentSchema.parse(demoSpecDocument)).not.toThrow();
});
```

**Conditional prop testing (optional callbacks):**
```typescript
it("shows input when onTaskCreate provided", () => {
  render(<DocumentView document={doc} onTaskCreate={() => undefined} />);
  expect(screen.getByPlaceholderText("새 작업 추가…")).toBeInTheDocument();
});

it("hides input when onTaskCreate not provided", () => {
  render(<DocumentView document={doc} />);
  expect(screen.queryByPlaceholderText("새 작업 추가…")).not.toBeInTheDocument();
});
```

**Boundary/quantity assertions:**
```typescript
expect(demoSpecDocument.screens.length).toBeGreaterThanOrEqual(1);
expect(result["a"].x).toBeLessThan(result["b"].x);
expect(prompt.length).toBeLessThan(8000);
```

---

*Testing analysis: 2026-06-22*
