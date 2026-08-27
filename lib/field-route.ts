import { NextResponse } from 'next/server';
import { getOwnerSession, getSession } from './auth';

/**
 * Shared implementation for the inline-edit endpoints.
 *
 *   POST { field, value }
 *        ├─ auth ────────────── 401 if signed out (or not the owner)
 *        ├─ field in spec? ──── 400 "Field is not editable."
 *        ├─ validate by kind ── 400 with the kind's message
 *        ├─ onWrite hook ────── cross-column rules
 *        └─ update ──────────── 500 on DB error, else { ok: true }
 */
export type FieldSpec =
	| { kind: 'text'; required?: boolean; label?: string }
	| { kind: 'enum'; values: readonly string[]; message: string; required?: boolean }
	| { kind: 'int'; message: string }
	| { kind: 'number'; message: string; required?: boolean; min?: number }
	| { kind: 'ref' };

export interface FieldRouteOptions {
	table: string;
	fields: Record<string, FieldSpec>;
	/** Owner-only tables reject the shared member role outright. */
	ownerOnly?: boolean;
	touchUpdatedAt?: boolean;
	onWrite?: (field: string, value: string, update: Record<string, unknown>) => void;
	/**
	 * Runs after the update succeeds, with the same Supabase client and row id
	 * -- for side effects that need their own row (e.g. logging a status
	 * change to a history table). Errors here are swallowed: the edit itself
	 * already saved, so failing the request over a history-log write would
	 * make the user re-type a save that actually worked.
	 */
	afterWrite?: (
		ctx: { supabase: import('@supabase/supabase-js').SupabaseClient; id: string; userId: string },
		field: string,
		value: string,
	) => Promise<void>;
}

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export function createFieldRoute(options: FieldRouteOptions) {
	const { table, fields, ownerOnly, touchUpdatedAt, onWrite, afterWrite } = options;

	return async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
		const session = ownerOnly ? await getOwnerSession() : await getSession();
		if (!session) return fail('Not signed in.', 401);

		const { id } = await ctx.params;
		const body = await request.json().catch(() => null);
		const field = (body as { field?: unknown } | null)?.field;
		const raw = (body as { value?: unknown } | null)?.value;
		const value = typeof raw === 'string' ? raw.trim() : '';

		if (typeof field !== 'string' || !(field in fields)) {
			return fail('Field is not editable.', 400);
		}

		const spec = fields[field];
		const update: Record<string, unknown> = {};

		switch (spec.kind) {
			case 'text':
				if (spec.required && !value) return fail(`${spec.label ?? 'Field'} cannot be empty.`, 400);
				update[field] = value || null;
				break;
			case 'enum':
				if (spec.required && !value) return fail(spec.message, 400);
				if (value && !spec.values.includes(value)) return fail(spec.message, 400);
				update[field] = value || null;
				break;
			case 'int': {
				if (!value) { update[field] = null; break; }
				const n = Number(value);
				if (!Number.isInteger(n)) return fail(spec.message, 400);
				update[field] = n;
				break;
			}
			case 'number': {
				if (!value) {
					if (spec.required) return fail(spec.message, 400);
					update[field] = null;
					break;
				}
				const n = Number(value);
				if (!Number.isFinite(n)) return fail(spec.message, 400);
				if (spec.min != null && n < spec.min) return fail(spec.message, 400);
				update[field] = n;
				break;
			}
			case 'ref':
				update[field] = value || null;
				break;
		}

		onWrite?.(field, value, update);
		if (touchUpdatedAt) update.updated_at = new Date().toISOString();

		const { error } = await session.supabase.from(table).update(update).eq('id', id);
		if (error) return fail(error.message, 500);

		if (afterWrite) {
			try {
				await afterWrite({ supabase: session.supabase, id, userId: session.user.id }, field, value);
			} catch {
				// Save already succeeded; a history-log failure shouldn't surface
				// as a failed edit.
			}
		}

		return NextResponse.json({ ok: true });
	};
}
