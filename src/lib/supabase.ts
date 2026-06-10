import { createServerClient, parseCookieHeader, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * Create a request-scoped Supabase client that reads and writes the auth
 * session through Astro's cookie store. Use this in pages and API routes
 * that need to know who the current user is or to manage their session.
 */
export function createSupabaseServerClient(request: Request, cookies: AstroCookies) {
	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return parseCookieHeader(request.headers.get('Cookie') ?? '').map(
					({ name, value }) => ({ name, value: value ?? '' }),
				);
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					cookies.set(name, value, options as CookieOptions);
				}
			},
		},
	});
}
