import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await request.formData();
	const email = String(form.get('email') ?? '').trim();
	const password = String(form.get('password') ?? '');

	if (!email || !password) {
		return redirect('/login?error=Email and password are required.');
	}

	const supabase = createSupabaseServerClient(request, cookies);
	const { error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		return redirect(`/login?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/projects');
};
