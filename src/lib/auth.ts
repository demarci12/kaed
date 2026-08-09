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

/** True if this user is restricted to the finance tracker (everything else redirects them away). */
export function isMember(user: User): boolean {
	return user.user_metadata?.role === 'member';
}

/**
 * Like requireUser, but also blocks the restricted "member" role (used for
 * a family member who should only see the finance tracker) from every
 * owner-only area of the app.
 */
export async function requireOwner(
	request: Request,
	cookies: AstroCookies,
): Promise<{ supabase: SupabaseClient; user: User } | { redirect: string }> {
	const result = await requireUser(request, cookies);
	if ('redirect' in result) {
		return result;
	}
	if (isMember(result.user)) {
		return { redirect: '/finance' };
	}
	return result;
}
