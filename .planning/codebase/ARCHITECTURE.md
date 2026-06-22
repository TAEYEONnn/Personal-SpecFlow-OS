<!-- refreshed: 2026-06-22 -->
# Architecture

**Analysis Date:** 2026-06-22

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js App Router (RSC)                     │
│   `src/app/page.tsx`  `src/app/projects/`  `src/app/login/`         │
├──────────────────────┬──────────────────────┬────────────────────────┤
│   Page (RSC)         │   API Route Handler  │  Client Component       │
│  `src/app/projects/` │  `src/app/api/`      │  `src/components/`      │
│  `[projectId]/page`  │  projects, auth,     │  workspace-shell.tsx    │
│  (data-fetches,      │  notion, figma       │  (all UI state)         │
│   passes props down) │  export              │                         │
└──────────┬───────────┴──────────┬───────────┴──────────┬─────────────┘
           │                      │                       │
           ▼                      ▼                       │
┌─────────────────────────────────────────────────────────┘
│                       Service Layer                      │
│   `src/lib/projects/service.ts`                          │
│   Auth-aware, routes to Demo store or Supabase           │
└──────────┬──────────────────────┬────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────────┐
│   Demo Store     │   │   Supabase (PostgreSQL + Auth)    │
│  `lib/projects/  │   │   `src/lib/supabase/`             │
│  demo-store.ts`  │   │   `supabase/migrations/`          │
│  (globalThis Map)│   │                                   │
└──────────────────┘   └──────────────────────────────────┘
           │                      │
           ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│                     AI / Export Layer                    │
│  `src/lib/ai/compiler.ts`  — OpenAI structured output   │
│  `src/lib/export/markdown.ts` — MD/JSON export          │
│  `src/lib/export/notion.ts`   — Notion API export       │
│  `src/lib/figma/recommend.ts` — Figma component recs    │
└─────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root page | Redirects `/` → `/projects` | `src/app/page.tsx` |
| Projects page (RSC) | Lists all projects, server-renders | `src/app/projects/page.tsx` |
| Project workspace page (RSC) | Loads project+auth, passes to shell | `src/app/projects/[projectId]/page.tsx` |
| WorkspaceShell | All workspace UI state, view routing | `src/components/workspace/workspace-shell.tsx` |
| Service layer | Auth-aware CRUD, routes demo vs Supabase | `src/lib/projects/service.ts` |
| Auth context | Cookie or Supabase session resolution | `src/lib/auth/context.ts` |
| AI compiler | OpenAI structured-output → SpecDocument | `src/lib/ai/compiler.ts` |
| SpecDocument schema | Zod schema + TypeScript types | `src/lib/spec/schema.ts` |
| Demo store | In-process globalThis Map for dev/no-env | `src/lib/projects/demo-store.ts` |
| API response helpers | AppError class + `apiError()` factory | `src/lib/api/response.ts` |
| Env flags | `isDevelopmentDemo`, `hasSupabaseEnv` | `src/lib/env.ts` |
| Export — Markdown | SpecDocument → Markdown templates | `src/lib/export/markdown.ts` |
| Export — Notion | SpecDocument → Notion blocks API | `src/lib/export/notion.ts` |
| Figma recommender | Screen spec → component mapping via OpenAI | `src/lib/figma/recommend.ts` |
| Impact analysis | Cross-reference requirement → screens/tasks | `src/lib/spec/impact.ts` |

## Pattern Overview

**Overall:** Next.js App Router with a dual-mode service layer (demo vs Supabase), thin RSC pages, and a single large client component (`WorkspaceShell`) owning all interactive workspace state.

**Key Characteristics:**
- RSC pages fetch data server-side and pass serializable props to client components
- A single `isDevelopmentDemo` flag (derived from presence of Supabase env vars) switches all service functions between in-memory and Supabase paths
- All API route handlers call `requireAuthContext()` first; errors bubble up to `apiError()`
- `SpecDocument` is the central data model — defined by a Zod schema, produced by the AI compiler, stored as JSONB in Supabase, and consumed by all workspace views

## Layers

**Presentation Layer (RSC + Client Components):**
- Purpose: Render pages, pass data props down, own no business logic
- Location: `src/app/` (pages), `src/components/` (components)
- Contains: `page.tsx` files (RSC), `*.tsx` client components
- Depends on: Service layer (pages), API routes (client components via fetch)
- Used by: Browser / Next.js renderer

**API Route Layer:**
- Purpose: HTTP endpoints for client-side mutations and data access
- Location: `src/app/api/`
- Contains: `route.ts` files with GET/POST/PATCH/DELETE handlers
- Depends on: Service layer, lib utilities, `apiError()`
- Used by: `WorkspaceShell` via `fetch()`

