import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Request-scoped Supabase client backed by Next's cookie store.
 *
 * Server Components are not allowed to write cookies, so setAll is wrapped in
 * a try/catch: when Supabase refreshes a token during a page render the write
 * throws and is swallowed, and middleware.ts performs the real refresh on the
 * next request. Route Handlers and Server Actions can write, so there the
 * catch never fires.
 */
export async function createSupabaseServerClient() {
	const cookieStore = await cookies();

	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
				try {
					for (const { name, value, options } of cookiesToSet) {
						cookieStore.set(name, value, options);
					}
				} catch {
					// Server Component render: middleware refreshes instead.
				}
			},
		},
	});
}
