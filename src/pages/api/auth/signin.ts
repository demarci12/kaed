import type { APIRoute } from 'astro';
import type { Provider } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../lib/supabase';

const ALLOWED: Provider[] = ['google', 'github'];

export const POST: APIRoute = async ({ request, cookies, url, redirect }) => {
	const form = await request.formData();
	const provider = String(form.get('provider') ?? '') as Provider;

	if (!ALLOWED.includes(provider)) {
		return redirect('/login?error=Unsupported login provider.');
	}

	const supabase = createSupabaseServerClient(request, cookies);
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider,
		options: {
			redirectTo: `${url.origin}/api/auth/callback`,
		},
	});

	if (error || !data.url) {
		return redirect(`/login?error=${encodeURIComponent(error?.message ?? 'Could not start login.')}`);
	}

	return redirect(data.url);
};
