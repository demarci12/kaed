import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { isMember } from '@/lib/auth';

export async function POST(request: Request) {
	const form = await request.formData();
	const email = String(form.get('email') ?? '').trim();
	const password = String(form.get('password') ?? '');

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!email || !password) {
		return back('/login?error=Email and password are required.');
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		return back(`/login?error=${encodeURIComponent(error.message)}`);
	}

	return back(data.user && isMember(data.user) ? '/finance' : '/projects');
}
