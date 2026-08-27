import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import { isMember } from '@/lib/auth';
import { btn, cx, FormError } from '@/components/ui';

/**
 * Public, but pointless once you're signed in: an existing session is sent
 * straight to the surface that user is allowed to see.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (user) redirect(isMember(user) ? '/finance' : '/projects');

	const { error } = await searchParams;

	return (
		<section className="max-w-[420px] mx-auto my-16">
			<p className="m-0 mb-4 text-[13px] tracking-[0.16em] uppercase text-muted">KAED</p>
			<h1 className="m-0 font-serif font-semibold text-[clamp(2rem,5vw,3rem)] leading-[1.05] tracking-[-0.02em]">Log in.</h1>

			{error && <FormError>{error}</FormError>}

			<form method="post" action="/api/auth/signin" className="flex flex-col gap-1.5 mt-8 p-7 bg-paper border border-line rounded-2xl">
				<label htmlFor="email" className="mt-3.5 text-[13px] font-medium text-muted">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					autoComplete="email"
					className="h-12 px-4 font-sans text-[15px] text-ink bg-canvas border border-line rounded-[10px] outline-none transition-colors duration-150 focus:border-ink"
				/>

				<label htmlFor="password" className="mt-3.5 text-[13px] font-medium text-muted">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					autoComplete="current-password"
					className="h-12 px-4 font-sans text-[15px] text-ink bg-canvas border border-line rounded-[10px] outline-none transition-colors duration-150 focus:border-ink"
				/>

				{/* The page's single primary CTA: deliberately taller and full width. */}
				<button type="submit" className={cx(btn, 'w-full min-h-12 mt-6 text-[15px]')}>Log in</button>
			</form>
		</section>
	);
}
