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
- **List rows delete/archive without a refresh via `components/CardList.tsx`.** Wrap a grid/table in `<CardList>` (`as="tbody"` for tables), each row in `<CardItem id=…>`, and put a `<RemoveButton id=… endpoint=…>` where the delete `<form>` was. A successful POST hides that row instantly; the server drops it for good on its next render. Used across projects, goals, opl, specific-knowledge, studies, system-design, idea-lab, and the finance tables. Reorder still needs bespoke local state (`IdeaList`, `GoalGrid`).
- **Inline-edit endpoints share one implementation: `createFieldRoute` (`lib/field-route.ts`).** A feature's `app/api/<feature>/[id]/field/route.ts` is just a table name + a `fields` spec (`text` / `enum` / `int` / `number` / `ref`, each with its own validation + error message). Use `onWrite` for cross-column rules and `afterWrite` for side effects that need their own row (history logging) — `afterWrite` errors are swallowed because the edit itself already saved.
- **One-shot mutation endpoints (delete/archive/restore) share `createMutationRoute` (`lib/mutation-route.ts`)** — most are one line: `export const POST = deleteRow('projects', '/projects')`. It content-negotiates: JSON for `Accept: application/json` (the `RemoveButton` path), a 303 redirect (`?error=…` on failure) for a plain `<form>` — so the same route backs both the async list control and the plain forms still on detail pages. Pass `ownerOnly` to match the table's access rule; a `run` can return `{ redirectTo }` to override the form landing per-request (see the system-design routes, which look up `project_id`).
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
- Beyond the generic `select_rows`/`insert_row`/`update_rows`/`delete_rows` tools, dedicated tools exist for interactions that shouldn't require the chat session to know the schema or the owner's user id — e.g. `save_thought` (appends to `think_pad_entries` for `/think-pad` — see below). The pattern: resolve the owner via `getOwnerUserId()` (looks up the one `auth.users` row whose `user_metadata.role` isn't `'member'` — same rule as `isMember()` in `lib/auth.ts`) rather than taking a user id as a tool argument. Keep `mcp-server/index.js` (the local stdio server) in sync with any tool or `TABLES` change here — they're meant to mirror each other.

## Think Pad (`/think-pad`) — kead's Notion replacement

kead's answer to "I want my own wiki/Notion, not a separate app." One-time design history, in order: a list of dated blog posts → one continuous Notion-style document → a real wiki with pages, links, an attached database, and search → (current) same wiki, database dropped — turned out unwanted. If you see code or comments describing any earlier shape, it's stale.

- **Structure:** `think_pad_pages` (one row per page: `title`, `search_text`, `search_tsv`) → `think_pad_entries` (one row per *line* within a page, `page_id` + float `position` for midpoint insertion and reordering). `/think-pad` lists pages (cards, search box); `/think-pad/[id]` is one page's editor. `think_pad_tables`/`think_pad_table_rows` (an attached-database feature) existed briefly and were removed at the user's request — dropped from both the app and production Supabase (`DROP TABLE`, verified gone).
- **The line editor** (`app/think-pad/[id]/ThinkPadDoc.tsx`), scoped to one page: Enter splits the focused line at the cursor and inserts a new one at the midpoint between its new neighbours' positions; Backspace at the start of a line merges it into the one above and deletes the row; **Alt+↑/Alt+↓ (or the hover-revealed ↑/↓ buttons) swap a line with its neighbour** — `moveLine` trades both array slots and `position` values between the two lines, so the on-screen reorder and what a future reload reconstructs from `position` always agree. A typed line starts as a client-only "draft" (temp id, no row yet) and only becomes real when finalized — Enter, losing focus, or being moved.
- **Wiki-links, resolved at render time, not stored resolved.** A line has two faces: an always-live `<textarea>` while it's the one being edited (raw text, `[[Title]]` and all), and a rendered `<div>` (via `renderLineHtml` in `lib/think-pad-helpers.ts`) otherwise — plain text except `[[Page Title]]`, which becomes a real link (to the page if `titleToId` has a case-insensitive match, else to `/think-pad/new?title=…`, the "create this page" landing spot). **Deliberate scope cut:** only `[[links]]` are resolved — no bold/italic/headings. A line is a block, not a paragraph; there's no room for block-level Markdown inside one, so full Markdown fidelity was cut rather than faked.
- **Renaming a page propagates.** `rewriteWikiLinks` (`lib/think-pad-helpers.ts`) rewrites `[[OldTitle]]` → `[[NewTitle]]` in every other page's lines when you rename one — otherwise a rename would silently turn every existing link into a dead one. Runs from the page's bespoke `/api/think-pad/[id]/field` route (not `createFieldRoute`: the generic factory has nowhere to hook in a lookup of the *old* title before the write). Uses plain `.includes()`/`.replaceAll()`, not a shared global `RegExp` — a `/g` regex's `.test()` carries `lastIndex` state across calls, which silently breaks a match-check loop over multiple strings.
- **Backlinks** (`backlinksFor`): every other page with a line whose body `ILIKE '%[[Title]]%'` (title's `%`/`_` escaped first — they're LIKE wildcards), shown as a chip strip at the bottom of the page.
- **Search is Postgres full-text, not client-side.** `search_tsv` (generated by a trigger from `search_text`, GIN-indexed) covers a page's title + every line's body — kept current by `recomputeSearchText`, called after any line mutation (same "recompute the whole flattened string" approach notekeep used for SQLite FTS5, ported to `tsvector`; it flattened table cells in too before the database feature was dropped). The list page queries with `.textSearch(..., { type: 'plain' })`, which runs input through `plainto_tsquery` — never throws on punctuation, unlike raw `to_tsquery`.
- **`save_thought`** (both MCP servers — `app/api/mcp/route.ts` for claude.ai, `mcp-server/index.js` for local/stdio) finds-or-creates one page titled **"Inbox"** and appends there: looks up `max(position)` *scoped to that page*, splits the incoming text on `\n`, inserts one row per non-empty line, then recomputes that page's `search_text`. A chat session never has to know or choose which page to append to. Lines from chat carry `source: 'mcp'` (vs `'app'`), shown as a small hover marker; nothing else reads `source`.
- **`page_id` on `think_pad_entries` is nullable, permanently** — it was added after the table already had live rows (`ALTER TABLE ... ADD COLUMN`, not part of the original `CREATE TABLE`). Setting it `NOT NULL` right after would have risked a window where already-deployed old app code (which didn't know about `page_id` yet) inserts a row without it, right as the constraint lands — so it was deliberately left nullable rather than raced. Every write path always sets it in practice; nullable-but-always-set is permanent here, not a TODO. The `title` column on this same table is a similar leftover from an even earlier "blog of separate posts" shape — unused, and this environment's safety classifier blocks `DROP COLUMN` against production outright, so it stays as harmless dead weight (ask a human to run the `ALTER TABLE ... DROP COLUMN` if it's ever worth doing).

## Blog CMS (`/cms`) — the posting machine for the client sites

Sales & Marketing → Blog CMS. One `cms_sites` row per site (kazanszerelok, temptech, jobro, klimaepito), each with an ideas queue, posts, a brand brief, a posting schedule and a Vercel deploy hook.

- **Flow:** you (or an MCP chat) add ideas → `lib/cms-run.ts#runSite` turns the oldest queued idea into an SEO article via Claude (`lib/cms-generate.ts`, tool-use for structured output; model `claude-sonnet-5-5`; `tool_choice` forcing is NOT supported on it, so the prompt tells it to call `save_post`) → the post is `scheduled` at the next slot (`nextSlot`, DST-safe via Intl) when the site is in **auto-publish** mode, or left as a `draft` in **review** mode (the default) → when due it goes `published` and the site's deploy hook fires so the static site rebuilds.
- **Heartbeat:** `/api/cms/cron` (vercel.json, daily 05:00 UTC, `?lookahead=23` because Hobby crons can't hit an exact hour — everything due within 23h goes live). Auth: `Authorization: Bearer $CRON_SECRET` (Vercel adds it) or the signed-in owner. Any external scheduler can call it hourly without `lookahead`. Generation takes ~1 min, so `maxDuration = 300` and at most one article per site per pass ("Write next post now" on the site page forces one).
- **Public read API for the sites' builds:** `GET /api/cms/v1/posts` and `/posts/[slug]` with `Authorization: Bearer kck_…`. Keys are per site, only the sha256 is stored, the plaintext is shown once on the site page (Regenerate to rotate). Served with the service-role client after the key check; only `publicPost()`'s fields leave.
- **Body is Markdown** (`body_md`, `##` headings, no H1). Consumers render it themselves (kazanszerelok uses `marked`). Cover pictures: upload to the public `cms-media` storage bucket (`/api/cms/media`) or paste a URL.
- **MCP:** `lib/cms-mcp.ts` adds `cms_list_sites`, `cms_add_ideas`, `cms_list_posts`, `cms_get_post`, `cms_create_post`, `cms_set_post_status`, `cms_write_next_post`, `cms_rebuild_site` to the remote endpoint. The stdio server only gets raw table access to `cms_*` (it can't import `lib/`).
- **Connecting a site:** on the site's page create an API key and paste its deploy hook; in the site's own project set `CMS_API_URL=https://www.kaed.hu` and `CMS_API_KEY`, and fetch at build time (see kazanszerelok's `src/lib/cmsClient.ts` + `getBlogPosts.ts`, and its sitemap `serialize` for `lastmod`).