**Service Layer:**
- Purpose: Auth-aware business logic; single point of truth for data access
- Location: `src/lib/projects/service.ts`
- Contains: `listProjects`, `getProject`, `createProject`, `addSource`, `saveProjectDocument`, `createCompilationRun`, etc.
- Depends on: `src/lib/auth/context.ts`, `src/lib/projects/demo-store.ts`, `src/lib/supabase/`
- Used by: API route handlers, RSC pages directly

**AI / Processing Layer:**
- Purpose: OpenAI integration for spec compilation and Figma recommendations
- Location: `src/lib/ai/`, `src/lib/figma/`
- Contains: `compileSpecDocument()`, `buildCompilerPrompt()`, `recommendFigmaComponents()`
- Depends on: `openai` SDK, `src/lib/spec/schema.ts`
- Used by: Compile route handler (`src/app/api/projects/[projectId]/compile/route.ts`), Figma route handler

**Data / Schema Layer:**
- Purpose: Define canonical types and Zod validation schemas
- Location: `src/lib/spec/schema.ts`, `src/lib/figma/types.ts`
- Contains: `SpecDocument`, `Screen`, `Task`, `Evidence`, `ScreenState`, etc.
- Depends on: `zod`
- Used by: All other layers

**Infrastructure Layer:**
- Purpose: Supabase clients, auth rate limiting, environment resolution
- Location: `src/lib/supabase/`, `src/lib/auth/`, `src/lib/env.ts`
- Contains: `createClient()`, `createAdminClient()`, rate-limit store, username validation
- Depends on: `@supabase/supabase-js`
- Used by: Service layer, auth API routes

## Data Flow

### Primary: Source → Compile → Display

1. User uploads source text (paste/txt/md/pdf) — `POST /api/projects/[projectId]/sources`
2. Route handler calls `addSource()` in `src/lib/projects/service.ts`
3. User triggers compile — `POST /api/projects/[projectId]/compile/route.ts`
4. Route calls `getProject()` → concatenates all source content
5. `createCompilationRun()` creates a run record
6. `compileSpecDocument(source)` in `src/lib/ai/compiler.ts` sends to OpenAI (structured output with Zod schema), returns `SpecDocument`
7. `saveProjectDocument()` stores document as JSONB and increments `revision` via Supabase RPC `save_project_document`
8. Response `{ runId, revision, document }` returned to `WorkspaceShell`
9. `WorkspaceShell` calls `setDocument(data.document)` and re-renders all views

### Secondary: Manual Edit → Save

1. `WorkspaceShell` user edits a field (screen name, task status, etc.)
2. Local state updated via `setDocument({ ...document, ... })`
3. `doSave(revision, doc)` calls `PATCH /api/projects/[projectId]/document`
4. Route calls `saveProjectDocument()` with optimistic-concurrency `expectedRevision`
5. Supabase RPC checks `revision = p_expected_revision` before incrementing — raises `revision_conflict` on mismatch
6. New revision number returned; `WorkspaceShell` updates `revision` state

### Auth Flow

1. `POST /api/auth/login` — validates username/password
2. In demo mode: sets `specflow-demo-session` cookie
3. In production: Supabase `signInWithPassword()` sets session cookies via `@supabase/ssr`
4. All subsequent API calls resolved by `requireAuthContext()` which reads cookie or Supabase session

**State Management:**
- All workspace UI state lives in `WorkspaceShell` React `useState` hooks (no Redux/Zustand)
- `SpecDocument` state is local to `WorkspaceShell`; persisted by calling `doSave()` after every mutation
- Canvas layout persisted to `localStorage` (`specflow-canvas-height`, `specflow-evidence-collapsed`)

## Key Abstractions

**SpecDocument:**
- Purpose: The canonical output of the AI compiler — a structured UX/product spec
- Location: `src/lib/spec/schema.ts`
- Contains: `brief`, `requirements`, `questions`, `roles`, `permissions`, `screens`, `states`, `uxCopy`, `tasks`, `dailyReport`
- Each item carries an `evidence` field (`type`, `reviewStatus`, `sourceId`, `sourceExcerpt`, `rationale`)

**Evidence:**
- Purpose: Traceability — links every generated item back to a source excerpt
- Type: `{ type: "original"|"inference"|"assumption", reviewStatus: "confirmed"|"needs-review"|"conflict", sourceId, sourceExcerpt, rationale }`
- Every array item in `SpecDocument` carries exactly one `Evidence` object

