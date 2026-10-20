'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { chip, chipMuted, cx } from '@/components/ui';

export type LinkedIdea = { id: string; title: string; archived: boolean };

/**
 * Business ideas a pain is linked to: a chip per idea (× unlinks) and a picker
 * for the ideas it isn't linked to yet. Same "POST, then router.refresh()"
 * contract as InlineEdit -- the server render stays the source of truth.
 */
export function IdeaLinks({ painId, linked, options }: {
	painId: string;
	linked: LinkedIdea[];
	options: { id: string; title: string }[];
}) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function call(action: 'link' | 'unlink', ideaId: string) {
		setBusy(true);
		setError(null);
		try {
			const res = await fetch(`/api/painhunter/${painId}/${action}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ business_idea_id: ideaId }),
			});
			const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
			if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not save.');
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not save.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className={cx('flex flex-wrap items-center gap-1.5', busy && 'opacity-60')}>
			{linked.map((idea) => (
				<span key={idea.id} className={cx(idea.archived ? chipMuted : chip, 'inline-flex items-center gap-1.5')}>
					<Link href={`/business-ideas/${idea.id}`} className="text-inherit no-underline hover:underline">
						{idea.title}{idea.archived ? ' (archived)' : ''}
					</Link>
					<button
						type="button"
						aria-label={`Unlink ${idea.title}`}
						title="Unlink"
						disabled={busy}
						onClick={() => call('unlink', idea.id)}
						className="border-0 bg-transparent p-0 text-muted leading-none cursor-pointer hover:text-ink"
					>×</button>
				</span>
			))}
			{options.length > 0 && (
				<select
					aria-label="Link a business idea"
					value=""
					disabled={busy}
					onChange={(e) => { if (e.target.value) call('link', e.target.value); }}
					className="max-w-full h-[26px] px-2 rounded-full border border-line bg-canvas text-xs text-muted cursor-pointer outline-none hover:border-ink"
				>
					<option value="">{linked.length ? '+ Link another' : '+ Link a business idea'}</option>
					{options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
				</select>
			)}
			{!linked.length && !options.length && <span className="text-xs text-muted">No business ideas yet.</span>}
			{error && <span className="w-full text-xs text-[--color-negative]">{error}</span>}
		</div>
	);
}
