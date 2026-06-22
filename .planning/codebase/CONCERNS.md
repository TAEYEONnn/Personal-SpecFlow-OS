# Codebase Concerns

**Analysis Date:** 2026-06-22

## Tech Debt

**Demo store uses globalThis as mutable in-memory state:**
- Issue: `src/lib/projects/demo-store.ts` attaches `__specflowDemoProjects` to `globalThis` using `global.__specflowDemoProjects ??= new Map()`. In serverless or multi-instance deployments the store resets per cold start and is not shared across instances.
- Files: `src/lib/projects/demo-store.ts` (lines 36–44)
- Impact: Demo sessions lose data between serverless invocations; incompatible with edge runtime or horizontal scaling.
- Fix approach: Replace with Redis, Upstash KV, or Vercel KV for serverless-safe transient storage.

**PDF extraction is a regex-based homebrew parser:**
- Issue: `src/lib/sources/pdf-extract.ts` splits on `/Type\s*\/Page\b` and extracts text via BT/ET regex. The file's own JSDoc says "For production, replace with a proper parser like pdfjs-dist."
- Files: `src/lib/sources/pdf-extract.ts` (lines 1–100)
- Impact: Scanned/image PDFs return empty strings; complex layouts (multi-column, embedded fonts, CJK glyph encoding) produce garbled or missing text. Silent failures—users see a "no text found" error without diagnosis.
- Fix approach: Replace with `pdfjs-dist` (Node worker) or a server-side extraction service.

**Multi-chunk merge strategy loses `brief` and `dailyReport` from non-primary chunks:**
- Issue: `src/lib/ai/compiler.ts` `mergeSpecDocuments()` only takes `base.brief` and `base.dailyReport` from the first chunk result; subsequent chunks' brief/dailyReport are silently discarded.
- Files: `src/lib/ai/compiler.ts` (lines 182–204)
- Impact: Documents with large sources (>80 000 chars) will have an incomplete `brief` and no `dailyReport` from content in later chunks.
- Fix approach: Compile a "merge pass" prompt that synthesises briefs and daily reports, or restrict the multi-chunk path to arrays (requirements, screens, etc.) only.

**`getCompilationRun` re-fetches entire project to find one run:**
- Issue: `src/lib/projects/service.ts` `getCompilationRun()` calls `getProject()` which runs three parallel Supabase queries, then filters `project.runs` in memory. The run limit is hard-coded to 20 in `getProject`.
- Files: `src/lib/projects/service.ts` (lines 322–325)
- Impact: A single run lookup costs the same as loading the full project dashboard. If the requested run is older than revision 20 it returns `null`.
- Fix approach: Add a direct `compilation_runs` query by `id` and `project_id`.

**`apiError` uses string-matching on Korean error messages:**
- Issue: `src/lib/api/response.ts` checks `message.includes("찾을 수 없습니다")` and `message.includes("revision_conflict")` to map errors to HTTP status codes. Korean string matching is fragile and breaks silently if any error message is rephrased.
- Files: `src/lib/api/response.ts` (lines 30–43)
- Impact: Renamed messages return 500 instead of the correct 4xx. The comment "Legacy string-code compatibility … not yet migrated" acknowledges this.
- Fix approach: Migrate all service layer throws to use `AppError` with typed `AppErrorCode`; remove string-matching fallbacks.

**`eslint-disable react-hooks/exhaustive-deps` suppresses real stale-closure bugs:**
- Issue: `src/components/workspace/workspace-shell.tsx` suppresses the exhaustive-deps rule at lines 170 and 295 (`saveDocument` and `recompile` callbacks). Both deliberately omit dependencies to avoid infinite loops, but this masks that `doSave` and `recompile` capture stale `revision`/`document` state when called from keyboard shortcut handlers.
- Files: `src/components/workspace/workspace-shell.tsx` (lines 168–171, 276–296)
- Impact: Ctrl+S or keyboard-triggered recompile may use stale `revision` value, causing a revision conflict or overwriting a newer save.
- Fix approach: Use `useRef` to keep a stable reference to the latest `revision` and `document`, then read from the ref inside the callback.

