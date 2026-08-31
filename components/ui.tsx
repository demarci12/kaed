import type { ReactNode } from 'react';

/**
 * The design system as class strings.
 *
 * Every visual decision lives here as Tailwind utilities. Pages compose these
 * rather than writing CSS, so there is exactly one styling system and no
 * specificity to reason about -- the failure mode that motivated the rewrite.
 */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

export const btn =
	'inline-flex items-center justify-center gap-2 min-h-10 px-[18px] rounded-full border border-ink bg-ink text-white font-sans text-sm font-medium no-underline cursor-pointer transition-colors hover:bg-transparent hover:text-ink disabled:opacity-45 disabled:cursor-not-allowed';

export const btnGhost =
	'inline-flex items-center justify-center gap-2 min-h-10 px-[18px] rounded-full border border-line bg-transparent text-ink font-sans text-sm font-medium no-underline cursor-pointer transition-colors hover:border-ink disabled:opacity-45 disabled:cursor-not-allowed';

export const btnDanger =
	'inline-flex items-center justify-center gap-2 min-h-10 px-[18px] rounded-full border border-[--color-negative-line] bg-transparent text-[--color-negative] font-sans text-sm font-medium no-underline cursor-pointer transition-colors hover:bg-[--color-negative-bg]';

export const card =
    'flex flex-col gap-2.5 p-5 bg-paper border border-line rounded-2xl min-w-0';
export const cardGrid = 'mt-10 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]';
export const cardHead = 'flex items-start justify-between gap-3 flex-wrap';
export const cardTitle = 'flex-[1_1_10rem] min-w-0 font-serif text-[19px] font-semibold leading-tight text-ink no-underline';
export const cardActions = 'flex items-center gap-1.5 ml-auto shrink-0';
export const cardLabel = 'text-[11px] font-semibold tracking-[0.06em] uppercase text-muted';
export const cardValue = 'm-0 py-2 px-2.5 rounded-lg border border-transparent text-sm leading-relaxed text-ink whitespace-pre-wrap';
export const cardFoot = 'flex items-center justify-between gap-3 mt-auto pt-1';
export const cardDate = 'text-xs text-muted tabular-nums whitespace-nowrap';

export const iconBtn =
	'inline-flex items-center justify-center w-[22px] h-[22px] shrink-0 rounded-md border border-transparent bg-transparent text-muted text-xs leading-none cursor-pointer transition-colors hover:border-ink hover:text-ink disabled:opacity-35 disabled:cursor-default';
export const deleteBtn =
	'inline-flex items-center justify-center w-[26px] h-[26px] shrink-0 rounded-full border border-transparent bg-transparent text-muted text-base leading-none cursor-pointer transition-colors hover:border-[--color-negative-line] hover:text-[--color-negative]';

export const chip = 'inline-block px-2.5 py-1 rounded-full border border-line bg-canvas text-xs text-ink no-underline';
export const chipMuted = 'inline-block px-2.5 py-1 rounded-full border border-line bg-canvas text-xs text-muted';

export const tableWrap = 'overflow-x-auto border border-line rounded-2xl bg-paper';
export const table = 'w-full border-collapse text-sm';
export const th = 'text-left px-4 py-3 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted border-b border-line';
export const thNum = 'text-right px-4 py-3 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted border-b border-line whitespace-nowrap';
export const td = 'px-4 py-2.5 border-b border-line';
export const tdNum = 'px-4 py-2.5 border-b border-line text-right tabular-nums whitespace-nowrap';

export const input =
	'w-full h-11 px-3.5 rounded-[10px] border border-line bg-canvas text-base text-ink font-sans outline-none transition-colors focus:border-ink focus:shadow-[0_0_0_3px_rgb(20_17_15/0.08)]';
export const textarea =
	'w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-canvas text-base text-ink font-sans outline-none resize-y transition-colors focus:border-ink focus:shadow-[0_0_0_3px_rgb(20_17_15/0.08)]';
export const label = 'block mt-[18px] mb-1.5 first:mt-0 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted';

/** Status pill colours, keyed by the value stored in the database. */
const PILL: Record<string, string> = {
	lead: 'bg-canvas text-muted', not_started: 'bg-canvas text-muted',
	contacted: 'bg-info-bg text-info', active: 'bg-info-bg text-info', saving: 'bg-info-bg text-info',
	in_progress: 'bg-warn-bg text-warn', negotiating: 'bg-warn-bg text-warn',
	won: 'bg-positive-bg text-positive', done: 'bg-positive-bg text-positive',
	income: 'bg-positive-bg text-positive', closed: 'bg-positive-bg text-positive',
	lost: 'bg-negative-bg text-negative', expense: 'bg-negative-bg text-negative',
	open: 'bg-negative-bg text-negative', must: 'bg-negative-bg text-negative',
	idea: 'bg-canvas text-muted', building: 'bg-info-bg text-info',
	bootstrapped: 'bg-warn-bg text-warn', funded: 'bg-positive-bg text-positive',
	profitable: 'bg-positive-bg text-positive', paused: 'bg-negative-bg text-negative',
	obsession: 'bg-accent-bg text-accent', skill: 'bg-info-bg text-info',
	experience: 'bg-warn-bg text-warn', strength: 'bg-positive-bg text-positive',
	primary: 'bg-info-bg text-info', secondary: 'bg-warn-bg text-warn', system: 'bg-accent-bg text-accent',
	functional: 'bg-info-bg text-info', non_functional: 'bg-accent-bg text-accent',
	should: 'bg-warn-bg text-warn', could: 'bg-info-bg text-info', wont: 'bg-canvas text-muted',
	testing: 'bg-warn-bg text-warn', go: 'bg-positive-bg text-positive', no_go: 'bg-negative-bg text-negative',
};

export function Pill({ value, children }: { value: string; children: ReactNode }) {
	return (
		<span className={cx('inline-block px-2.5 py-1 rounded-full text-xs font-medium', PILL[value] ?? 'bg-canvas text-muted')}>
			{children}
		</span>
	);
}

export function PageHead({ eyebrow, title, lede, actions }: {
	eyebrow?: string; title: string; lede?: ReactNode; actions?: ReactNode;
}) {
	return (
		<div className="flex items-end justify-between gap-6 flex-wrap">
			<div className="min-w-0">
				{eyebrow && <p className="m-0 mb-2 text-[13px] tracking-[0.16em] uppercase text-muted">{eyebrow}</p>}
				<h1 className="m-0 font-serif text-[clamp(1.9rem,4vw,2.6rem)] font-semibold tracking-[-0.02em]">{title}</h1>
				{lede && <p className="mt-3 mb-0 max-w-[60ch] text-muted leading-relaxed">{lede}</p>}
			</div>
			{actions && <div className="flex items-center gap-2.5 flex-wrap shrink-0">{actions}</div>}
		</div>
	);
}

export function Empty({ children }: { children: ReactNode }) {
	return <p className="col-span-full m-0 py-8 px-4 text-center text-muted border border-dashed border-line rounded-2xl">{children}</p>;
}

export function FormError({ children }: { children: ReactNode }) {
	if (!children) return null;
	return <p className="mt-4 mb-0 py-2.5 px-3.5 rounded-[10px] bg-negative-bg border border-negative-line text-[--color-negative] text-sm">{children}</p>;
}
