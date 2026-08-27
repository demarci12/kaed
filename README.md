# kead

Personal operating system app — deployed to [kaed.hu](https://kaed.hu).

Next.js 15 (App Router) + React 19 + Tailwind v4, backed by Supabase (Postgres + auth). Deploys to Vercel from `main` on every push.

## Structure

- `app/` — pages (Server Components) and API routes (`app/api/**`, Route Handlers)
- `lib/` — framework-agnostic data access, types, and business logic per feature
- `components/` — shared UI: the design-system class strings (`ui.tsx`), inline-edit cells, popups, nav
- `supabase/schema.sql` — source of truth for the database, not auto-applied (see `CLAUDE.md`)
- `middleware.ts` — refreshes the Supabase session on every request

## Local development

```sh
cp .env.example .env   # fill in real values
npm install
npm run dev             # http://localhost:4321
```

| Command | Action |
| :-- | :-- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |

See `CLAUDE.md` for the project's working conventions (Supabase migrations, the finance module's derived-value rules, styling conventions).