## Known Bugs

**Rapid-fire inline saves on every micro-edit:**
- Symptoms: Any single-field edit (task update, UX copy change, node drag, question toggle, auto-layout) immediately calls `doSave()` without debounce. Multiple edits within the 3-second note auto-clear window can issue concurrent PATCH requests.
- Files: `src/components/workspace/workspace-shell.tsx` (lines 181–233)
- Trigger: Toggle a question resolved state while dragging a node.
- Workaround: None currently. The server's optimistic-concurrency `save_project_document` RPC will reject concurrent saves with a revision conflict, surfacing an error to the user.

**Notion export ignores Notion's 2000-char rich-text limit:**
- Symptoms: `specDocumentToNotionBlocks()` places full field text into single `rich_text` array items. Notion rejects items with content >2000 chars with a 400 error, which surfaces as a generic export failure.
- Files: `src/lib/export/notion.ts`
- Trigger: Exporting a project with long requirement descriptions or screen descriptions.
- Workaround: Manually shorten fields before export.

**Figma recommender fires one OpenAI call per screen in parallel with no concurrency limit:**
- Symptoms: `recommendFigmaComponents()` uses `Promise.all(screens.map(...))` with no throttling. A project with 20+ screens fires 20+ simultaneous API requests.
- Files: `src/lib/figma/recommend.ts` (line 67)
- Trigger: POST `/api/projects/[projectId]/figma` on a project with many screens.
- Workaround: None. OpenAI rate limits will cause some calls to fail; errors are not caught per-screen—a single failure rejects the entire array.

## Security Considerations

**Demo login credentials are hardcoded:**
- Risk: `src/app/api/auth/login/route.ts` accepts `username === "designer"` and `password === "specflow"` in development-demo mode. If `isDevelopmentDemo` resolves to `true` in a staging environment (missing Supabase env vars), the backdoor is open.
- Files: `src/app/api/auth/login/route.ts` (lines 34–47), `src/lib/env.ts` (lines 3–6)
- Current mitigation: `isDevelopmentDemo` requires `NODE_ENV !== "production"` AND absent Supabase env vars. A misconfigured staging environment satisfies both conditions.
- Recommendations: Add an explicit `DEMO_MODE=true` flag rather than inferring from absent env vars; log a loud warning on startup when demo mode is active.

**Notion OAuth `returnTo` validation is only applied in the callback, not in the initial redirect:**
- Risk: `/api/notion/oauth` accepts any `returnTo` query param and encodes it into `state` without validation. A phishing link can set `returnTo` to a misleading path that is rendered after successful OAuth.
- Files: `src/app/api/notion/oauth/route.ts` (lines 13–16), `src/app/api/notion/callback/route.ts` (lines 13–23)
- Current mitigation: The callback validates the decoded `returnTo` blocks `//` and non-`/` prefixes, then uses `new URL(returnTo, url.origin)` to force same-origin.
- Recommendations: Validate `returnTo` in the OAuth initiation route too, before encoding into state.

**Notion access token stored as plain cookie for 30 days:**
- Risk: `src/app/api/notion/callback/route.ts` stores the full Notion access token in a cookie with `maxAge: 60 * 60 * 24 * 30`. The cookie is `httpOnly` but is sent on every request to `/api/`.
- Files: `src/app/api/notion/callback/route.ts` (lines 55–63)
- Current mitigation: `httpOnly`, `sameSite: lax`.
- Recommendations: Scope the cookie to the `/api/projects/` path; shorten TTL; consider server-side token storage keyed to the user session.

**`login_attempts` table has no RLS policy:**
- Risk: `supabase/migrations/202606210001_initial.sql` enables RLS on `login_attempts` but defines no policy. The table is accessed only via `createAdminClient()` (service role key), so data is not leaked, but any accidental direct client access would find all rows blocked rather than protected by user-scoped policy.
- Files: `supabase/migrations/202606210001_initial.sql`
- Current mitigation: Service role bypass.
- Recommendations: Add an explicit deny-all policy or a policy that allows only service role operations for clarity.

