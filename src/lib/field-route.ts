import type { APIRoute } from 'astro';
import type { AstroCookies } from 'astro';

/**
 * Shared implementation for the `[data-editable]` inline-edit endpoints.
 *
 * Every editable cell in the app POSTs `{ field, value }` to a per-table
 * route that validates the field is writable, coerces the value, and writes
 * one column. That handler was copy-pasted eleven times; this collapses it
 * so validation rules live in one place and can't drift per table.
 *
 *   POST { field, value }
 *        │
 *        ├─ auth ────────────── 401 if signed out
 *        ├─ field in spec? ──── 400 "Field is not editable."
 *        ├─ validate by kind ── 400 with the kind's message
 *        ├─ onWrite hook ────── lets a table add cross-column rules
 *        └─ update ─────────── 500 on DB error, else { ok: true }
 */

type AuthResult = { redirect: string } | { supabase: any; user: { id: string } };
type AuthFn = (request: Request, cookies: AstroCookies) => Promise<AuthResult>;

export type FieldSpec =
	/** Free text. `required` rejects empty; otherwise empty is stored as null. */
	| { kind: 'text'; required?: boolean; label?: string }
	/**
	 * Constrained string. `required` rejects empty outright; without it an
	 * empty value clears the column to null and only non-empty values are
	 * checked against `values`.
	 */
	| { kind: 'enum'; values: readonly string[]; message: string; required?: boolean }
	/** Whole number, stored as null when empty. */
	| { kind: 'int'; message: string }
	/** Decimal. `required` rejects empty; `min` is inclusive. */
	| { kind: 'number'; message: string; required?: boolean; min?: number }
	/** Nullable foreign key. Empty clears it. */
	| { kind: 'ref' };

export interface FieldRouteOptions {
	table: string;
	auth: AuthFn;
	fields: Record<string, FieldSpec>;
	/** Tables carrying an `updated_at` column stamp it on every write. */
	touchUpdatedAt?: boolean;
	/**
	 * Cross-column rules that a single-field write can't express alone --
	 * e.g. two mutually exclusive foreign keys where setting one must clear
	 * the other. Receives the update object to mutate.
	 */
	onWrite?: (field: string, value: string, update: Record<string, unknown>) => void;
}

const json = (body: unknown, status: number) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const fail = (error: string, status: number) => json({ error }, status);

export function createFieldRoute(options: FieldRouteOptions): APIRoute {
	const { table, auth, fields, touchUpdatedAt, onWrite } = options;

	return async ({ request, cookies, params }) => {
		const result = await auth(request, cookies);
		if ('redirect' in result) {
			return fail('Not signed in.', 401);
		}
		const { supabase } = result;

		const body = await request.json().catch(() => null);
		const field = (body as { field?: unknown } | null)?.field;
		const rawValue = (body as { value?: unknown } | null)?.value;
		const value = typeof rawValue === 'string' ? rawValue.trim() : '';

		if (typeof field !== 'string' || !Object.hasOwn(fields, field)) {
			return fail('Field is not editable.', 400);
		}

		const spec = fields[field];
		const update: Record<string, unknown> = {};

		switch (spec.kind) {
			case 'text':
				if (spec.required && !value) {
					return fail(`${spec.label ?? 'Value'} cannot be empty.`, 400);
				}
				update[field] = value || null;
				break;

			case 'enum':
				if (spec.required ? !spec.values.includes(value) : value && !spec.values.includes(value)) {
					return fail(spec.message, 400);
				}
				update[field] = value || null;
				break;

			case 'int':
				if (value && !/^\d+$/.test(value)) {
					return fail(spec.message, 400);
				}
				update[field] = value ? Number(value) : null;
				break;

			case 'number': {
				if (!value) {
					if (spec.required) return fail(spec.message, 400);
					update[field] = null;
					break;
				}
				const parsed = Number(value);
				if (!Number.isFinite(parsed) || (spec.min !== undefined && parsed < spec.min)) {
					return fail(spec.message, 400);
				}
				update[field] = parsed;
				break;
			}

			case 'ref':
				update[field] = value || null;
				break;
		}

		onWrite?.(field, value, update);

		if (touchUpdatedAt) {
			update.updated_at = new Date().toISOString();
		}

		const { error } = await supabase.from(table).update(update).eq('id', params.id);

		if (error) {
			return fail(error.message, 500);
		}

		return json({ ok: true }, 200);
	};
}
