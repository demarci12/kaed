'use client';

import Link from 'next/link';
import { useState } from 'react';
import { btn, btnGhost, cx } from './ui';

export interface NavGroup { label: string; links: [string, string][] }

/**
 * Site nav. Desktop shows dropdown groups; mobile shows one hamburger panel.
 * Both render from the same `groups` array so they cannot drift apart -- in
 * the Astro version they were duplicated markup and every nav change had to
 * be made twice.
 */
export function Nav({ email, groups, memberOnly }: { email: string; groups: NavGroup[]; memberOnly: boolean }) {
	const [openGroup, setOpenGroup] = useState<string | null>(null);
	const [mobileOpen, setMobileOpen] = useState(false);

	if (memberOnly) {
		return (
			<nav className="flex items-center gap-4 text-sm">
				<Link href="/finance" className="text-muted no-underline hover:text-ink">Finance</Link>
				<SignOut />
			</nav>
		);
	}

	return (
		<>
			<nav className="hidden md:flex items-center gap-4 text-sm">
				{groups.map((g) => (
					<div key={g.label} className="relative" onMouseLeave={() => setOpenGroup(null)}>
						<button
							type="button"
							onClick={() => setOpenGroup(openGroup === g.label ? null : g.label)}
							className="bg-transparent border-0 p-0 text-muted cursor-pointer hover:text-ink"
						>
							{g.label} <span className="text-[10px] align-middle">▾</span>
						</button>
						{openGroup === g.label && (
							<div className="absolute top-[calc(100%+12px)] left-0 z-20 flex flex-col min-w-40 p-2 rounded-xl border border-line bg-paper shadow-[0_12px_32px_-12px_rgb(20_17_15/0.25)]">
								{g.links.map(([href, label]) => (
									<Link key={href} href={href} onClick={() => setOpenGroup(null)}
										className="px-2.5 py-2 rounded-lg text-sm text-ink no-underline hover:bg-canvas">{label}</Link>
								))}
							</div>
						)}
					</div>
				))}
				<span className="text-ink tabular-nums">{email}</span>
				{/* Explicit text-white: this is the one filled button in a row of
				    muted links, and it must not inherit the link colour. */}
				<Link href="/opl" className={cx(btn, 'min-h-0 px-4 py-[7px] text-[13px] text-white hover:text-ink')}>OPL</Link>
				<SignOut />
			</nav>

			<div className="md:hidden relative">
				<button type="button" aria-label="Menu" onClick={() => setMobileOpen(!mobileOpen)}
					className="flex items-center justify-center w-11 h-11 rounded-full border border-line bg-transparent cursor-pointer">
					<span className="relative block w-[18px] h-[13px]">
						<span className={cx('absolute inset-x-0 top-0 h-[1.5px] bg-ink transition-transform', mobileOpen && 'translate-y-[5.5px] rotate-45')} />
						<span className={cx('absolute inset-x-0 top-[5.5px] h-[1.5px] bg-ink transition-opacity', mobileOpen && 'opacity-0')} />
						<span className={cx('absolute inset-x-0 bottom-0 h-[1.5px] bg-ink transition-transform', mobileOpen && '-translate-y-[5.5px] -rotate-45')} />
					</span>
				</button>
				{mobileOpen && (
					<div className="absolute top-[calc(100%+12px)] right-0 z-20 flex flex-col gap-1 w-[min(85vw,320px)] max-h-[75dvh] overflow-y-auto p-2 rounded-xl border border-line bg-paper shadow-[0_12px_32px_-12px_rgb(20_17_15/0.25)]">
						<Link href="/opl" onClick={() => setMobileOpen(false)} className={cx(btn, 'w-full my-1 text-white hover:text-ink')}>OPL</Link>
						{groups.map((g) => (
							<div key={g.label}>
								<p className="m-0 mt-2.5 mb-0.5 px-3 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted">{g.label}</p>
								{g.links.map(([href, label]) => (
									<Link key={href} href={href} onClick={() => setMobileOpen(false)}
										className="flex items-center min-h-11 px-3 rounded-lg text-[15px] text-ink no-underline hover:bg-canvas">{label}</Link>
								))}
							</div>
						))}
						<div className="mt-2 pt-3 border-t border-line flex flex-col gap-2.5">
							<span className="px-3 text-[13px] text-muted break-all">{email}</span>
							<SignOut full />
						</div>
					</div>
				)}
			</div>
		</>
	);
}

function SignOut({ full }: { full?: boolean }) {
	return (
		<form action="/api/auth/signout" method="post" className={full ? 'px-1' : ''}>
			<button type="submit" className={cx(btnGhost, full && 'w-full')}>Sign out</button>
		</form>
	);
}
