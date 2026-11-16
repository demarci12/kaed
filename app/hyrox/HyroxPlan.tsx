'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HyroxTask } from '@/lib/hyrox';
import { cx } from '@/components/ui';

export interface PlanDay { day: number; title: string; duration?: string; kindLabel: string; tasks: HyroxTask[] }
export interface PlanWeek { week: number; label?: string; days: PlanDay[] }

/**
 * Built from daisyUI components (scoped `hyrox` theme, see globals.css): stats,
 * menu / tabs for the week picker, collapse for days, list + checkbox for tasks.
 *
 * Ticks are per browser (localStorage), not in the database: the page is
 * public, so every visitor keeps their own progress and nobody needs a login.
 */
const STORAGE_KEY = 'kaed-hyrox-progress-v1';

function load(): Set<string> {
	try {
		const ids = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
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

export function HyroxPlan({ weeks }: { weeks: PlanWeek[] }) {
	const [done, setDone] = useState<Set<string>>(new Set());
	const [week, setWeek] = useState(1);
	const [openDay, setOpenDay] = useState<number | null>(null);

	const allDays = useMemo(() => weeks.flatMap((w) => w.days), [weeks]);
	const weekOf = useCallback((day: number) => weeks.find((w) => w.days.some((d) => d.day === day))?.week ?? 1, [weeks]);

	// After mount: read the ticks, then open where you left off (or where the
	// link points: #week-3 / #day-12).
	useEffect(() => {
		const saved = load();
		setDone(saved);
		const hash = window.location.hash.match(/^#(week|day)-(\d+)$/);
		if (hash?.[1] === 'week') { setWeek(Number(hash[2])); return; }
		const target = hash?.[1] === 'day' ? Number(hash[2]) : allDays.find((d) => !isDayDone(d, saved))?.day;
		if (target) { setWeek(weekOf(target)); setOpenDay(target); }
	}, [allDays, weekOf]);

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

	const pickWeek = (n: number) => {
		setWeek(n);
		const w = weeks.find((x) => x.week === n);
		setOpenDay(w?.days.find((d) => !isDayDone(d, done))?.day ?? null);
		history.replaceState(null, '', `#week-${n}`);
	};

	const daysDone = allDays.filter((d) => isDayDone(d, done)).length;
	const totalTasks = allDays.reduce((n, d) => n + d.tasks.length, 0);
	const tasksDone = allDays.reduce((n, d) => n + d.tasks.filter((t) => done.has(t.id)).length, 0);
	const nextDay = allDays.find((d) => !isDayDone(d, done));
	const current = weeks.find((w) => w.week === week) ?? weeks[0];
	const weekDone = (w: PlanWeek) => w.days.filter((d) => isDayDone(d, done)).length;

	return (
		<div data-theme="hyrox" className="mt-8 text-base-content">
			{/* Progress */}
			<div className="stats stats-horizontal w-full bg-base-100 border border-base-300 rounded-box [&_.stat]:max-sm:px-4 [&_.stat-value]:max-sm:text-2xl">
				<div className="stat">
					<div className="stat-title">Days done</div>
					<div className="stat-value tabular-nums">{daysDone}<span className="text-base font-normal opacity-50"> / {allDays.length}</span></div>
					<progress className="progress progress-success w-full mt-2" value={daysDone} max={allDays.length} />
				</div>
				<div className="stat max-sm:hidden">
					<div className="stat-title">Tasks ticked</div>
					<div className="stat-value tabular-nums">{tasksDone}<span className="text-base font-normal opacity-50"> / {totalTasks}</span></div>
					<div className="stat-desc mt-1">Saved in this browser</div>
				</div>
				<div className="stat">
					<div className="stat-title">Up next</div>
					<div className="stat-value text-2xl max-sm:text-xl">{nextDay ? `Day ${nextDay.day}` : 'All done'}</div>
					<div className="stat-actions mt-2 flex gap-2">
						{nextDay && (
							<button type="button" className="btn btn-primary btn-sm" onClick={() => { setWeek(weekOf(nextDay.day)); setOpenDay(nextDay.day); }}>
								Continue
							</button>
						)}
						{tasksDone > 0 && (
							<button type="button" className="btn btn-ghost btn-sm"
								onClick={() => { if (confirm('Clear every tick on this device?')) update((s) => s.clear()); }}>
								Reset
							</button>
						)}
					</div>
				</div>
			</div>

			<div className="mt-8 grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
				{/* Week picker: side menu on desktop… */}
				<aside className="hidden lg:block">
					<ul className="menu w-full bg-base-100 border border-base-300 rounded-box sticky top-4 p-2">
						<li className="menu-title">Weeks</li>
						{weeks.map((w) => {
							const n = weekDone(w);
							const complete = n === w.days.length;
							return (
								<li key={w.week}>
									<button type="button" onClick={() => pickWeek(w.week)} className={cx('flex items-center', w.week === week && 'menu-active')}>
										<span className="flex-1 text-left">
											Week {w.week}
											{w.label && <span className="ml-1.5 text-xs opacity-60">{w.label.split(' / ')[0]}</span>}
										</span>
										{complete
											? <span className="badge badge-success badge-sm">✓</span>
											: <span className="badge badge-ghost badge-sm tabular-nums">{n}/{w.days.length}</span>}
									</button>
								</li>
							);
						})}
					</ul>
				</aside>

				<div className="min-w-0">
					{/* …scrollable tabs on phones and tablets */}
					<div role="tablist" className="tabs tabs-box flex-nowrap overflow-x-auto bg-base-200 border border-base-300 lg:hidden [scrollbar-width:none]">
						{weeks.map((w) => (
							<button key={w.week} type="button" role="tab" onClick={() => pickWeek(w.week)}
								className={cx('tab shrink-0 whitespace-nowrap', w.week === week && 'tab-active', weekDone(w) === w.days.length && 'text-success')}>
								W{w.week}
							</button>
						))}
					</div>

					{/* The selected week */}
					<section id={`week-${current.week}`} className="mt-5 lg:mt-0">
						<div className="flex items-center justify-between gap-3 flex-wrap">
							<div className="flex items-center gap-2.5">
								<h2 className="m-0 text-2xl font-semibold tracking-tight">Week {current.week}</h2>
								{current.label && <span className="badge badge-warning badge-soft">{current.label}</span>}
							</div>
							<div className="join">
								<button type="button" className="btn btn-sm join-item" disabled={current.week === 1} onClick={() => pickWeek(current.week - 1)} aria-label="Previous week">‹</button>
								<button type="button" className="btn btn-sm join-item" disabled={current.week === weeks.length} onClick={() => pickWeek(current.week + 1)} aria-label="Next week">›</button>
							</div>
						</div>
						<div className="mt-3 flex items-center gap-3">
							<progress className="progress progress-success flex-1" value={weekDone(current)} max={current.days.length} />
							<span className="text-sm opacity-60 tabular-nums whitespace-nowrap">{weekDone(current)} of {current.days.length} days</span>
						</div>

						<div className="mt-5 flex flex-col gap-3">
							{current.days.map((d) => (
								<DayPanel key={d.day} day={d} done={done} dayDone={isDayDone(d, done)}
									open={openDay === d.day}
									onOpen={() => setOpenDay(openDay === d.day ? null : d.day)}
									onToggle={toggle} onDay={(on) => setDay(d, on)} />
							))}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}

function DayPanel({ day, done, dayDone, open, onOpen, onToggle, onDay }: {
	day: PlanDay; done: Set<string>; dayDone: boolean; open: boolean;
	onOpen: () => void; onToggle: (id: string) => void; onDay: (on: boolean) => void;
}) {
	const req = countable(day);
	const reqDone = req.filter((t) => done.has(t.id)).length;
	const pct = Math.round((reqDone / req.length) * 100);

	return (
		<div id={`day-${day.day}`}
			className={cx('collapse collapse-arrow bg-base-100 border scroll-mt-4', open ? 'collapse-open' : 'collapse-close',
				dayDone ? 'border-success/40' : 'border-base-300')}>
			<button type="button" onClick={onOpen} aria-expanded={open}
				className="collapse-title flex items-center gap-4 pe-12 text-left cursor-pointer">
				{dayDone ? (
					<span className="inline-flex items-center justify-center size-10 shrink-0 rounded-full bg-success text-success-content text-lg">✓</span>
				) : pct === 0 ? (
					<span className="inline-flex items-center justify-center size-10 shrink-0 rounded-full border-[3px] border-base-300 text-[11px] font-medium tabular-nums text-base-content/70">
						{reqDone}/{req.length}
					</span>
				) : (
					<span className="radial-progress shrink-0 text-success text-[11px] font-medium tabular-nums"
						style={{ '--value': pct, '--size': '2.5rem', '--thickness': '3px' } as React.CSSProperties}
						role="progressbar" aria-valuenow={pct}>
						<span className="text-base-content/70">{reqDone}/{req.length}</span>
					</span>
				)}
				<span className="min-w-0 flex-1">
					<span className="block text-xs uppercase tracking-wide opacity-50">Day {day.day} · {day.kindLabel}</span>
					<span className="block font-semibold leading-snug">{day.title}</span>
				</span>
				{day.duration && <span className="hidden sm:inline text-sm opacity-50 tabular-nums whitespace-nowrap">{day.duration}</span>}
			</button>

			<div className="collapse-content px-0">
				<ul className="list border-t border-base-300">
					{day.tasks.map((t) => {
						const ticked = done.has(t.id);
						return (
							<li key={t.id} className={cx('list-row items-start rounded-none px-4 sm:px-5', t.optional && 'bg-base-200/50')}>
								<input type="checkbox" className="checkbox checkbox-success checkbox-sm mt-0.5"
									checked={ticked} onChange={() => onToggle(t.id)} aria-label={`Done: ${t.name}`} />
								<label className="list-col-grow min-w-0 cursor-pointer" onClick={() => onToggle(t.id)}>
									<span className="flex items-center gap-2 flex-wrap">
										<span className={cx('font-medium', ticked && 'line-through opacity-50')}>{t.name}</span>
										{t.optional
											? <span className="badge badge-outline badge-sm opacity-70">Optional</span>
											: <span className="badge badge-neutral badge-soft badge-sm">Required</span>}
										{t.duration && <span className="text-xs opacity-50 tabular-nums">{t.duration}</span>}
									</span>
									{t.detail && <span className={cx('block mt-1 text-sm leading-relaxed', ticked ? 'opacity-40' : 'opacity-70')}>{t.detail}</span>}
									{t.note && <span className="block mt-0.5 text-xs italic opacity-50">{t.note}</span>}
								</label>
							</li>
						);
					})}
				</ul>
				<div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-3 border-t border-base-300">
					<span className="text-sm opacity-60 tabular-nums">{reqDone} of {req.length} required done</span>
					{dayDone
						? <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDay(false)}>Undo</button>
						: <button type="button" className="btn btn-success btn-sm" onClick={() => onDay(true)}>Mark day done</button>}
				</div>
			</div>
		</div>
	);
}
