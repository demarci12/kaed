import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await request.formData();
	const email = String(form.get('email') ?? '').trim();
	const password = String(form.get('password') ?? '');

	if (!email || !password) {
		return redirect('/?error=Email and password are required.');
	}
	if (password.length < 6) {
		return redirect('/?error=Password must be at least 6 characters.');
	}

	const supabase = createSupabaseServerClient(request, cookies);
	const { data, error } = await supabase.auth.signUp({ email, password });

	if (error) {
		return redirect(`/?error=${encodeURIComponent(error.message)}`);
	}

	if (!data.session) {
		return redirect('/?notice=Account created. Check your email to confirm before logging in.');
	}

	return redirect('/challenges');
};
