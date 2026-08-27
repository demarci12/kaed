import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
	if (!supabaseUrl || !serviceKey) {
		return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
	}

	let email = '';

	try {
		const body = (await request.json()) as { email?: unknown } | null;
		email = typeof body?.email === 'string' ? body.email.trim() : '';
	} catch {
		return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
	}

	if (!email) {
		return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
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
		return NextResponse.json({ error: errorText || 'Unable to save signup.' }, { status: response.status });
	}

	return NextResponse.json({ ok: true }, { status: 200 });
}
