import { NextResponse } from 'next/server';
import { getSession, getOwnerSession, type Session } from './auth';

/**
 * Shared implementation for the one-shot mutation endpoints (delete, archive,
 * restore, …) that a `<form method="post">` and a `fetch` both call.
 *
 * It content-negotiates the response:
 *   - `Accept: application/json`  → `{ ok: true }` / `{ ok: false, error }`
 *   - anything else (a plain form) → a 303 redirect, `?error=…` on failure
 *
 * so the same route backs both the async list controls (`RemoveButton`,
 * `components/CardList.tsx`) and the plain forms still used on detail pages.
 */

type RunResult = { error?: string | null; redirectTo?: string } | void;

type Run = (ctx: { session: Session; id: string; request: Request }) => Promise<RunResult>;

export function createMutationRoute(opts: {
	ownerOnly?: boolean;
	/** Where a plain form POST lands on success. String, or derived from the id.
	 *  A `run` result may override it per-request via `redirectTo`. */
	redirectTo: string | ((id: string) => string);
	run: Run;
}) {
	return async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
		const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');

		const session = opts.ownerOnly ? await getOwnerSession() : await getSession();
		if (!session) {
			return wantsJson
				? NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 })
				: NextResponse.redirect(new URL('/login', request.url), { status: 303 });
		}

		const { id } = await ctx.params;
		const base = typeof opts.redirectTo === 'function' ? opts.redirectTo(id) : opts.redirectTo;

		let result: RunResult;
		try {
			result = await opts.run({ session, id, request });
		} catch (e) {
			result = { error: e instanceof Error ? e.message : 'Something went wrong.' };
		}

		const error = result?.error ?? null;
		const dest = result?.redirectTo ?? base;

		if (error) {
			if (wantsJson) return NextResponse.json({ ok: false, error }, { status: 500 });
			const sep = dest.includes('?') ? '&' : '?';
			return NextResponse.redirect(
				new URL(`${dest}${sep}error=${encodeURIComponent(error)}`, request.url),
				{ status: 303 },
			);
		}

		return wantsJson
			? NextResponse.json({ ok: true }, { status: 200 })
			: NextResponse.redirect(new URL(dest, request.url), { status: 303 });
	};
}

/** `delete().eq('id', id)` on one table — the shape most of these routes need. */
export function deleteRow(table: string, redirectTo: string | ((id: string) => string), ownerOnly = true) {
	return createMutationRoute({
		ownerOnly,
		redirectTo,
		run: async ({ session, id }) => {
			const { error } = await session.supabase.from(table).delete().eq('id', id);
			return { error: error?.message };
		},
	});
}
