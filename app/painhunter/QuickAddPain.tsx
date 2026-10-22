'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition, type FormEvent } from 'react';
import { btn, cx, FormError, input } from '@/components/ui';
import { postForm } from './submit';

/**
 * The frustration-journal bar. Saves in the background and refreshes the list
 * in place -- no page reload -- then clears itself and keeps the cursor in the
 * title box so several pains can be logged back to back. Still a real
 * `<form method="post">`, so it degrades to a normal post without JS.
 */
export function QuickAddPain() {
	const router = useRouter();
	const titleRef = useRef<HTMLInputElement>(null);
	const [saving, setSaving] = useState(false);
	const [refreshing, startRefresh] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const busy = saving || refreshing;

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = e.currentTarget;
		setSaving(true);
		setError(null);
		try {
			await postForm('/api/painhunter/create', new FormData(form));
			form.reset();
			titleRef.current?.focus();
			startRefresh(() => router.refresh());
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not save.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<>
			<form method="post" action="/api/painhunter/create" onSubmit={onSubmit} className="mt-8 flex gap-2.5 flex-wrap">
				<input type="hidden" name="source" value="journal" />
				<input
					ref={titleRef}
					className={cx(input, 'flex-[1_1_18rem] min-w-0 w-auto')}
					name="title"
					type="text"
					required
					maxLength={200}
					aria-label="Today's frustration"
					placeholder="What was slow, manual, annoying or expensive today?"
				/>
				<input
					className={cx(input, 'flex-[0_1_11rem] min-w-0 w-auto')}
					name="context"
					type="text"
					maxLength={80}
					aria-label="Context"
					placeholder="Context: work, home, bank..."
				/>
				<button type="submit" className={btn} disabled={busy}>{busy ? 'Adding…' : 'Add to journal'}</button>
			</form>
			{error && <FormError>{error}</FormError>}
		</>
	);
}
