import type { APIRoute } from 'astro';
import { requireOwner } from '../../../lib/auth';

/**
 * Creates an empty pain point and redirects back to the list, which the
 * server then re-renders with the new row already in it.
 *
 * This is deliberately a redirect rather than a JSON response: the page used
 * to POST here from JS and then hand-build the new note with innerHTML,
 * which broke twice over -- Astro's scoped <style> never applied to the
 * injected markup (unstyled notes), and the click handler went stale after
 * the first soft navigation (button did nothing). Letting the server render
 * the list is the only version where both are impossible.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const { error } = await supabase.from('ideas').insert({ user_id: user.id, title: '' });

	if (error) {
		return redirect(`/pain-points?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/pain-points');
};
