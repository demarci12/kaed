'use client';

import { useEffect, useRef, useState } from 'react';
import { cx } from '@/components/ui';

/**
 * The free-form thinking space: one big text box that grows with its content
 * and saves on blur (and after a pause in typing, so a closed tab doesn't
 * lose a long stretch of thought).
 */
export function ThinkingSpace({ id, initial }: { id: string; initial: string }) {
	const [text, setText] = useState(initial);
	const saved = useRef(initial);
	const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
	const [error, setError] = useState<string | null>(null);
	const area = useRef<HTMLTextAreaElement>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	function fit() {
		const el = area.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${Math.max(el.scrollHeight + 2, 320)}px`;
	}
	useEffect(fit, [text]);
	useEffect(() => {
		window.addEventListener('resize', fit);
		return () => window.removeEventListener('resize', fit);
	}, []);

	async function save(value: string) {
		if (timer.current) clearTimeout(timer.current);
		if (value.trim() === saved.current.trim()) return;
		setStatus('saving');
		setError(null);
		try {
			const res = await fetch(`/api/idea-lab/worksheet/${id}/field`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ field: 'thinking', value }),
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok) throw new Error(payload?.error || 'Could not save.');
			saved.current = value;
			setStatus('saved');
		} catch (e) {
			setStatus('error');
			setError(e instanceof Error ? e.message : 'Could not save.');
		}
	}

	return (
		<div>
			<textarea
				ref={area}
				value={text}
				onChange={(e) => {
					setText(e.target.value);
					if (timer.current) clearTimeout(timer.current);
					const next = e.target.value;
					timer.current = setTimeout(() => save(next), 1500);
				}}
				onBlur={() => save(text)}
				aria-label="Thinking space"
				placeholder="Think here — problems you've noticed, frustrations, ideas, what you learned from the playbook below…"
				spellCheck={false}
				className="w-full font-sans text-[15px] leading-relaxed text-ink bg-paper border border-line rounded-[14px] px-5 py-4 outline-none focus:border-ink resize-none overflow-hidden"
			/>
			<p className={cx('mt-1.5 mb-0 text-xs h-4', status === 'error' ? 'text-negative' : 'text-muted')} aria-live="polite">
				{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? error : ''}
			</p>
		</div>
	);
}
