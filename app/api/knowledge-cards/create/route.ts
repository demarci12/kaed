import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import type { KnowledgeKind } from '@/lib/knowledge';

const KINDS: KnowledgeKind[] = ['obsession', 'skill', 'experience', 'strength'];

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const body = String(form.get('body') ?? '').trim();
	const evidence = String(form.get('evidence') ?? '').trim();
	const kindRaw = String(form.get('kind') ?? '').trim() as KnowledgeKind;

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!title) {
		return back('/specific-knowledge?error=Title is required.');
	}

	const { error } = await supabase.from('knowledge_cards').insert({
		user_id: user.id,
		title,
		body: body || null,
		evidence: evidence || null,
		kind: KINDS.includes(kindRaw) ? kindRaw : null,
	});

	if (error) {
		return back(`/specific-knowledge?error=${encodeURIComponent(error.message)}`);
	}

	return back('/specific-knowledge');
}