## Performance Bottlenecks

**`compileSpecDocument` has no timeout — Vercel functions default to 10s:**
- Problem: The OpenAI `client.responses.parse()` call in `src/lib/ai/compiler.ts` has no configured timeout. Large documents may take 30–60s; Vercel Hobby/Pro default function timeout is 10s/60s respectively.
- Files: `src/lib/ai/compiler.ts` (lines 149–175), `src/app/api/projects/[projectId]/compile/route.ts`
- Cause: No `maxDuration` export in the route; no `timeout` in the OpenAI client options.
- Improvement path: Add `export const maxDuration = 300` to the compile route; set `timeout` on the OpenAI client; implement streaming or polling for long compilations.

**Multi-chunk compilation scales linearly per chunk with full source reload:**
- Problem: `splitIntoChunks` in `src/lib/ai/cost-estimate.ts` uses a fixed 80 000 char limit, but `compileSpecDocument` calls `getProject()` first (3 Supabase queries) and then runs chunks in `Promise.all`. A 5-chunk document costs 5× the AI call cost with no cross-chunk context sharing.
- Files: `src/lib/ai/compiler.ts` (lines 139–146), `src/lib/ai/cost-estimate.ts`
- Cause: Naïve token-level splitting with no document-aware segmentation.
- Improvement path: Summarise earlier chunks and pass the summary as context to later chunks; or use a single large-context model call.

## Fragile Areas

**`workspace-shell.tsx` (677 lines) — monolithic client component:**
- Files: `src/components/workspace/workspace-shell.tsx`
- Why fragile: 677-line file manages 16 `useState` calls, 4 `useEffect` hooks, 2 suppressed exhaustive-deps rules, all save logic, recompile logic, Notion OAuth dialog, project rename, canvas resize, keyboard shortcuts, and nav rendering. Any change to save behaviour, nav items, or layout risks regressions in other areas.
- Safe modification: Add tests before extracting sub-components; keep state in a dedicated `useWorkspace` custom hook; extract save/recompile logic first.
- Test coverage: No unit tests for this component; the `document-view.test.tsx` and `screen-detail.test.tsx` files test child components only.

**`demo-store.ts` is not concurrency-safe:**
- Files: `src/lib/projects/demo-store.ts`
- Why fragile: Mutations like `addDemoSource`, `saveDemoDocument`, and `finishDemoRun` read-then-write the in-memory Map without locks. In a multi-request Node.js process (Next.js dev mode), two concurrent compile requests for the same demo project can corrupt `runs` or `revision`.
- Safe modification: Use a per-project async mutex or accept the limitation as demo-only.
- Test coverage: `demo-store.test.ts` covers basic CRUD but has no concurrent-mutation tests.

**`mergeSpecDocuments` uses unsafe type casts:**
- Files: `src/lib/ai/compiler.ts` (lines 182–204)
- Why fragile: `concat()` returns `{ id: string }[]` and is cast to `SpecDocument["requirements"]` etc. via `as`. If the Zod schema adds non-`id` required fields the cast hides the mismatch.
- Safe modification: Use typed per-array merge helpers rather than the generic `concat` with forced casts.
- Test coverage: `compiler-regression.test.ts` tests merge via the public API but does not assert individual array element shapes.

## Scaling Limits

**`project_documents` grows unbounded:**
- Current capacity: No pruning policy; every `save_project_document` call inserts a new row. `listDocumentRevisions` hard-caps display at 20 but all rows remain in the table.
- Limit: Row count grows with every save; `document` column is `jsonb` (can be 100KB–500KB per row for large projects).
- Scaling path: Add a background job or trigger to archive/delete revisions older than N; store document JSON in Supabase Storage (object store) and keep only a reference in the DB.

**`compilation_runs.output` stores full SpecDocument JSON:**
- Current capacity: Each finished run stores the full compiled `SpecDocument` in the `output jsonb` column of `compilation_runs`.
- Limit: Redundant with `project_documents`; a project with 50 runs retains 50 full document snapshots in a single table.
- Scaling path: Remove `output` from `compilation_runs` or make it nullable and only populated on failure for debugging; `project_documents` already holds the authoritative document.

