# Technology Stack

**Analysis Date:** 2026-06-22

## Languages

**Primary:**
- TypeScript 5.x - All application code (`src/**/*.ts`, `src/**/*.tsx`)

**Secondary:**
- SQL - Supabase database migrations (`supabase/migrations/*.sql`)

## Runtime

**Environment:**
- Node.js 20.x (per `@types/node: ^20` in `package.json`)

**Package Manager:**
- pnpm (per `pnpm-workspace.yaml`, `pnpm-lock.yaml`)
- Lockfile: present (`pnpm-lock.yaml`)

## Frameworks

**Core:**
- Next.js 16.2.9 - Full-stack React framework, App Router (`src/app/`)
- React 19.2.4 - UI component library
- React DOM 19.2.4 - DOM rendering

**Testing:**
- Vitest 4.1.9 - Unit/integration test runner (`vitest.config.ts`)
- Playwright 1.61.0 - E2E testing
- @testing-library/react 16.3.2 - React component testing utilities
- jsdom 29.1.1 - DOM environment for Vitest

**Build/Dev:**
- Tailwind CSS 4.x - Utility-first CSS (`postcss.config.mjs`, `@tailwindcss/postcss`)
- PostCSS - CSS processing (`postcss.config.mjs`)
- tsx 4.22.4 - TypeScript execution for admin scripts (`scripts/admin/*.ts`)

## Key Dependencies

**Critical:**
- `@supabase/ssr ^0.12.0` - Supabase server-side rendering client (auth + DB)
- `@supabase/supabase-js ^2.108.2` - Supabase JS client
- `openai ^6.44.0` - OpenAI SDK for AI spec compilation and Figma recommendations
- `@xyflow/react ^12.11.0` - React Flow for visual flow/canvas workspace (`src/components/workspace/`)
- `zod ^4.4.3` - Schema validation and structured output parsing for AI responses

**Infrastructure:**
- `@next/env ^16.2.9` - Environment variable loading
- `clsx ^2.1.1` - Conditional className utility
- `@phosphor-icons/react ^2.1.10` - Icon library
- `@inquirer/prompts ^8.5.2` - Interactive CLI prompts for admin scripts

## Configuration

**Environment:**
- Config is loaded via `src/lib/env.ts` using `requireEnv()` helper
- Development demo mode activates automatically when Supabase env vars are absent (`isDevelopmentDemo`)
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`
- Optional vars: `OPENAI_MODEL` (defaults to `gpt-5.4`), `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`
- Template: `.env.example`

**Build:**
- `next.config.ts` - Minimal Next.js config, no custom options currently set
- `tsconfig.json` - strict mode, `bundler` moduleResolution, path alias `@/*` → `./src/*`
- `eslint.config.mjs` - ESLint 9 flat config with `eslint-config-next` core-web-vitals + TypeScript rules

**Workspace:**
- `pnpm-workspace.yaml` - pnpm workspace config (single package project)

## Platform Requirements

**Development:**
- Node.js 20+
- pnpm package manager
- Optional: Supabase project (or runs in demo mode without it)
- Optional: OpenAI API key

**Production:**
- Next.js deployment target (Vercel or Node.js server)
- Supabase project for database and auth
- OpenAI API key required for AI compilation features

---

*Stack analysis: 2026-06-22*
