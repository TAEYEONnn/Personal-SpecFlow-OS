# Coding Conventions

**Analysis Date:** 2026-06-22

## Naming Patterns

**Files:**
- React components: `kebab-case.tsx` — e.g., `login-form.tsx`, `workspace-shell.tsx`
- Lib modules: `kebab-case.ts` — e.g., `rate-limit.ts`, `cost-estimate.ts`
- Route handlers: `route.ts` inside Next.js App Router directories
- Test files: co-located alongside source, same name + `.test.ts` / `.test.tsx`
- Schema files: `schema.ts` per domain

**Functions and Variables:**
- Functions: `camelCase` — e.g., `buildCompilerPrompt`, `nextFailureState`, `shouldBlockLogin`
- Boolean state variables: prefixed with `is` or descriptive verb — e.g., `pending`, `nameEditing`, `editing`, `noteIsError`
- Constants (module-level): `SCREAMING_SNAKE_CASE` — e.g., `LOGIN_WINDOW_MS`, `LOGIN_BLOCK_MS`, `MAX_LOGIN_ATTEMPTS`, `COMPILER_PROMPT_VERSION`

**Types and Interfaces:**
- Types: `PascalCase` — e.g., `LoginAttemptState`, `ProjectView`, `AppErrorCode`, `ViewMode`
- Zod schemas: `camelCase` suffix `Schema` — e.g., `evidenceSchema`, `screenSchema`, `usernameSchema`
- Exported type aliases from Zod: `z.infer<typeof xSchema>` pattern — e.g., `Screen`, `SpecDocument`, `Evidence`

**React Components:**
- Named exports using `function` declarations — e.g., `export function WorkspaceShell(...)`, `export function LoginForm()`
- Props typed inline as object literal: `{ project, username }: { project: ProjectView; username: string }`

## Code Style

**Formatting:**
- No Prettier config present — relies on ESLint only
- Trailing commas used in multi-line arrays and object literals
- Double quotes for strings in JSX attributes; double quotes for JSON values
- Indentation: 2 spaces

**Linting:**
- Config: `eslint.config.mjs`
- Rules: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` (Next.js 16 ESLint flat config)
- Run: `npm run lint` (calls `eslint` directly)

**TypeScript:**
- `strict: true` enabled in `tsconfig.json`
- `noEmit: true` — type-check only via `tsc --noEmit`
- Target: `ES2017`
- Module resolution: `bundler`

## Import Organization

**Order (observed pattern):**
1. React core + hooks — e.g., `import { useState, useCallback } from "react"`
2. Next.js modules — e.g., `import { NextResponse } from "next/server"`, `import Link from "next/link"`
3. Third-party packages — e.g., `@phosphor-icons/react`, `zod`, `@xyflow/react`
4. Internal modules via path alias — e.g., `@/components/...`, `@/lib/...`
5. Type-only imports with `import type` — e.g., `import type { Screen } from "@/lib/spec/schema"`

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Always use `@/` prefix for cross-directory imports; never use relative `../../`

## Error Handling

**API Layer (`src/lib/api/response.ts`):**
- Domain errors use `AppError` class with `AppErrorCode` enum (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION`)
- Route handlers call `apiError(error)` helper which maps `AppError` → HTTP status codes
- Status map: `UNAUTHORIZED→401`, `FORBIDDEN→403`, `NOT_FOUND→404`, `CONFLICT→409`, `VALIDATION→422`
- Unknown errors default to `500`

**Service Layer:**
- Supabase calls: `if (error) throw error` — let errors propagate to route handler
- `try/catch` in route handlers wraps full operation; cleanup (e.g., `finishCompilationRun`) uses `.catch(() => undefined)` to suppress secondary errors

**Client Components:**
- `try/catch` around `fetch()` calls
- Network failures set error state: `setError("네트워크 연결을 확인해 주세요.")`
- Server errors parsed from response JSON: `data.error ?? "fallback message"`
- Korean-language user-facing error messages throughout

**Environment:**
- Missing env vars: `requireEnv(name)` throws `Error` with Korean message
- `hasSupabaseEnv` boolean guards demo mode (`src/lib/env.ts`)

## Logging

**Framework:** `console` (no dedicated logging library detected)

**Patterns:**
- No structured logging; errors surface via `throw` to route handlers
- Error details from `error instanceof Error ? error.message : "fallback"` pattern

## Comments

**When to Comment:**
- Inline comments for legacy compatibility notes: `// Legacy string-code compatibility for service layer errors not yet migrated`
- Regression test descriptions explain intent clearly via test names (Korean or English)
- No JSDoc/TSDoc on functions — types carry documentation weight

## Function Design

**Size:** Functions are short and focused; each handles one concern
**Parameters:** Prefer destructured object params for components; positional args for utility functions with default params (e.g., `now = new Date()`)
**Return Values:** Always typed; `Promise<T | null>` for nullable async results

## Module Design

**Exports:**
- Named exports only; no default exports for components or library functions
- Components: `export function ComponentName(...)` in `.tsx` files
- Lib: `export function`, `export const`, `export type`, `export class`
- Route handlers: `export async function GET/POST/PUT/DELETE`

**Barrel Files:** Not used — import directly from the specific module file

## React / Next.js Specifics

**Directives:**
- `"use client"` at top of any component using hooks or browser APIs
- Server components are the default (no directive needed)
- Route handlers and server actions are in `src/app/api/`

**State:**
- `useState` with explicit initial values; lazy initializer pattern used for cloning: `useState(() => structuredClone(project.document))`
- Callback memoization with `useCallback`; computed values with `useMemo`

**Async params (Next.js 15+):**
- Route params destructured as `{ params }: { params: Promise<{ projectId: string }> }` and awaited: `const { projectId } = await params`

## Validation

- Zod schemas define all domain types in `src/lib/spec/schema.ts`
- Runtime validation: `schema.parse(data)` (throws on failure) or `schema.safeParse(data)` (returns `{ success, data, error }`)
- Username validation: `usernameSchema.safeParse(...)` — `src/lib/auth/username.ts`

---

*Convention analysis: 2026-06-22*
