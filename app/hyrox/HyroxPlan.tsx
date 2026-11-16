'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HyroxKind, HyroxTask } from '@/lib/hyrox';
import { cx } from '@/components/ui';

export interface PlanDay { day: number; title: string; duration?: string; kind: HyroxKind; kindLabel: string; tasks: HyroxTask[] }
export interface PlanWeek { week: number; label?: string; days: PlanDay[] }

/**
 * Ticks are per browser (localStorage), not in the database: the page is
 * public, so every visitor keeps their own progress and nobody needs a login.
 * Clearing site data clears the ticks.
 */
const STORAGE_KEY = 'kaed-hyrox-progress-v1';

function load(): Set<string> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const ids = raw ? JSON.parse(raw) : [];
		return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
	} catch {
		return new Set();
	}
}

function save(done: Set<string>) {
	try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...done])); } catch { /* private mode: ticks last this visit only */ }
}

/** A day is done when every required task is ticked (every task, if none is required). */
const countable = (d: PlanDay) => (d.tasks.some((t) => !t.optional) ? d.tasks.filter((t) => !t.optional) : d.tasks);
const isDayDone = (d: PlanDay, done: Set<string>) => countable(d).every((t) => done.has(t.id));

const KIND_STYLE: Record<HyroxKind, { stripe: string; pill: string }> = {
	strength: { stripe: 'border-l-info', pill: 'bg-info-bg text-info' },
	run: { stripe: 'border-l-accent', pill: 'bg-accent-bg text-accent' },
	conditioning: { stripe: 'border-l-warn', pill: 'bg-warn-bg text-warn' },
	endurance: { stripe: 'border-l-ink', pill: 'bg-canvas text-ink border border-line' },
	rest: { stripe: 'border-l-line', pill: 'bg-canvas text-muted border border-line' },
	race: { stripe: 'border-l-negative', pill: 'bg-negative-bg text-negative' },
};

const bar = 'h-2 rounded-full bg-line overflow-hidden';
const barFill = 'h-full rounded-full bg-positive transition-[width] duration-300';
const tag = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-4 whitespace-nowrap';

export function HyroxPlan({ weeks }: { weeks: PlanWeek[] }) {
	const [done, setDone] = useState<Set<string>>(new Set());
	const [loaded, setLoaded] = useState(false);

	useEffect(() => { setDone(load()); setLoaded(true); }, []);

	const update = useCallback((fn: (next: Set<string>) => void) => {
		setDone((prev) => {
			const next = new Set(prev);
			fn(next);
			save(next);
			return next;
		});
	}, []);

	const toggle = (id: string) => update((s) => (s.has(id) ? s.delete(id) : s.add(id)));
	const setDay = (d: PlanDay, on: boolean) => update((s) => {
		for (const t of on ? countable(d) : d.tasks) (on ? s.add(t.id) : s.delete(t.id));
	});

	const allDays = useMemo(() => weeks.flatMap((w) => w.days), [weeks]);
	const daysDone = allDays.filter((d) => isDayDone(d, done)).length;
	const totalTasks = allDays.reduce((n, d) => n + d.tasks.length, 0);
	const tasksDone = allDays.reduce((n, d) => n + d.tasks.filter((t) => done.has(t.id)).length, 0);
	const nextDay = allDays.find((d) => !isDayDone(d, done));

	return (
		<>
			{/* Overall progress */}
			<div className="mt-8 p-5 md:p-6 rounded-2xl border border-line bg-paper flex flex-col gap-4">
				<div className="flex items-end justify-between gap-4 flex-wrap">
					<div>
						<p className="m-0 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted">Your progress</p>
						<p className="m-0 mt-1 font-serif text-[clamp(28px,5vw,40px)] font-semibold tracking-[-0.02em] leading-none tabular-nums">
							{daysDone}<span className="text-muted text-[0.55em] font-medium"> / {allDays.length} days</span>
						</p>
						<p className="m-0 mt-1.5 text-[13px] text-muted tabular-nums">{tasksDone} of {totalTasks} tasks ticked</p>
					</div>
					<div className="flex items-center gap-2.5 flex-wrap">
						{nextDay && loaded && (
							<a href={`#day-${nextDay.day}`} className="inline-flex items-center gap-2 min-h-10 px-[18px] rounded-full border border-ink bg-ink text-white text-sm font-medium no-underline hover:bg-transparent hover:text-ink transition-colors">
								Next up: Day {nextDay.day} →
							</a>
						)}
						{tasksDone > 0 && (
							<button type="button"
								onClick={() => { if (confirm('Clear every tick on this device?')) update((s) => s.clear()); }}
								className="inline-flex items-center min-h-10 px-[18px] rounded-full border border-line bg-transparent text-sm text-muted cursor-pointer hover:border-ink hover:text-ink transition-colors">
								Reset
							</button>
						)}
					</div>
				</div>
				<div className={bar}><div className={barFill} style={{ width: `${(daysDone / allDays.length) * 100}%` }} /></div>
				<p className="m-0 text-xs text-muted">Tick a task when you finish it. A day gets its green flag once every <b className="font-semibold text-ink">required</b> task is ticked. Saved in this browser only.</p>
			</div>

			{/* Week jump bar */}
			<nav aria-label="Weeks" className="sticky top-0 z-10 mt-6 -mx-1 px-1 py-2.5 flex gap-1.5 flex-wrap max-md:flex-nowrap max-md:overflow-x-auto bg-canvas/95 backdrop-blur">
				{weeks.map((w) => {
					const complete = w.days.every((d) => isDayDone(d, done));
					return (
						<a key={w.week} href={`#week-${w.week}`}
							className={cx('shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs no-underline transition-colors',
								complete ? 'border-positive bg-positive text-white' : w.label ? 'border-line bg-canvas text-muted hover:border-ink' : 'border-line bg-paper text-ink hover:border-ink')}>
							{complete && '✓ '}W{w.week}{w.label ? ` · ${w.label.split(' / ')[0]}` : ''}
						</a>
					);
				})}
				<a href="#race" className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full border border-line bg-canvas text-xs text-muted no-underline hover:border-ink">Race notes</a>
			</nav>

			{weeks.map((w) => {
				const wDone = w.days.filter((d) => isDayDone(d, done)).length;
				return (
					<section key={w.week} id={`week-${w.week}`} className="mt-12 scroll-mt-16">
						<div className="flex items-center gap-4 flex-wrap pb-3 border-b border-line">
							<h2 className="m-0 font-serif text-[28px] font-semibold tracking-[-0.01em]">Week {w.week}</h2>
							{w.label && <span className={cx(tag, 'bg-warn-bg text-warn')}>{w.label}</span>}
							<div className="ml-auto flex items-center gap-2.5 min-w-[160px]">
								<div className={cx(bar, 'flex-1 h-1.5')}><div className={barFill} style={{ width: `${(wDone / w.days.length) * 100}%` }} /></div>
								<span className="text-xs text-muted tabular-nums whitespace-nowrap">{wDone}/{w.days.length} days</span>
							</div>
						</div>

						<div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(330px,1fr))] max-md:grid-cols-1">
							{w.days.map((d) => (
								<DayCard key={d.day} day={d} done={done} dayDone={isDayDone(d, done)}
									onToggle={toggle} onDay={(on) => setDay(d, on)} />
							))}
						</div>
					</section>
				);
			})}
		</>
	);
}

