import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request, cookies, url, redirect }) => {
	const code = url.searchParams.get('code');
	const oauthError = url.searchParams.get('error_description') ?? url.searchParams.get('error');

	if (oauthError) {
		return redirect(`/login?error=${encodeURIComponent(oauthError)}`);
	}

	if (!code) {
		return redirect('/login?error=Missing authorization code.');
	}

	const supabase = createSupabaseServerClient(request, cookies);
	const { error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		return redirect(`/login?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/');
};
