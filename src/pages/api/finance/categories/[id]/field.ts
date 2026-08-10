import type { APIRoute } from 'astro';
import { requireUser } from '../../../../../lib/finance';

const EDITABLE_FIELDS = new Set(['name', 'default_amount', 'interest_rate']);

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return new Response(JSON.stringify({ error: 'Not signed in.' }), { status: 401 });
	}
	const { supabase } = auth;

	const body = await request.json().catch(() => null);
	const field = body?.field;
	const rawValue = typeof body?.value === 'string' ? body.value.trim() : '';

	if (typeof field !== 'string' || !EDITABLE_FIELDS.has(field)) {
		return new Response(JSON.stringify({ error: 'Field is not editable.' }), { status: 400 });
	}

	const update: Record<string, string | number | null> = {};

	if (field === 'name') {
		if (!rawValue) {
			return new Response(JSON.stringify({ error: 'Name cannot be empty.' }), { status: 400 });
		}
		update.name = rawValue;
	} else if (field === 'default_amount') {
		const amount = Number(rawValue);
		if (!Number.isFinite(amount) || amount < 0) {
			return new Response(JSON.stringify({ error: 'Default amount must be a number >= 0.' }), { status: 400 });
		}
		update.default_amount = amount;
	} else if (field === 'interest_rate') {
		if (!rawValue) {
			update.interest_rate = null;
		} else {
			const rate = Number(rawValue);
			if (!Number.isFinite(rate)) {
				return new Response(JSON.stringify({ error: 'Interest rate must be a number.' }), { status: 400 });
			}
			update.interest_rate = rate;
		}
	}

	const { error } = await supabase.from('finance_categories').update(update).eq('id', params.id);

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