## Dependencies at Risk

**`openai` SDK uses `client.responses.parse()` — non-standard Responses API:**
- Risk: `src/lib/ai/compiler.ts` and `src/lib/figma/recommend.ts` use `client.responses.parse()` with `zodTextFormat`, which is part of the OpenAI Responses API introduced in `openai@6.x`. This API path (`/v1/responses`) is distinct from Chat Completions (`/v1/chat/completions`) and is documented as a newer, separate endpoint. Reverting to `openai@5.x` or switching models that don't support the Responses API will break compilation entirely.
- Impact: Compiler and Figma recommender both break; no fallback to Chat Completions.
- Migration plan: Abstract the API call behind a `callStructuredAI()` helper so the underlying API can be swapped without changing compiler/recommender logic.

**`@xyflow/react@^12` — major version with breaking API from v11:**
- Risk: `src/components/workspace/flow-canvas.tsx` uses `@xyflow/react` v12 patterns (hooks, `useReactFlow`, `useViewport`). The v12 API differs significantly from v11; any future lock to v11 for bug isolation, or an accidental downgrade, would break the canvas.
- Impact: Full canvas component fails to render.
- Migration plan: Pin to exact minor version; add a Playwright E2E test for canvas rendering.

## Missing Critical Features

**No request-level authorisation check at the API route layer:**
- Problem: All API routes in `src/app/api/projects/[projectId]/` delegate auth to the service layer via `requireAuthContext()` inside service functions. If a new route handler calls a service function that omits `requireAuthContext()` (e.g. an unfinished draft), the route silently serves data without authentication.
- Blocks: Secure addition of new API routes without explicit auth review.

**No rate limiting on compile or Figma AI endpoints:**
- Problem: `POST /api/projects/[projectId]/compile` and `POST /api/projects/[projectId]/figma` make unbounded OpenAI API calls per request with no per-user or per-project rate limiting.
- Blocks: Cost control in production; any authenticated user can trigger unlimited AI spend.

**No E2E test coverage for the compile flow:**
- Problem: `test:e2e` script is configured for Playwright but `src/` contains no Playwright test files. The compile → save → display flow is the core user journey and has no automated integration coverage.
- Files: No `.spec.ts` files found under `src/` or `tests/` (only Vitest unit tests).
- Blocks: Confident deployments; regression detection for the AI pipeline.

## Test Coverage Gaps

**`workspace-shell.tsx` has zero tests:**
- What's not tested: All save/recompile logic, keyboard shortcuts, Notion dialog flow, canvas resize persistence, nav count display.
- Files: `src/components/workspace/workspace-shell.tsx`
- Risk: Save/revision conflict bugs, stale-closure issues, and Notion OAuth edge cases go undetected.
- Priority: High

**`src/lib/ai/compiler.ts` multi-chunk merge has no schema validation in tests:**
- What's not tested: `mergeSpecDocuments()` output is not validated against `specDocumentSchema` after merge; type-cast correctness is untested.
- Files: `src/lib/ai/compiler.ts`, `src/lib/ai/fixtures/compiler-regression.test.ts`
- Risk: Merge silently returns malformed documents accepted at runtime due to `as` casts.
- Priority: Medium

**`src/lib/sources/pdf-extract.ts` has no tests:**
- What's not tested: No test file exists for the PDF extractor; multi-page detection, hex-encoded strings, and Korean character filtering are all untested paths.
- Files: `src/lib/sources/pdf-extract.ts`
- Risk: PDF extraction regressions are invisible until a user reports missing text.
- Priority: Medium

**API route handlers have no integration tests:**
- What's not tested: None of the `src/app/api/` route handlers have tests. Auth delegation, error mapping, and request validation are only tested via manual curl or E2E (which doesn't exist yet).
- Files: `src/app/api/projects/[projectId]/compile/route.ts`, `src/app/api/projects/[projectId]/sources/route.ts`, all other route files
- Risk: Silent regressions in auth or validation logic.
- Priority: High

---

*Concerns audit: 2026-06-22*
