'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cx, scoreSelect } from '@/components/ui';

/**
 * One always-visible 1-5 dropdown for a score. Saves on change through the
 * pain's field endpoint, then refreshes so the total and the ranking catch up
 * -- same contract as InlineEdit, minus the click-to-reveal step.
 */
export function ScoreSelect({ id, field, value, label, hint }: {
	id: string;
	field: string;
	value: number | null;
	label: string;
	hint: string;
}) {
	const router = useRouter();
	const [current, setCurrent] = useState(value == null ? '' : String(value));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Server stays the source of truth: adopt a fresh render.
	useEffect(() => setCurrent(value == null ? '' : String(value)), [value]);

	async function change(next: string) {
		const previous = current;
		setCurrent(next);
		setSaving(true);
		setError(null);
		try {
			const res = await fetch(`/api/painhunter/${id}/field`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ field, value: next }),
			});
			const payload = (await res.json().catch(() => null)) as { error?: string } | null;
			if (!res.ok) throw new Error(payload?.error || 'Could not save.');
			router.refresh();
		} catch (e) {
			setCurrent(previous);
			setError(e instanceof Error ? e.message : 'Could not save.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<select
			aria-label={label}
			title={error ?? hint}
			value={current}
			disabled={saving}
			onChange={(e) => change(e.target.value)}
			className={cx(scoreSelect, !current && 'text-muted', error && 'border-[--color-negative-line]')}
		>
			<option value="">–</option>
			{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
		</select>
	);
}
