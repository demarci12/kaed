'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btnGhost, cx } from '@/components/ui';

/**
 * How often the client re-requests the page. Deliberately shorter than the
 * server's 5-minute price cache and deliberately WITHOUT ?refresh=1: most
 * polls are served from that cache for free, so prices land within a minute of
 * going stale while CoinMarketCap is still only hit once per cache window.
 */
const POLL_MS = 60 * 1000;

function ageLabel(iso: string): string {
	const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
	if (seconds < 60) return 'Updated just now';
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `Updated ${minutes} min ago`;
	return `Updated ${Math.round(minutes / 60)} h ago`;
}

/**
 * Keeps the "updated N min ago" label honest and re-renders the server
 * component once the quote is older than POLL_MS. Paused while the tab is
 * hidden -- and while a dialog is open, since a refresh behind an open sheet
 * would close it, which is worse than briefly stale prices.
 */
export function AutoRefresh({ fetchedAt }: { fetchedAt: string }) {
	const router = useRouter();
	const [label, setLabel] = useState(() => ageLabel(fetchedAt));

	useEffect(() => {
		function tick() {
			setLabel(ageLabel(fetchedAt));
			if (Date.now() - new Date(fetchedAt).getTime() < POLL_MS) return;
			if (document.hidden) return;
			if (document.querySelector('dialog[open]')) return;
			router.refresh();
		}

		// Ticks every 15s to keep the age label honest; the refresh itself is
		// still gated on POLL_MS above.
		const timer = window.setInterval(tick, 15_000);
		const onVisible = () => { if (!document.hidden) tick(); };
		document.addEventListener('visibilitychange', onVisible);
		tick();

		return () => {
			window.clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	}, [fetchedAt, router]);

	return <span>{label}</span>;
}

/**
 * Prices are computed server-side, so a real refresh means re-requesting the
 * page with ?refresh=1 -- that query param is what bypasses the 5-minute
 * cache. The spinner exists so a slow CoinMarketCap call doesn't read as a
 * dead button.
 */
export function RefreshButton() {
	const router = useRouter();
	const [pending, startTransition] = useTransition();

	return (
		<button
			type="button"
			disabled={pending}
			onClick={() => startTransition(() => {
				router.replace('/finance/investments?refresh=1');
				router.refresh();
			})}
			className={cx(btnGhost, 'shrink-0 gap-[7px]', pending && 'pointer-events-none opacity-60')}
		>
			<span aria-hidden="true" className={cx('inline-block text-sm leading-none', pending && 'animate-spin motion-reduce:animate-none')}>↻</span>
			<span>{pending ? 'Fetching…' : 'Refresh prices'}</span>
		</button>
	);
}
