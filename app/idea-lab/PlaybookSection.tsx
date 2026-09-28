'use client';

import { useEffect, useRef, useState } from 'react';
import { btnGhost, cx } from '@/components/ui';
import { Markdown } from './Markdown';

export interface PlaybookRow { id: string; title: string; body: string | null; notes: string | null }

type Field = 'title' | 'body' | 'notes';
type Status = 'idle' | 'saving' | 'saved' | 'error';

const box =
	'w-full font-sans text-[15px] leading-relaxed text-ink bg-canvas border border-line rounded-[10px] px-3.5 py-2.5 outline-none focus:border-ink';

/** GitHub-style heading slug, so the table of contents' `#1-the-core-philosophy` links land here. */
export const slug = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');

/** A textarea that grows to fit what's in it. */
function AutoArea({ value, onChange, onBlur, minRows = 3, ...rest }: {
	value: string; onChange: (v: string) => void; onBlur: () => void; minRows?: number;
	placeholder?: string; 'aria-label'?: string;
}) {
	const ref = useRef<HTMLTextAreaElement>(null);
	function fit() {
		const el = ref.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight + 2}px`;
	}
	useEffect(fit, [value]);
	useEffect(() => {
		window.addEventListener('resize', fit);
		return () => window.removeEventListener('resize', fit);
	}, []);
	return (
		<textarea
			ref={ref}
			value={value}
			rows={minRows}
			spellCheck={false}
			onChange={(e) => onChange(e.target.value)}
			onBlur={onBlur}
			className={cx(box, 'resize-none overflow-hidden')}
			{...rest}
		/>
	);
}

/**
 * One playbook section: the text rendered as formatted markdown (Edit flips it
 * to raw title + body inputs), and under it an empty "My notes" box for your
 * own thinking. Everything saves on blur through the field route -- no
 * router.refresh(), so typing in the next box is never interrupted.
 */
export function PlaybookSection({ row, index }: { row: PlaybookRow; index: number }) {
	const [title, setTitle] = useState(row.title);
	const [body, setBody] = useState(row.body ?? '');
	const [notes, setNotes] = useState(row.notes ?? '');
	const [editing, setEditing] = useState(false);
	const saved = useRef<Record<Field, string>>({ title: row.title, body: row.body ?? '', notes: row.notes ?? '' });
	const [status, setStatus] = useState<Status>('idle');
	const [error, setError] = useState<string | null>(null);

	async function save(field: Field, value: string) {
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

	/** Flip the `[ ]` / `[x]` of the task item that starts at `offset` in the body. */
	function toggleTask(offset: number) {
		const rest = body.slice(offset);
		const next = body.slice(0, offset) + rest.replace(/\[( |x|X)\]/, (_, m: string) => (m === ' ' ? '[x]' : '[ ]'));
		if (next === body) return;
		setBody(next);
		save('body', next);
	}

	const isHead = index === 0;
	const canNote = index >= 2; // the intro and the table of contents don't need a notes box

	return (
		<article id={slug(title)} className="scroll-mt-6">
			<div className="flex items-start gap-3 mb-3">
				{editing ? (
					<input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						onBlur={() => save('title', title)}
						aria-label="Section title"
						className={cx(box, 'font-serif text-lg font-semibold flex-1 min-w-0')}
					/>
				) : (
					<h2 className={cx('m-0 flex-1 min-w-0 font-serif font-semibold tracking-[-0.01em] leading-tight', isHead ? 'text-[clamp(1.7rem,4vw,2.3rem)]' : 'text-[clamp(1.35rem,3vw,1.7rem)]')}>
						{title}
					</h2>
				)}
				<span aria-live="polite" className={cx('shrink-0 text-xs w-14 text-right pt-2', status === 'error' ? 'text-negative' : 'text-muted')}>
					{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Failed' : ''}
				</span>
				<button type="button" className={cx(btnGhost, 'shrink-0 !py-1.5 !px-3 text-[13px]')} onClick={() => setEditing((v) => !v)}>
					{editing ? 'Done' : 'Edit text'}
				</button>
			</div>

			{editing ? (
				<AutoArea value={body} onChange={setBody} onBlur={() => save('body', body)} minRows={6} aria-label={`${title} — text`} />
			) : (
				<Markdown onToggle={toggleTask}>{body}</Markdown>
			)}

			{canNote && (
				<div className="mt-6">
					<p className="mt-0 mb-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted">My notes</p>
					<AutoArea
						value={notes}
						onChange={setNotes}
						onBlur={() => save('notes', notes)}
						minRows={3}
						placeholder="Your notes on this section…"
						aria-label={`Notes on ${title}`}
					/>
				</div>
			)}
			{error && <p className="mt-1 mb-0 text-xs text-negative">{error}</p>}
		</article>
	);
}
