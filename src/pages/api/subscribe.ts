import type { APIRoute } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const POST: APIRoute = async ({ request }) => {
	if (!supabaseUrl || !serviceKey) {
		return new Response(JSON.stringify({ error: 'Supabase is not configured.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let email = '';

	try {
		const body = await request.json();
		email = typeof body?.email === 'string' ? body.email.trim() : '';
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!email) {
		return new Response(JSON.stringify({ error: 'Email is required.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const response = await fetch(`${supabaseUrl}/rest/v1/newsletter_signups`, {
		method: 'POST',
		headers: {
			apikey: serviceKey,
			Authorization: `Bearer ${serviceKey}`,
			'Content-Type': 'application/json',
			Prefer: 'return=minimal',
		},
		body: JSON.stringify({ email }),
	});

	if (!response.ok) {
		const errorText = await response.text();
		return new Response(JSON.stringify({ error: errorText || 'Unable to save signup.' }), {
			status: response.status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};