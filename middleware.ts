import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Refreshes the Supabase session on every request. Server Components cannot
 * write cookies, so without this a token that expires mid-session would never
 * be renewed and the user would be silently signed out.
 */
export async function middleware(request: NextRequest) {
	let response = NextResponse.next({ request });

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll: () => request.cookies.getAll(),
				setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
					for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
					response = NextResponse.next({ request });
					for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
				},
			},
		},
	);

	await supabase.auth.getUser();
	return response;
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
