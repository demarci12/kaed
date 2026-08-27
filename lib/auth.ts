import { redirect } from 'next/navigation';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './supabase';

/** True if this user is restricted to the finance tracker. */
export function isMember(user: User): boolean {
	return user.user_metadata?.role === 'member';
}

export interface Session {
	supabase: SupabaseClient;
	user: User;
}

/**
 * Resolve the signed-in user for a page, redirecting to /login when there
 * isn't one. Unlike the Astro version this throws Next's redirect rather than
 * returning a { redirect } object, so callers get a plain Session back and
 * never have to narrow a union.
 */
export async function requireUser(): Promise<Session> {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect('/login');
	return { supabase, user };
}

/** requireUser, but the restricted "member" role is bounced to /finance. */
export async function requireOwner(): Promise<Session> {
	const session = await requireUser();
	if (isMember(session.user)) redirect('/finance');
	return session;
}

/** Route-handler variant: returns null instead of redirecting, so the caller
 *  can answer with a JSON 401 rather than an HTML redirect. */
export async function getSession(): Promise<Session | null> {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	return user ? { supabase, user } : null;
}

export async function getOwnerSession(): Promise<Session | null> {
	const session = await getSession();
	if (!session || isMember(session.user)) return null;
	return session;
}
