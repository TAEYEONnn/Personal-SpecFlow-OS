# External Integrations

**Analysis Date:** 2026-06-22

## APIs & External Services

**AI / LLM:**
- OpenAI - AI-powered spec document compilation and Figma component recommendations
  - SDK/Client: `openai ^6.44.0` (`src/lib/ai/compiler.ts`, `src/lib/figma/recommend.ts`)
  - Auth: `OPENAI_API_KEY` env var
  - Model: `OPENAI_MODEL` env var (default: `gpt-5.4`)
  - Uses structured output via `zodTextFormat` + Zod schemas for deterministic JSON responses

**Export / Productivity:**
- Notion API - Export compiled spec documents to Notion pages
  - Integration: OAuth 2.0 flow (`src/app/api/notion/oauth/route.ts`, `src/app/api/notion/callback/route.ts`)
  - Export route: `src/app/api/projects/[projectId]/export/notion/route.ts`
  - Auth: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` env vars
  - Status: Optional — feature is disabled (returns HTTP 501) when `NOTION_CLIENT_ID` is absent

**Design:**
- Figma - Design system library analysis and component recommendations
  - Integration: Custom fetch to Figma API (no official SDK)
  - Client: `src/lib/figma/recommend.ts`, `src/lib/figma/types.ts`
  - Uses OpenAI to map spec screen elements to Figma component library keys
  - API route: `src/app/api/projects/[projectId]/figma/route.ts`

## Data Storage

**Databases:**
- Supabase (PostgreSQL) - Primary database for all project, source, compilation, and user data
  - Connection (server): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Service role (admin scripts): `SUPABASE_SERVICE_ROLE_KEY`
  - Browser client: `src/lib/supabase/client.ts` — uses `createBrowserClient` from `@supabase/ssr`
  - Server client: `src/lib/supabase/server.ts` — uses `createServerClient` + `cookies()` from `next/headers`
  - Admin client: `src/lib/supabase/admin.ts` — uses service role key for privileged operations
  - Schema migrations: `supabase/migrations/` (3 migrations: initial schema, PDF source type, indexes)
  - Demo mode: `src/lib/projects/demo-store.ts` provides an in-memory store when Supabase env is absent

**File Storage:**
- Local filesystem only (no cloud file storage detected)
- PDF source files are processed in-memory via `src/lib/sources/pdf-extract.ts`

**Caching:**
- None detected (no Redis, Memcached, or Vercel KV integration)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Email/password authentication
  - Login route: `src/app/api/auth/login/route.ts`
  - Logout route: `src/app/api/auth/logout/route.ts`
  - Session context: `src/lib/auth/context.ts`
  - Cookie-based sessions managed via `@supabase/ssr`
  - Rate limiting: in-memory store (`src/lib/auth/rate-limit-store.ts`, `src/lib/auth/rate-limit.ts`)
  - Username validation: `src/lib/auth/username.ts`
  - Admin user management: `scripts/admin/create-user.ts`, `scripts/admin/reset-password.ts`

**Third-Party OAuth:**
- Notion OAuth 2.0 - Used only for export authorization (not app login)
  - Authorize: `GET /api/notion/oauth` → redirects to `https://api.notion.com/v1/oauth/authorize`
  - Callback: `/api/notion/callback/route.ts`
  - State parameter encodes `returnTo` path via base64url JSON

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, or similar SDK)

**Logs:**
- Standard Node.js `console` logging only

## CI/CD & Deployment

**Hosting:**
- Vercel implied (Next.js project, `pace.yaml` present)

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, or similar config files)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
- `OPENAI_API_KEY` - OpenAI API key for AI compilation

**Optional env vars:**
- `OPENAI_MODEL` - OpenAI model name (default: `gpt-5.4`)
- `NOTION_CLIENT_ID` - Enables Notion OAuth export feature
- `NOTION_CLIENT_SECRET` - Notion OAuth app secret

**Secrets location:**
- `.env.local` (not committed; `.env.example` is the template)
- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`) must not be prefixed with `NEXT_PUBLIC_`

## Webhooks & Callbacks

**Incoming:**
- `GET /api/notion/callback` — Notion OAuth redirect callback after user authorization

**Outgoing:**
- None detected (no outgoing webhook dispatch)

---

*Integration audit: 2026-06-22*
