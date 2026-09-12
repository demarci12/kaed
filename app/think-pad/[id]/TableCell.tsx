'use client';

import { useEffect, useRef, useState } from 'react';
import type { ThinkPadColumn } from '@/lib/think-pad';
import { cx } from '@/components/ui';

/**
 * One editable cell in a Think Pad table -- same click-to-edit, save-on-blur
 * shape as InlineEdit, but posts {column, value} to /api/think-pad/table-rows/:id
 * instead of {field, value} to a *-/field route, and renders the input type
 * that matches the column's type (select gets a real <select>).
 */
export function TableCell({ rowId, column, value }: { rowId: string; column: ThinkPadColumn; value: string }) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [current, setCurrent] = useState(value);
	const ref = useRef<HTMLInputElement | HTMLSelectElement>(null);

	useEffect(() => setCurrent(value), [value]);

	useEffect(() => {
		if (!editing) return;
		ref.current?.focus();
		if (ref.current instanceof HTMLInputElement) ref.current.select();
	}, [editing]);

	async function save(next: string) {
		setEditing(false);
		if (next === current) return;
		setSaving(true);
		setError(null);
		try {
			const res = await fetch(`/api/think-pad/table-rows/${rowId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ column: column.name, value: next }),
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not save.');
			setCurrent(next);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not save.');
		} finally {
			setSaving(false);
		}
	}

	if (editing) {
		const shared = 'w-full font-sans text-sm text-inherit bg-paper border border-ink rounded-md px-2 py-1 outline-none';
		if (column.type === 'select') {
			return (
				<select
					ref={ref as React.Ref<HTMLSelectElement>}
					className={shared}
					defaultValue={current}
					onBlur={(e) => save(e.target.value)}
					onChange={(e) => save(e.target.value)}
				>
					<option value=""></option>
					{(column.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
				</select>
			);
		}
		return (
			<input
				ref={ref as React.Ref<HTMLInputElement>}
				type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
				step={column.type === 'number' ? 'any' : undefined}
				className={shared}
				defaultValue={current}
				onBlur={(e) => save(e.target.value.trim())}
				onKeyDown={(e) => {
					if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
					if (e.key === 'Escape') setEditing(false);
				}}
			/>
		);
	}

	return (
		<span
			role="button"
			tabIndex={0}
			onClick={() => setEditing(true)}
			onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true); } }}
			title={error ?? 'Click to edit'}
			className={cx(
				'block min-w-[80px] min-h-[1.5rem] px-1.5 py-1 -mx-1.5 -my-1 rounded-md cursor-text hover:bg-canvas',
				saving && 'opacity-50',
				error && 'ring-1 ring-[--color-negative-line]',
			)}
		>
			{current || <span className="text-muted">—</span>}
		</span>
	);
}
