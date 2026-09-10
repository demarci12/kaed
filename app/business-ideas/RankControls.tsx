'use client';

import { useState } from 'react';
import { iconBtn } from '@/components/ui';

/**
 * Rank badge + move buttons — presentational only. The parent list owns the
 * ordering state and performs optimistic reorders, so these just report intent
 * via callbacks; nothing here refreshes the page.
 */
export function RankControls({ isFirst, isLast, busy, onMove }: {
	isFirst: boolean;
	isLast: boolean;
	busy: boolean;
	onMove: (direction: 'up' | 'down') => void;
}) {
	return (
		<>
			<button
				type="button"
				className={iconBtn}
				aria-label="Move up"
				disabled={isFirst || busy}
				onClick={() => onMove('up')}
			>↑</button>
			<button
				type="button"
				className={iconBtn}
				aria-label="Move down"
				disabled={isLast || busy}
				onClick={() => onMove('down')}
			>↓</button>
		</>
	);
}

/** Click-to-edit rank badge: type a 1-based position, Enter to commit. */
export function RankBadge({ position, busy, onRank }: {
	position: number;
	busy: boolean;
	onRank: (position: number) => void;
}) {
	const [editing, setEditing] = useState(false);

	const badgeClass =
		'inline-flex items-center justify-center w-[26px] h-[26px] shrink-0 rounded-full border border-line bg-canvas text-xs font-semibold tabular-nums text-muted cursor-pointer transition-colors hover:border-ink hover:text-ink disabled:opacity-45';

	function commit(raw: string) {
		setEditing(false);
		const value = Number(raw);
		if (!Number.isFinite(value) || value < 1 || value === position) return;
		onRank(value);
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
