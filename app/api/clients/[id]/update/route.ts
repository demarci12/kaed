import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import type { ClientStage } from '@/lib/clients';

const ALLOWED_STAGES: ClientStage[] = ['lead', 'contacted', 'negotiating', 'won', 'lost'];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase } = session;

	const { id } = await params;
	const form = await request.formData();
	const stage = String(form.get('stage') ?? '') as ClientStage;
	const nextFollowUp = String(form.get('next_follow_up') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!ALLOWED_STAGES.includes(stage)) {
		return back(`/clients/${id}?error=Invalid stage.`);
	}

	const { error } = await supabase
		.from('clients')
		.update({
			stage,
			next_follow_up: nextFollowUp || null,
			updated_at: new Date().toISOString(),
		})
		.eq('id', id);

	if (error) {
		return back(`/clients/${id}?error=${encodeURIComponent(error.message)}`);
	}

	return back(`/clients/${id}`);
}