**ProjectView:**
- Purpose: Unified view model combining project metadata, sources, document, and runs
- Location: `src/lib/projects/service.ts` (type `ProjectView`)
- Returned by `getProject()` for both demo and Supabase paths

**Demo/Supabase dual path:**
- Pattern: Every service function checks `auth.demo` first; if true, delegates to `src/lib/projects/demo-store.ts` in-memory store; otherwise uses Supabase client
- Controlled by `isDevelopmentDemo` in `src/lib/env.ts` (true when Supabase env vars absent in non-production)

## Entry Points

**Root redirect:**
- Location: `src/app/page.tsx`
- Triggers: Any `/` request
- Responsibilities: `redirect("/projects")`

**Projects list:**
- Location: `src/app/projects/page.tsx`
- Triggers: GET `/projects`
- Responsibilities: Calls `listProjects()` server-side, renders `<ProjectList>`

**Project workspace:**
- Location: `src/app/projects/[projectId]/page.tsx`
- Triggers: GET `/projects/[projectId]`
- Responsibilities: Fetches `getProject()` + `getAuthContext()` in parallel, passes to `<WorkspaceShell>`; calls `notFound()` if no document yet

**Compile endpoint:**
- Location: `src/app/api/projects/[projectId]/compile/route.ts`
- Triggers: POST from `WorkspaceShell.recompile()`
- Responsibilities: Orchestrates run creation → AI compile → document save → run finish

**Login:**
- Location: `src/app/api/auth/login/route.ts`
- Triggers: POST from `<LoginForm>`
- Responsibilities: Demo cookie or Supabase auth with rate limiting

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop; no worker threads. AI compile is a single async OpenAI call (or `Promise.all` for multi-chunk). No streaming.
- **Global state:** `src/lib/projects/demo-store.ts` uses `globalThis.__specflowDemoProjects` (a `Map`) — shared across all requests in the same Node.js process. This is intentional for demo mode only; not used in production.
- **Optimistic concurrency:** Document saves use a `revision` counter. The Supabase RPC `save_project_document` enforces `revision = p_expected_revision` atomically. The demo store uses `assertRevision()` in `src/lib/projects/revision.ts`.
- **No global client state store:** `WorkspaceShell` manages all workspace state locally; there is no React Context, Zustand, or Redux.
- **Auth guard:** All service functions call `requireAuthContext()`. Unauthorized access throws `"UNAUTHORIZED"` which `apiError()` maps to HTTP 401.

## Anti-Patterns

### String-based error codes in `apiError()`

**What happens:** `src/lib/api/response.ts` checks `error.message === "UNAUTHORIZED"` and `message.includes("revision_conflict")` as string matching fallbacks.
**Why it's wrong:** Brittle — any message change silently breaks error mapping; bypasses the `AppError` class designed for this purpose.
**Do this instead:** Throw `new AppError("UNAUTHORIZED", "…")` in service functions instead of `throw new Error("UNAUTHORIZED")`. The `AppError` path in `apiError()` is the correct one.

### Single massive client component

**What happens:** `src/components/workspace/workspace-shell.tsx` is ~677 lines with 20+ `useState` hooks and all workspace interaction logic inlined.
**Why it's wrong:** Makes isolated testing impossible; prop drilling risk increases with features; slow to parse/reason about.
**Do this instead:** Extract sub-state (e.g., canvas resize, Notion dialog, name editing) into smaller co-located hooks or components.

## Error Handling

**Strategy:** Errors thrown in service layer bubble to API route handlers; route handlers call `apiError(error)` which maps `AppError` instances to HTTP status codes and falls back to 500 for unexpected errors.

**Patterns:**
- Service throws `new AppError("NOT_FOUND", "…")` → `apiError()` returns 404
- Service throws `new Error("UNAUTHORIZED")` → `apiError()` string-matches → 401 (legacy path)
- Compile failures: route handler calls `finishCompilationRun(…, { status: "failed" })` before re-throwing; 502 returned for compile errors
- Client: `WorkspaceShell` calls `setError(message, retryFn)` to display inline error with optional retry button

## Cross-Cutting Concerns

**Logging:** No structured logging library. `console.error` used implicitly via Next.js. No request tracing.
**Validation:** Zod used at API boundary (`loginSchema`, `createProjectSchema`) and for AI output parsing (`specDocumentSchema`). No shared request-validation middleware.
**Authentication:** Cookie-based (demo) or Supabase JWT (production). All routes gated via `requireAuthContext()` in the service layer — not via Next.js middleware.

---

*Architecture analysis: 2026-06-22*
