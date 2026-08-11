import type { APIRoute } from 'astro';
import { requireUser, type KnowledgeKind } from '../../../lib/knowledge';

const KINDS: KnowledgeKind[] = ['obsession', 'skill', 'experience', 'strength'];

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const body = String(form.get('body') ?? '').trim();
	const evidence = String(form.get('evidence') ?? '').trim();
	const kindRaw = String(form.get('kind') ?? '').trim() as KnowledgeKind;

	if (!title) {
		return redirect('/specific-knowledge?error=Title is required.');
	}

	const { error } = await supabase.from('knowledge_cards').insert({
		user_id: user.id,
		title,
		body: body || null,
		evidence: evidence || null,
		kind: KINDS.includes(kindRaw) ? kindRaw : null,
	});

	if (error) {
		return redirect(`/specific-knowledge?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/specific-knowledge');
};
