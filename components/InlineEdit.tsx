'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { cx } from './ui';

type Kind = 'text' | 'textarea' | 'number' | 'date' | 'select';

/**
 * Click-to-edit cell. Replaces the Astro version's document-delegated handler:
 * React owns the listener, so there is no stale-listener class of bug after a
 * soft navigation -- the reason the old one had to be delegated from document.
 */
export function InlineEdit({
	value, field, id, endpoint, kind = 'text', options, className, display, placeholder = 'Not set.',
}: {
	value: string;
	field: string;
	id: string;
	/** e.g. "/api/projects" -- POSTs to `${endpoint}/${id}/field`. */
	endpoint: string;
	kind?: Kind;
	options?: [string, string][];
	className?: string;
	/** Rendered instead of the raw value when not editing (e.g. a Pill). */
	display?: React.ReactNode;
	placeholder?: string;
}) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [current, setCurrent] = useState(value);
	const ref = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

	// Server is the source of truth: if it re-renders with a new value (another
	// tab, a sibling edit) adopt it rather than showing a stale local copy.
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
			const res = await fetch(`${endpoint}/${id}/field`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ field, value: next }),
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok) throw new Error(payload?.error || 'Could not save.');
			setCurrent(next);
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not save.');
		} finally {
			setSaving(false);
		}
	}

	if (editing) {
		const shared = 'w-full font-sans text-inherit bg-paper border border-ink rounded-md px-2 py-1 outline-none';
		if (kind === 'select') {
			return (
				<select
					ref={ref as React.Ref<HTMLSelectElement>}
					className={shared}
					defaultValue={current}
					onBlur={(e) => save(e.target.value)}
					onChange={(e) => save(e.target.value)}
				>
					{(options ?? []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
				</select>
			);
		}
		if (kind === 'textarea') {
			return (
				<textarea
					ref={ref as React.Ref<HTMLTextAreaElement>}
					className={cx(shared, 'min-h-24 resize-y')}
					defaultValue={current}
					onBlur={(e) => save(e.target.value.trim())}
					onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
				/>
			);
		}
		return (
			<input
				ref={ref as React.Ref<HTMLInputElement>}
				type={kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text'}
				step={kind === 'number' ? 'any' : undefined}
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
				'cursor-text rounded-md transition-colors hover:bg-canvas',
				saving && 'opacity-50',
				error && 'ring-1 ring-[--color-negative-line]',
				className,
			)}
		>
			{display ?? (current || <span className="text-muted">{placeholder}</span>)}
		</span>
	);
}
