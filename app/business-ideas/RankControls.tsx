'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { iconBtn } from '@/components/ui';

/**
 * Rank badge + move buttons. The Astro version reordered the DOM by hand after
 * each call; here the server is re-rendered via router.refresh(), so the
 * displayed order always matches the stored ranks.
 */
export function RankControls({ id, position, isFirst, isLast }: {
	id: string; position: number; isFirst: boolean; isLast: boolean;
}) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);

	async function move(direction: 'up' | 'down') {
		setBusy(true);
		try {
			const response = await fetch(`/api/business-ideas/${id}/move`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ direction }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Could not reorder.');
			if (payload.moved) router.refresh();
		} catch (error) {
			console.error(error);
		} finally {
			setBusy(false);
		}
	}

	return (
		<>
			<button
				type="button"
				className={iconBtn}
				aria-label="Move up"
				disabled={isFirst || busy}
				onClick={() => move('up')}
			>↑</button>
			<button
				type="button"
				className={iconBtn}
				aria-label="Move down"
				disabled={isLast || busy}
				onClick={() => move('down')}
			>↓</button>
		</>
	);
}

/** Click-to-edit rank badge: type a 1-based position, Enter to commit. */
export function RankBadge({ id, position }: { id: string; position: number }) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [busy, setBusy] = useState(false);

	const badgeClass =
		'inline-flex items-center justify-center w-[26px] h-[26px] shrink-0 rounded-full border border-line bg-canvas text-xs font-semibold tabular-nums text-muted cursor-pointer transition-colors hover:border-ink hover:text-ink disabled:opacity-45';

	async function commit(raw: string) {
		setEditing(false);
		const value = Number(raw);
		if (!Number.isFinite(value) || value < 1 || value === position) return;

		setBusy(true);
		try {
			const response = await fetch(`/api/business-ideas/${id}/rank`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ position: value }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Could not set position.');
			router.refresh();
		} catch (error) {
			console.error(error);
		} finally {
			setBusy(false);
		}
	}

	if (editing) {
		return (
			<input
				type="number"
				min={1}
				autoFocus
				defaultValue={position}
				onFocus={(e) => e.target.select()}
				onBlur={(e) => commit(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
					if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
				}}
				className="w-[46px] h-[26px] shrink-0 px-1.5 rounded-full border border-ink bg-paper text-xs text-center tabular-nums outline-none"
			/>
		);
	}

	return (
		<button
			type="button"
			className={badgeClass}
			title="Click to set position"
			disabled={busy}
			onClick={() => setEditing(true)}
		>{position}</button>
	);
}
