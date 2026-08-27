import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { createSupabaseServerClient } from '@/lib/supabase';
import { isMember } from '@/lib/auth';
import { Nav, type NavGroup } from '@/components/Nav';

export const metadata: Metadata = {
	title: 'KAED',
	icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico' }] },
};

const GROUPS: NavGroup[] = [
	{ label: 'Delivery', links: [['/business-ideas', 'Business ideas'], ['/projects', 'Projects'], ['/system-design', 'System design']] },
	{ label: 'Personal', links: [['/freedom', 'Freedom'], ['/goals', 'Goals'], ['/specific-knowledge', 'Specific knowledge']] },
	{ label: 'Sales & Marketing', links: [['/clients', 'CRM']] },
	{ label: 'Finance', links: [['/finance', 'Personal finance'], ['/finance/investments', 'Investments']] },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	return (
		<html lang="en">
			<body>
				<div className="w-[min(1120px,calc(100%-48px))] max-md:w-[calc(100%-24px)] mx-auto min-h-dvh flex flex-col">
					<header className="flex items-center justify-between gap-3 flex-wrap py-6 md:py-7 border-b border-line">
						<Link href="/" className="font-serif text-[22px] font-semibold tracking-[-0.01em] text-ink no-underline">KAED</Link>
						{user ? (
							<Nav email={user.email ?? ''} groups={GROUPS} memberOnly={isMember(user)} />
						) : (
							<Link href="/login" className="inline-flex items-center min-h-10 px-[18px] rounded-full border border-line text-sm text-ink no-underline hover:border-ink">Log in</Link>
						)}
					</header>
					<main className="flex-1 py-8 md:py-16">{children}</main>
					<footer className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start py-6 border-t border-line text-[13px] text-muted">
						<span>KAED — built by Marton Deak</span>
						<span>© {new Date().getFullYear()}</span>
					</footer>
				</div>
			</body>
		</html>
	);
}
