import type { AstroCookies } from 'astro';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './supabase';

export type ChallengeStatus = 'not_started' | 'active' | 'done';
export type ProofType = 'text' | 'link' | 'image';
export type ProofStatus = 'pending' | 'verified' | 'rejected';

export interface Challenge {
	id: string;
	user_id: string;
	title: string;
	description: string | null;
	status: ChallengeStatus;
	start_date: string | null;
	target_end_date: string | null;
	created_at: string;
	updated_at: string;
}

export interface ChallengeLog {
	id: string;
	challenge_id: string;
	user_id: string;
	note: string;
	proof_type: ProofType;
	proof_url: string | null;
	status: ProofStatus;
	created_at: string;
}

/**
 * Resolve the signed-in user for a request, redirecting to /login when
 * there isn't one. Returns the Supabase client alongside the user so
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