function DayCard({ day, done, dayDone, onToggle, onDay }: {
	day: PlanDay; done: Set<string>; dayDone: boolean; onToggle: (id: string) => void; onDay: (on: boolean) => void;
}) {
	const style = KIND_STYLE[day.kind];
	const req = day.tasks.filter((t) => !t.optional);
	const reqDone = req.filter((t) => done.has(t.id)).length;

	return (
		<article id={`day-${day.day}`}
			className={cx('scroll-mt-20 flex flex-col min-w-0 rounded-2xl border border-l-4 bg-paper transition-colors',
				dayDone ? 'border-positive border-l-positive bg-positive-bg/40' : cx('border-line', style.stripe))}>
			<header className="flex flex-col gap-2 px-5 pt-4 pb-3">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-muted">Day {day.day}</span>
					<span className={cx(tag, style.pill)}>{day.kindLabel}</span>
					{day.duration && <span className="text-xs text-muted tabular-nums">· {day.duration}</span>}
					{dayDone && (
						<span className={cx(tag, 'ml-auto bg-positive text-white gap-1')} aria-label="Day done">
							<FlagIcon /> Done
						</span>
					)}
				</div>
				<h3 className="m-0 font-serif text-[20px] font-semibold leading-tight">{day.title}</h3>
			</header>

			<ol className="m-0 p-0 list-none border-t border-line divide-y divide-line">
				{day.tasks.map((t) => {
					const ticked = done.has(t.id);
					return (
						<li key={t.id}>
							<label className={cx('flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors hover:bg-canvas/70', t.optional && 'bg-canvas/40')}>
								<input type="checkbox" checked={ticked} onChange={() => onToggle(t.id)} className="sr-only peer" />
								<span aria-hidden
									className={cx('mt-0.5 inline-flex items-center justify-center w-[22px] h-[22px] shrink-0 rounded-full border-2 text-[12px] font-bold transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30',
										ticked ? 'border-positive bg-positive text-white' : 'border-line bg-paper text-transparent')}>
									✓
								</span>
								<span className="min-w-0 flex-1 flex flex-col gap-1">
									<span className="flex items-center gap-1.5 flex-wrap">
										<span className={cx('text-sm font-semibold', ticked ? 'text-muted line-through decoration-positive/60' : 'text-ink')}>{t.name}</span>
										<span className={cx(tag, t.optional ? 'border border-dashed border-line text-muted' : 'bg-ink/[0.06] text-ink')}>
											{t.optional ? 'Optional' : 'Required'}
										</span>
										{t.duration && <span className={cx(tag, 'bg-canvas text-muted tabular-nums')}>{t.duration}</span>}
									</span>
									{t.detail && <span className={cx('text-[13px] leading-relaxed', ticked ? 'text-muted' : 'text-ink/80')}>{t.detail}</span>}
									{t.note && <span className="text-xs italic text-muted">{t.note}</span>}
								</span>
							</label>
						</li>
					);
				})}
			</ol>

			<footer className="mt-auto flex items-center justify-between gap-3 px-5 py-3 border-t border-line">
				<span className="text-xs text-muted tabular-nums">{reqDone}/{req.length} required done</span>
				<button type="button" onClick={() => onDay(!dayDone)}
					className={cx('inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium cursor-pointer transition-colors',
						dayDone ? 'border-line bg-transparent text-muted hover:border-ink hover:text-ink' : 'border-positive bg-positive text-white hover:bg-transparent hover:text-positive')}>
					{dayDone ? 'Undo day' : <><FlagIcon /> Mark day done</>}
				</button>
			</footer>
		</article>
	);
}

function FlagIcon() {
	return (
		<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
			<path d="M3 1.5a.75.75 0 0 1 .75.75V3h8.69a.6.6 0 0 1 .5.93L11.5 6.5l1.44 2.57a.6.6 0 0 1-.5.93H3.75v4.75a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 3 1.5Z" />
		</svg>
	);
}
