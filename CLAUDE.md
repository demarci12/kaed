# kead

Astro app (SSR, `output: 'server'`, Vercel adapter) backed by Supabase, deployed to kaed.hu from GitHub via Vercel's auto-deploy on push to `main`.

## Performance patterns to follow

- **Never `await` Supabase queries sequentially in a page's frontmatter.** Use `Promise.all([...])` when queries don't depend on each other. This was the biggest cause of "the app feels slow" — pages were paying for 3-4x round-trip latency by awaiting each query one at a time.
- **`Layout.astro` takes an optional `user` prop.** Every authenticated page already resolves the user via `requireUser`/`requireOwner` — pass it as `<Layout user={auth.user}>` instead of letting Layout call `supabase.auth.getUser()` again. Only omit the prop on genuinely public pages (`/`, `/login`).
- **`ClientRouter` (`astro:transitions`) is enabled in `Layout.astro`.** It intercepts same-origin links and form submissions for soft navigation, so plain `<form method="post">` submissions (the pattern used everywhere in this app) don't full-page-reload. Don't rewrite forms to `fetch()`/JSON unless a specific interaction needs partial DOM updates (see `[data-editable]` inline-edit pattern in Layout for that case).

## Finance module

- `finance_limits` is a single shared row: `daily_limit`, `weekly_limit` (optional overrides), and `starting_savings_balance` (added on top of the sum of `saving`-type transactions everywhere a savings balance is computed — see `/finance` and `/finance/budget`).
- `/finance/settings` manages starting balance, limit overrides, and categories (add/delete) in one place.
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
