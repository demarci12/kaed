import type { AstroCookies } from 'astro';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './supabase';

/**
 * Resolve the signed-in user for a request, redirecting to the login page
 * when there isn't one. Returns the Supabase client alongside the user so
 * callers can reuse the same request-scoped client for queries.
 */
export async function requireUser(
	request: Request,
	cookies: AstroCookies,
): Promise<{ supabase: SupabaseClient; user: User } | { redirect: string }> {
	const supabase = createSupabaseServerClient(request, cookies);
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { redirect: '/login' };
	}

	return { supabase, user };
}
