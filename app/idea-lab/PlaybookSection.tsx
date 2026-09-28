'use client';

import { useEffect, useRef, useState } from 'react';
import { cx } from '@/components/ui';

export interface PlaybookRow { id: string; title: string; body: string | null }

type Status = 'idle' | 'saving' | 'saved' | 'error';

const box =
	'w-full font-sans text-[15px] leading-relaxed text-ink bg-canvas border border-line rounded-[10px] px-3.5 py-2.5 outline-none focus:border-ink';

/**
 * One section of the playbook as two plain text inputs (title, body). Saves on
 * blur through the field route -- no router.refresh(), so typing in the next
 * box is never interrupted by a re-render. The body textarea grows to fit its
 * content so a section reads like a page, not a scroll-box.
 */
export function PlaybookSection({ row, index }: { row: PlaybookRow; index: number }) {
	const [title, setTitle] = useState(row.title);
	const [body, setBody] = useState(row.body ?? '');
	const saved = useRef({ title: row.title, body: row.body ?? '' });
	const [status, setStatus] = useState<Status>('idle');
	const [error, setError] = useState<string | null>(null);
	const area = useRef<HTMLTextAreaElement>(null);

	function fit() {
		const el = area.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight + 2}px`;
	}
	useEffect(fit, [body]);
	useEffect(() => {
		window.addEventListener('resize', fit);
		return () => window.removeEventListener('resize', fit);
	}, []);

	async function save(field: 'title' | 'body', value: string) {
		if (value.trim() === saved.current[field].trim()) return;
		if (field === 'title' && !value.trim()) {
			setTitle(saved.current.title);
			return;
		}
		setStatus('saving');
		setError(null);
		try {
			const res = await fetch(`/api/idea-lab/playbook/${row.id}/field`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ field, value }),
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok) throw new Error(payload?.error || 'Could not save.');
			saved.current[field] = value;
			setStatus('saved');
		} catch (e) {
			setStatus('error');
			setError(e instanceof Error ? e.message : 'Could not save.');
		}
	}

	return (
		<div id={`section-${index}`} className="scroll-mt-6">
			<div className="flex items-center gap-3 mb-2">
				<input
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					onBlur={() => save('title', title)}
					aria-label="Section title"
					className={cx(box, 'font-serif text-lg font-semibold flex-1 min-w-0')}
				/>
				<span
					aria-live="polite"
					className={cx('shrink-0 text-xs w-14 text-right', status === 'error' ? 'text-negative' : 'text-muted')}
				>
					{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Failed' : ''}
				</span>
			</div>
			<textarea
				ref={area}
				value={body}
				onChange={(e) => setBody(e.target.value)}
				onBlur={() => save('body', body)}
				aria-label={`${title} — text`}
				rows={4}
				spellCheck={false}
				className={cx(box, 'resize-none overflow-hidden')}
			/>
			{error && <p className="mt-1 mb-0 text-xs text-negative">{error}</p>}
		</div>
	);
}
