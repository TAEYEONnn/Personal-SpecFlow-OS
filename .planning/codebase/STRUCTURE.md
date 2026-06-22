# Codebase Structure

**Analysis Date:** 2026-06-22

## Directory Layout

```
Personal-SpecFlow-OS/
├── src/
│   ├── app/                        # Next.js App Router — pages and API routes
│   │   ├── layout.tsx              # Root layout (lang="ko", global CSS)
│   │   ├── page.tsx                # Root redirect → /projects
│   │   ├── globals.css             # Global styles
│   │   ├── login/
│   │   │   └── page.tsx            # Login page
│   │   ├── projects/
│   │   │   ├── page.tsx            # RSC: project list
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # New project form page
│   │   │   └── [projectId]/
│   │   │       └── page.tsx        # RSC: workspace entry point
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   └── logout/route.ts
│   │       ├── notion/
│   │       │   ├── oauth/route.ts
│   │       │   └── callback/route.ts
│   │       └── projects/
│   │           ├── route.ts        # GET list, POST create
│   │           └── [projectId]/
│   │               ├── route.ts                   # GET, PATCH, DELETE
│   │               ├── compile/route.ts            # POST: AI compile
│   │               ├── document/route.ts           # PATCH: save doc
│   │               ├── sources/
│   │               │   ├── route.ts               # GET, POST
│   │               │   └── [sourceId]/route.ts    # PATCH, DELETE
│   │               ├── compilations/
│   │               │   └── [runId]/route.ts       # GET run status
│   │               ├── revisions/
│   │               │   ├── route.ts               # GET list
│   │               │   └── [revision]/route.ts    # GET doc at revision
│   │               ├── export/
│   │               │   ├── route.ts               # GET markdown/JSON
│   │               │   └── notion/route.ts        # POST to Notion
│   │               └── figma/route.ts             # POST Figma recommendations
│   ├── components/
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── login-form.test.tsx
│   │   │   └── logout-button.tsx
│   │   ├── projects/
│   │   │   ├── new-project-form.tsx
│   │   │   └── project-list.tsx
│   │   └── workspace/
│   │       ├── workspace-shell.tsx      # Main workspace client component
│   │       ├── flow-canvas.tsx          # Interactive screen flow diagram
│   │       ├── screen-detail.tsx        # Selected screen detail panel
│   │       ├── document-view.tsx        # Document/list view
│   │       ├── diff-view.tsx            # Version diff comparison
│   │       ├── evidence-panel.tsx       # Evidence sidebar
│   │       ├── matrix-view.tsx          # Permission matrix
│   │       ├── runs-view.tsx            # Compilation run history
│   │       ├── source-viewer.tsx        # Source document viewer
│   │       ├── figma-view.tsx           # Figma component recommendations
│   │       ├── help-overlay.tsx         # Keyboard shortcut help
│   │       └── *.test.tsx               # Co-located unit tests
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── compiler.ts             # OpenAI integration, prompt, multi-chunk merge
│   │   │   ├── compiler.test.ts
│   │   │   ├── cost-estimate.ts        # Token estimation, chunk splitting
│   │   │   ├── cost-estimate.test.ts
│   │   │   └── fixtures/
│   │   │       ├── sample-sources.ts
│   │   │       └── compiler-regression.test.ts
│   │   ├── api/
│   │   │   └── response.ts             # AppError class, apiError() helper
│   │   ├── auth/
│   │   │   ├── context.ts              # getAuthContext / requireAuthContext
│   │   │   ├── messages.ts             # Public-safe login error messages
│   │   │   ├── messages.test.ts
│   │   │   ├── rate-limit.ts           # Rate-limit logic
│   │   │   ├── rate-limit.test.ts
│   │   │   ├── rate-limit-store.ts     # Rate-limit persistence (Supabase)
│   │   │   ├── username.ts             # Username normalization/validation
│   │   │   └── username.test.ts
│   │   ├── export/
│   │   │   ├── markdown.ts             # SpecDocument → Markdown templates
│   │   │   ├── markdown.test.ts
│   │   │   ├── notion.ts               # SpecDocument → Notion blocks
│   │   │   └── notion.test.ts
│   │   ├── figma/
│   │   │   ├── recommend.ts            # OpenAI-based Figma component mapping
│   │   │   ├── recommend.test.ts
│   │   │   └── types.ts                # FigmaLibrary, ComponentRecommendation types
│   │   ├── projects/
│   │   │   ├── service.ts              # Auth-aware project CRUD (main service)
│   │   │   ├── demo-store.ts           # In-memory store for demo/dev mode
│   │   │   ├── demo-store.test.ts (via sources.test.ts)
│   │   │   ├── revision.ts             # assertRevision() concurrency helper
│   │   │   └── revision.test.ts
│   │   ├── sources/
│   │   │   ├── pdf-extract.ts          # PDF text extraction
│   │   │   ├── source-input.ts         # Source validation/normalization
│   │   │   └── source-input.test.ts
│   │   ├── spec/
│   │   │   ├── schema.ts               # SpecDocument Zod schema + TypeScript types
│   │   │   ├── spec-document.test.ts
│   │   │   ├── impact.ts               # Requirement → affected entities cross-ref
│   │   │   ├── impact.test.ts
│   │   │   └── demo-document.ts        # Hardcoded demo SpecDocument (no-API fallback)
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client
│   │   │   ├── server.ts               # Server-side Supabase client (SSR cookies)
│   │   │   └── admin.ts                # Admin client (service role key)
│   │   └── env.ts                      # isDevelopmentDemo, hasSupabaseEnv, requireEnv
│   └── test/                           # (directory exists, shared test utilities if any)
├── supabase/
│   └── migrations/
│       ├── 202606210001_initial.sql    # All tables, RLS, save_project_document RPC
│       ├── 202606210002_add_pdf_source_type.sql
│       └── 202606210003_add_indexes.sql
├── scripts/
│   └── admin/                          # Admin utility scripts
├── docs/                               # Project documentation
├── public/                             # Static assets
├── .planning/
│   └── codebase/                       # GSD codebase map documents
├── next.config.ts                      # Next.js config (minimal, no custom options set)
├── tsconfig.json                       # TypeScript config
├── vitest.config.ts                    # Vitest test runner config
├── eslint.config.mjs                   # ESLint flat config
├── postcss.config.mjs                  # PostCSS (Tailwind/CSS processing)
├── package.json                        # pnpm workspace root
├── pnpm-workspace.yaml
└── .env.example                        # Required environment variable template
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router — all pages and API routes
- Contains: `page.tsx` (RSC), `layout.tsx`, `route.ts` (API handlers)
- Key files: `src/app/projects/[projectId]/page.tsx` (workspace entry), `src/app/api/projects/[projectId]/compile/route.ts` (core AI pipeline)

**`src/components/`:**
- Purpose: React components, split by feature domain
- Contains: Client components (`"use client"` at top), co-located `*.test.tsx` files
- Key files: `src/components/workspace/workspace-shell.tsx` (entire workspace UI)

**`src/lib/`:**
- Purpose: Business logic, data access, AI integration — no UI code
- Contains: Services, utilities, Zod schemas, Supabase clients, AI prompts
- Key files: `src/lib/projects/service.ts`, `src/lib/spec/schema.ts`, `src/lib/ai/compiler.ts`

**`src/lib/spec/`:**
- Purpose: The core domain model — `SpecDocument` schema and related utilities
- Key files: `schema.ts` (all TypeScript types exported from here), `impact.ts`, `demo-document.ts`

**`src/lib/projects/`:**
- Purpose: Project and source CRUD, dual demo/Supabase implementation
- Key files: `service.ts` (public API), `demo-store.ts` (dev mode store), `revision.ts` (concurrency)

**`src/lib/supabase/`:**
- Purpose: Three Supabase client factories for different contexts
- `client.ts`: browser-side client
- `server.ts`: server-side SSR client (reads cookies)
- `admin.ts`: server-side admin client (service role, bypasses RLS)

**`supabase/migrations/`:**
- Purpose: SQL migration files for Supabase (PostgreSQL)
- Generated: No (hand-authored)
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: GSD codebase map documents consumed by `/gsd-plan-phase` and `/gsd-execute-phase`
- Generated: Yes (by this mapper)
- Committed: Yes

## Naming Conventions

**Files:**
- Components: `kebab-case.tsx` (e.g., `workspace-shell.tsx`, `flow-canvas.tsx`)
- Tests: `[name].test.tsx` or `[name].test.ts`, co-located with source file
- Route handlers: always named `route.ts`
- Library modules: `kebab-case.ts` (e.g., `demo-store.ts`, `cost-estimate.ts`)

**Directories:**
- Feature-grouped under `src/components/` and `src/lib/`: `auth/`, `projects/`, `workspace/`, `spec/`, `ai/`, `export/`, `figma/`
- API routes mirror resource hierarchy: `api/projects/[projectId]/sources/[sourceId]/`

**TypeScript:**
- Types/interfaces: PascalCase (`SpecDocument`, `ProjectView`, `DemoRun`)
- Functions: camelCase (`compileSpecDocument`, `requireAuthContext`, `apiError`)
- Zod schemas: camelCase with `Schema` suffix (`specDocumentSchema`, `loginSchema`)
- Exported constants: camelCase (`isDevelopmentDemo`, `COMPILER_PROMPT_VERSION`)

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Root redirect
- `src/app/layout.tsx`: HTML shell, global CSS import
- `src/app/projects/page.tsx`: Projects list (RSC)
- `src/app/projects/[projectId]/page.tsx`: Workspace entry (RSC, then passes to client)
- `src/app/login/page.tsx`: Login page

**Core Business Logic:**
- `src/lib/projects/service.ts`: All project/source/document/run operations
- `src/lib/ai/compiler.ts`: OpenAI compilation pipeline
- `src/lib/spec/schema.ts`: All domain types

**Configuration:**
- `src/lib/env.ts`: Environment flags (`isDevelopmentDemo`)
- `next.config.ts`: Next.js config (currently empty/default)
- `supabase/migrations/`: Database schema source of truth

**Testing:**
- `vitest.config.ts`: Test runner configuration
- Co-located `*.test.ts(x)` files throughout `src/`

## Where to Add New Code

**New API endpoint (e.g., new action on a project):**
- Create `src/app/api/projects/[projectId]/[action]/route.ts`
- Call `requireAuthContext()` as first step via service layer
- Use `apiError(error)` in catch block
- Add corresponding service function to `src/lib/projects/service.ts`

**New workspace view/panel:**
- Create `src/components/workspace/[view-name].tsx` as `"use client"` component
- Add view type to `ViewMode` union in `src/components/workspace/workspace-shell.tsx`
- Add nav item to `navItems` array in `workspace-shell.tsx`
- Route to new component in the main view switch block

**New SpecDocument field:**
- Add to Zod schema in `src/lib/spec/schema.ts`
- Export the new TypeScript type
- Update `src/lib/ai/compiler.ts` prompt if AI should populate it
- Update `src/lib/projects/demo-store.ts` `saveDemoDocument` if needed
- Update export templates in `src/lib/export/markdown.ts`

**New lib utility:**
- Place under `src/lib/[domain]/[name].ts`
- Co-locate test as `src/lib/[domain]/[name].test.ts`

**New Supabase table:**
- Add migration to `supabase/migrations/[timestamp]_[description].sql`
- Enable RLS and add ownership policies following existing pattern
- Add service functions to `src/lib/projects/service.ts`
- Add corresponding demo-store functions to `src/lib/projects/demo-store.ts`

**New component under `src/components/auth/` or `src/components/projects/`:**
- Follow `kebab-case.tsx` naming
- If `"use client"`, add directive at top of file
- Co-locate test as `[name].test.tsx`

## Special Directories

**`src/lib/ai/fixtures/`:**
- Purpose: Regression test fixtures for the AI compiler
- Generated: Partially (sample sources are hand-authored, test output validated)
- Committed: Yes

**`supabase/migrations/`:**
- Purpose: Sequential SQL migrations for the Supabase project
- Generated: No
- Committed: Yes — these are the authoritative database schema

**`.planning/`:**
- Purpose: GSD planning documents (codebase maps, phase plans)
- Generated: Yes (by GSD tooling)
- Committed: Yes

**`public/`:**
- Purpose: Static assets served directly
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-06-22*
