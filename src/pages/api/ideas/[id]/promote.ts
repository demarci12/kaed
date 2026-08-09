import type { APIRoute } from 'astro';
import { requireUser } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const { id: ideaId } = params;

	const { data: idea } = await supabase.from('ideas').select('*').eq('id', ideaId).maybeSingle();

	if (!idea) {
		return redirect('/brainstorm?error=Idea not found.');
	}

	const { data: businessIdea, error } = await supabase
		.from('business_ideas')
		.insert({
			user_id: user.id,
			title: idea.title,
			pain_point: idea.body || null,
		})
		.select('id')
		.single();

	if (error) {
		return redirect(`/brainstorm?error=${encodeURIComponent(error.message)}`);
	}

	await supabase.from('ideas').update({ business_idea_id: businessIdea.id }).eq('id', ideaId);

	return redirect('/brainstorm');
};
