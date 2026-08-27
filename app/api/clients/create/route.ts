import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import type { ClientStage } from '@/lib/clients';

const ALLOWED_STAGES: ClientStage[] = ['lead', 'contacted', 'negotiating', 'won', 'lost'];

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const company = String(form.get('company') ?? '').trim();
	const email = String(form.get('email') ?? '').trim();
	const phone = String(form.get('phone') ?? '').trim();
	const stage = String(form.get('stage') ?? 'lead') as ClientStage;
	const nextFollowUp = String(form.get('next_follow_up') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!name) {
		return back('/clients?error=Name is required.');
	}
	if (!ALLOWED_STAGES.includes(stage)) {
		return back('/clients?error=Invalid stage.');
	}

	const { error } = await supabase.from('clients').insert({
		user_id: user.id,
		name,
		company: company || null,
		email: email || null,
		phone: phone || null,
		stage,
		next_follow_up: nextFollowUp || null,
	});

	if (error) {
		return back(`/clients?error=${encodeURIComponent(error.message)}`);
	}

	return back('/clients');
}
