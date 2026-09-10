# kead

Personal operating-system app. **Next.js 15 (App Router) + React 19 + Tailwind v4**, backed by Supabase (Postgres + auth). Deployed to [kaed.hu](https://kaed.hu) from Vercel — auto-deploy on every push to `main`. Dev server runs on **port 4321** (`npm run dev`).

> Earlier versions of this file described an Astro stack. That is gone — there is no `Layout.astro`, no `astro:transitions`, no scoped `<style>`. Anything below is Next.js.

## Architecture

- `app/` — pages are **Server Components** (`async function Page()`); mutations are **Route Handlers** under `app/api/**/route.ts`.
- `lib/` — framework-agnostic data access, types, and per-feature business logic. `lib/auth.ts` and `lib/supabase.ts` are the auth/DB entry points.
- `components/` — shared client UI: `ui.tsx` (the design system as Tailwind class strings), `InlineEdit.tsx`, `Popup.tsx`, `Nav.tsx`.
- `middleware.ts` — refreshes the Supabase session cookie on every request (Server Components can't write cookies, so without this an expired token is never renewed).
- `supabase/schema.sql` — source of truth for the database, **not** auto-applied (see below).

## Auth

- `requireUser()` / `requireOwner()` (in `lib/auth.ts`) resolve the signed-in user for a **page** and `redirect('/login')` (or `/finance` for the restricted `member` role) when there's no session. They throw Next's redirect, so callers get a plain `Session` back — no union to narrow.
- `getSession()` / `getOwnerSession()` are the **Route Handler** variants: they return `null` instead of redirecting, so the handler can answer with a JSON 401.
- `isMember(user)` — the `member` role is scoped to the finance tracker only. Owner-only pages call `requireOwner`; owner-only routes call `getOwnerSession`; owner-only inline-edit fields pass `ownerOnly: true` to `createFieldRoute`.

## Patterns to follow

- **Never `await` independent Supabase queries one at a time in a Server Component.** Use `Promise.all([...])` when the queries don't depend on each other — sequential awaits were the single biggest "the app feels slow" cause, paying 3–4× round-trip latency per page.
- **Two mutation styles, used deliberately:**
  1. **Plain `<form method="post" action="/api/…">` + 303 redirect.** The default. The Route Handler reads `request.formData()`, writes, and `NextResponse.redirect(new URL(path, request.url), { status: 303 })` — usually back to the same page with `?error=…` on failure, which the page renders via `<FormError>`. Next soft-navigates the redirect, so there's no full reload. Use this for creates, updates, and deletes that don't need partial-DOM feedback.
  2. **Client component + `fetch` returning JSON.** For interactions that must update without re-running the whole page. `InlineEdit` (click-to-edit cells) POSTs `{ field, value }` and calls `router.refresh()` on success. The business-ideas card list (`app/business-ideas/IdeaList.tsx`) goes further — it holds the ordered list in local state and applies **optimistic** delete/reorder, rolling back and showing the error on failure, with no `router.refresh()` at all.
- **Inline-edit endpoints share one implementation: `createFieldRoute` (`lib/field-route.ts`).** A feature's `app/api/<feature>/[id]/field/route.ts` is just a table name + a `fields` spec (`text` / `enum` / `int` / `number` / `ref`, each with its own validation + error message). Use `onWrite` for cross-column rules and `afterWrite` for side effects that need their own row (history logging) — `afterWrite` errors are swallowed because the edit itself already saved.
- **A Route Handler that both a `<form>` and a `fetch` call** should content-negotiate: return JSON when `request.headers.get('accept')` includes `application/json`, otherwise redirect. `app/api/business-ideas/[id]/delete/route.ts` is the reference — the detail page still POSTs a plain form to it, the card list POSTs with `Accept: application/json`.
- **All styling is Tailwind utilities composed from `components/ui.tsx`.** `app/globals.css` is tokens only (`@theme` block) — no component classes. There is deliberately no hand-written CSS and no specificity to reason about; the Astro rewrite existed to kill 1384 lines of colliding CSS. Add a new visual primitive as an exported class string in `ui.tsx`, not a `.css` rule.
- **Client components own their own event listeners** (React) — there's no document-delegation requirement here. `'use client'` only where interaction actually needs it; keep pages as Server Components.

## Finance module

- `finance_limits` is a single shared row: `daily_limit`, `weekly_limit` (optional overrides), and `starting_savings_balance` (added on top of the sum of `saving`-type transactions everywhere a savings balance is computed — see `/finance` and `/finance/budget`).
- `finance_categories.default_amount` is the category's default planned monthly amount. `/finance/budget`'s `budgetedFor(cat)` helper falls back to it whenever no month-specific `finance_budgets` row exists yet — a fresh month shows the default plan pre-filled and editable, only persisted once Save is hit for that category+month. Use that helper everywhere a "planned amount for this category this month" is needed; don't recompute the fallback inline.
- `finance_categories.interest_rate` (nullable, percent per month, e.g. `0.5`) is only meaningful for `type = 'saving'`. `/finance/budget`'s forecast panel computes a contribution-weighted blended monthly rate across saving categories and compounds it (future-value-of-ordinary-annuity formula) instead of flat linear growth — see the `projections` block.
- `/finance/settings` is the **only** place categories are managed (add/delete/edit name, default amount, interest rate via inline `[data-editable]` cells) — there is no separate "Manage categories" popup on `/finance`; don't re-add one.
- `/finance` has a quick-add bar (category + amount, posts to `/api/finance/transactions/create`, dated today) for fast logging without opening the full "+ Add transaction" popup.
- A "Statistics" nav entry on `/finance` is a disabled placeholder ("Soon" badge) — intentionally not built yet, on hold per the user.
- Daily/weekly spending limits on `/finance` derive from the current month's planned expense budget by default (`/finance/budget`), overridden by `finance_limits` if set.

### Investments (`/finance/investments`)

- Owner-only: the page uses `requireOwner`, and the link on `/finance` renders behind `!isMember(auth.user)` — the shared `member` role can reach `/finance` but never this.
- Prices come from CoinMarketCap server-side. `CMC_API_KEY` is read via `process.env` and is **not** `NEXT_PUBLIC_` — keep it server-only so it never reaches the client bundle.
- The free CMC plan allows **one `convert` option per call**, so `convert=HUF,USD` is rejected. Quotes are fetched in USD and the forint rate comes from one `/v2/tools/price-conversion` call; every HUF figure is `usdPrice * rate`, so the displayed rate always matches the rate used.
- Symbol and slug lookups **cannot be mixed in one call**. Symbols are batched into a single request; each slug costs its own. Results cache 5 minutes per server instance so a refresh doesn't burn credits — `?refresh=1` forces a fetch.
- `positionMetrics()` in `lib/investments.ts` owns every derived column (value, change, %, goal value, upside). It returns `null` rather than `Infinity`/`NaN` for a zero cost basis, missing quote, or zero price — don't recompute these inline.

## Supabase schema changes

- `supabase/schema.sql` is the source of truth but isn't auto-applied — there's no linked Supabase CLI project (no DB password on file).
- To run a migration: use the Management API directly with the token in `.env` (`SUPABASE_ACCESS_TOKEN`):
  ```bash
  TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env | cut -d= -f2)
  curl -s -X POST "https://api.supabase.com/v1/projects/jugffqdvvjvusaxowhim/database/query" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"query":"<sql>"}'
  ```
  This is a real, irreversible action against production — always confirm with the user before running DDL this way, then update `supabase/schema.sql` to match.

## Remote MCP endpoint

- `app/api/mcp/route.ts` exposes the same Supabase table access as the local `mcp-server/` stdio server, over HTTP, for claude.ai connectors (e.g. mobile). `export const dynamic = 'force-dynamic'`.
- Auth: bearer token via `MCP_AUTH_TOKEN` (Vercel env var), checked from either the `Authorization` header or a `?token=` query param — the query-param fallback exists because claude.ai's custom-connector UI (without OAuth) doesn't send a custom header.
- Access uses the **service-role key** (`SUPABASE_SERVICE_ROLE_KEY`), which bypasses RLS, so operations are restricted to a known `TABLES` allowlist in the route rather than arbitrary table access.
- Known weakness: static token, full read/write/delete, token visible in logs/history when passed as a query param. If this ever needs to be more than "good enough for personal use," the fix is proper OAuth (dynamic client registration), not a static bearer token — not yet built.
