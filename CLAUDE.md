# kead

Astro app (SSR, `output: 'server'`, Vercel adapter) backed by Supabase, deployed to kaed.hu from GitHub via Vercel's auto-deploy on push to `main`.

## Performance patterns to follow

- **Never `await` Supabase queries sequentially in a page's frontmatter.** Use `Promise.all([...])` when queries don't depend on each other. This was the biggest cause of "the app feels slow" — pages were paying for 3-4x round-trip latency by awaiting each query one at a time.
- **`Layout.astro` takes an optional `user` prop.** Every authenticated page already resolves the user via `requireUser`/`requireOwner` — pass it as `<Layout user={auth.user}>` instead of letting Layout call `supabase.auth.getUser()` again. Only omit the prop on genuinely public pages (`/`, `/login`).
- **`ClientRouter` (`astro:transitions`) is enabled in `Layout.astro`.** It intercepts same-origin links and form submissions for soft navigation, so plain `<form method="post">` submissions (the pattern used everywhere in this app) don't full-page-reload. Don't rewrite forms to `fetch()`/JSON unless a specific interaction needs partial DOM updates (see `[data-editable]` inline-edit pattern in Layout for that case).
- **Styles for markup created at runtime must live in a global block, not a page's scoped `<style>`.** Astro's scoped styles work by stamping a hash attribute onto elements it compiles at build time; anything injected later via `innerHTML` never gets that attribute, so scoped rules silently don't apply. `startCellEdit` in `Layout.astro` re-renders saved select cells as `<span class="pill pill-${value}">`, so **all `.pill` styles live in Layout's `is:global` block** — don't move them back into pages or re-declare them per page (they were duplicated across six files and none of them applied after a dropdown edit). Same reasoning as the global `.btn`. In general: prefer letting the server re-render (plain form POST + redirect) over building DOM by hand, which is what this codebase now does everywhere.
- **Never bind an event listener directly to an element inside a page's own `<script>` tag if that element can appear again after a soft navigation.** Plain `<script>` runs once per module load; after ClientRouter swaps in a fresh DOM, a directly-bound listener is left attached to a stale, detached node and silently stops firing (no error — it just looks like the feature randomly stopped working). Always delegate from `document` instead (`document.addEventListener('change'/'submit'/'click', (e) => { if (e.target...) ... })`), matching the pattern Layout.astro already uses for `[data-editable]` and popups — `document` itself is never replaced by a soft navigation. Hit this exact bug with the `/finance` quick-add bar's category→type sync.

## Finance module

- `finance_limits` is a single shared row: `daily_limit`, `weekly_limit` (optional overrides), and `starting_savings_balance` (added on top of the sum of `saving`-type transactions everywhere a savings balance is computed — see `/finance` and `/finance/budget`).
- `finance_categories.default_amount` is the category's default planned monthly amount. `/finance/budget`'s `budgetedFor(cat)` helper falls back to it whenever no month-specific `finance_budgets` row exists yet — so a fresh month shows the default plan pre-filled and editable, only persisted once Save is hit for that category+month. Keep using that helper everywhere a "planned amount for this category this month" is needed; don't recompute the fallback inline.
- `finance_categories.interest_rate` (nullable, percent per month, e.g. `0.5`) is only meaningful for `type = 'saving'`. `/finance/budget`'s forecast panel computes a contribution-weighted blended monthly rate across saving categories and compounds it (future-value-of-ordinary-annuity formula) instead of flat linear growth — see the `projections` block in that file.
- `/finance/settings` is the **only** place categories are managed (add/delete/edit name, default amount, interest rate via inline `[data-editable]` cells) — there is no separate "Manage categories" popup on `/finance` anymore; don't re-add one.
- `/finance` has a quick-add bar (category + amount, posts to `/api/finance/transactions/create`, dated today) for fast logging without opening the full "+ Add transaction" popup.
- A "Statistics" nav entry exists on `/finance` as a disabled placeholder ("Soon" badge) — intentionally not built yet, on hold per the user.
- Daily/weekly spending limits shown on `/finance` derive from the current month's planned expense budget by default (`/finance/budget`), overridden by `finance_limits` if set.

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

- `src/pages/api/mcp.ts` exposes the same Supabase table access as the local `mcp-server/` stdio server, over HTTP, for claude.ai connectors (e.g. mobile).
- Auth: bearer token via `MCP_AUTH_TOKEN` (Vercel env var), checked from either the `Authorization` header or a `?token=` query param — the query-param fallback exists because claude.ai's custom-connector UI (without OAuth configured) doesn't send a custom header.
- Known weakness: static token, full read/write/delete via the service-role key (bypasses RLS), token visible in logs/history when passed as a query param. If this ever needs to be more than "good enough for personal use," the fix is proper OAuth (dynamic client registration) instead of a static bearer token — not yet built.
