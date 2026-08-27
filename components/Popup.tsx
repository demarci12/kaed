'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { btn, btnGhost, cx } from './ui';

/**
 * Modal dialog. The mobile bottom-sheet sizing is expressed in utilities, with
 * one deliberate inline max-width: the UA stylesheet's
 * `dialog { max-width: calc(100% - 6px - 2em) }` silently beat width:100% and
 * left every sheet 38px narrower than the phone.
 */
export function Popup({ trigger, title, children }: { trigger: (open: () => void) => ReactNode; title: string; children: (close: () => void) => ReactNode; }) {
	const ref = useRef<HTMLDialogElement>(null);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const d = ref.current;
		if (!d) return;
		if (open && !d.open) d.showModal();
		if (!open && d.open) d.close();
	}, [open]);

	return (
		<>
			{trigger(() => setOpen(true))}
			<dialog
				ref={ref}
				onClose={() => setOpen(false)}
				onClick={(e) => { if (e.target === ref.current) setOpen(false); }}
				style={{ maxWidth: 'none' }}
				className={cx(
					'w-full sm:w-[min(480px,100%)] m-0 sm:m-auto p-5 sm:p-8',
					'fixed bottom-0 left-0 right-0 sm:static',
					'max-h-[85dvh] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto',
					'rounded-t-[20px] sm:rounded-[18px] border border-line border-b-0 sm:border-b bg-paper text-ink',
					'pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.25rem))] sm:pb-8',
					'shadow-[0_32px_64px_-16px_rgb(20_17_15/0.32)]',
				)}
			>
				<div className="flex items-start justify-between gap-3 mb-1">
					<h2 className="m-0 font-serif text-2xl font-semibold tracking-[-0.01em]">{title}</h2>
					<button type="button" onClick={() => setOpen(false)} aria-label="Close"
						className="shrink-0 w-8 h-8 rounded-full border border-transparent bg-transparent text-xl leading-none text-muted cursor-pointer hover:border-line">
						&times;
					</button>
				</div>
				<div className="pt-4 border-t border-line">{children(() => setOpen(false))}</div>
			</dialog>
		</>
	);
}

export function PopupActions({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) {
	return (
		<div className="flex justify-end gap-2.5 mt-6 flex-wrap">
			<button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>
			<button type="submit" className={btn}>{submitLabel}</button>
		</div>
	);
}
