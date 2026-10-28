'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { btnGhost, cx, FormError, segmented, segmentedActive, segmentedItem } from '@/components/ui';
import {
	formatHours, JIRA_KEY, PRIORITY_LABELS, STATUS_LABELS, TASK_PRIORITIES, TASK_STATUSES, todayInBudapest, weekStart,
	type TaskPriority, type TaskStatus, type WorkTaskRow,
} from '@/lib/work';
import { ImportPopup, type Imported } from './ImportPopup';
import { TaskDetail, type Summary } from './TaskDetail';

type ColKey = 'jira_key' | 'title' | 'responsible' | 'status' | 'priority' | 'due_on' | 'last_comment' | 'hours';
type Kind = 'text' | 'select' | 'date' | 'readonly';

const COLS: { key: ColKey; label: string; kind: Kind; width: string }[] = [
	{ key: 'jira_key', label: 'Jira', kind: 'text', width: 'w-[6.5rem]' },
	{ key: 'title', label: 'Topic', kind: 'text', width: 'min-w-[15rem]' },
	{ key: 'responsible', label: 'Responsible', kind: 'text', width: 'w-[7.5rem]' },
	{ key: 'status', label: 'Status', kind: 'select', width: 'w-[7.5rem]' },
	{ key: 'priority', label: 'Priority', kind: 'select', width: 'w-[6.25rem]' },
	{ key: 'due_on', label: 'Due', kind: 'date', width: 'w-[6.25rem]' },
	{ key: 'last_comment', label: 'Latest comment', kind: 'readonly', width: 'min-w-[12rem]' },
	{ key: 'hours', label: 'Logged', kind: 'readonly', width: 'w-[4.75rem]' },
];
const COMMENT_COL = COLS.findIndex((c) => c.key === 'last_comment');

const STATUS_ORDER: Record<TaskStatus, number> = { doing: 0, blocked: 1, todo: 2, done: 3 };
const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

const STATUS_CLS: Record<TaskStatus, string> = {
	todo: 'bg-canvas text-muted',
	doing: 'bg-info-bg text-info',
	blocked: 'bg-negative-bg text-negative',
	done: 'bg-positive-bg text-positive',
};
const PRIORITY_CLS: Record<TaskPriority, string> = { high: 'text-negative font-semibold', medium: 'text-ink', low: 'text-muted' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDue = (iso: string, year: string) => {
	const label = `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
	return iso.slice(0, 4) === year ? label : `${label} ${iso.slice(0, 4)}`;
};
const fmtShort = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

const cell = 'border-b border-r border-line px-2 py-1.5 align-top';

function textOf(t: WorkTaskRow, key: ColKey): string {
	switch (key) {
		case 'jira_key': return t.jira_key ?? '';
		case 'title': return t.title;
		case 'responsible': return t.responsible ?? '';
		case 'due_on': return t.due_on ?? '';
		default: return '';
	}
}

function compare(a: WorkTaskRow, b: WorkTaskRow, key: ColKey | 'no'): number {
	switch (key) {
		case 'status': return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
		case 'priority': return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
		case 'hours': return a.hours - b.hours;
		case 'no': return a.no - b.no;
		case 'last_comment': return (a.last_comment_at ?? '').localeCompare(b.last_comment_at ?? '');
		case 'due_on': return (a.due_on ?? '9999').localeCompare(b.due_on ?? '9999');
		default: return textOf(a, key).localeCompare(textOf(b, key), undefined, { sensitivity: 'base', numeric: true });
	}
}

/** Doing and blocked first, then to do, done last; soonest due first; then the running number. */
const defaultOrder = (a: WorkTaskRow, b: WorkTaskRow) =>
	STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || compare(a, b, 'due_on') || a.no - b.no;

/**
 * The ticket list as an Excel-like grid: gridlines, a frozen header, an active
 * cell you move with the arrow keys, Enter or typing to edit, Tab to move on.
 * Every change saves in the background (optimistic, rolled back with a message
 * if it fails); the row opens into description, comments and time log.
 */
export function TaskGrid({ initial, hoursToday, hoursWeek }: { initial: WorkTaskRow[]; hoursToday: number; hoursWeek: number }) {
	const router = useRouter();
	const [tasks, setTasks] = useState(initial);
	const tasksRef = useRef(tasks);
	tasksRef.current = tasks;
	useEffect(() => setTasks(initial), [initial]);

	const [view, setView] = useState<'active' | 'all' | 'done'>('active');
	const [query, setQuery] = useState('');
	const [sort, setSort] = useState<{ key: ColKey | 'no'; dir: 1 | -1 } | null>(null);
	const [active, setActive] = useState<{ id: string; col: number } | null>(null);
	const [edit, setEdit] = useState<{ id: string; col: number; draft: string } | null>(null);
	const editRef = useRef(edit);
	editRef.current = edit;
	const [open, setOpen] = useState<Set<string>>(new Set());
	const [error, setError] = useState<string | null>(null);
	const [today, setToday] = useState('');
	const [hours, setHours] = useState({ today: hoursToday, week: hoursWeek });
	useEffect(() => setHours({ today: hoursToday, week: hoursWeek }), [hoursToday, hoursWeek]);
	const [ghost, setGhost] = useState('');
	const [adding, setAdding] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const ghostRef = useRef<HTMLInputElement>(null);

	useEffect(() => setToday(todayInBudapest()), []);

	const counts = useMemo(() => ({
		active: tasks.filter((t) => t.status !== 'done').length,
		done: tasks.filter((t) => t.status === 'done').length,
		all: tasks.length,
	}), [tasks]);

	const rows = useMemo(() => {
		const q = query.trim().toLowerCase();
		let list = tasks.filter((t) => (view === 'all' ? true : view === 'done' ? t.status === 'done' : t.status !== 'done'));
		if (q) list = list.filter((t) => [t.jira_key, t.title, t.responsible, t.last_comment].some((v) => (v ?? '').toLowerCase().includes(q)));
		return [...list].sort(sort ? (a, b) => sort.dir * compare(a, b, sort.key) : defaultOrder);
	}, [tasks, view, query, sort]);

	const patch = useCallback(async (id: string, fields: Partial<WorkTaskRow>) => {
		const before = tasksRef.current.find((t) => t.id === id);
		if (!before) return;
		const settled = fields.status ? { done_at: fields.status === 'done' ? new Date().toISOString() : null } : {};
		setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...fields, ...settled } : t)));
		setError(null);
		try {
			const res = await fetch(`/api/work/tasks/${id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(fields),
			});
			const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
			if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not save.');
		} catch (e) {
			const undo = Object.fromEntries([...Object.keys(fields), 'done_at'].map((k) => [k, before[k as keyof WorkTaskRow]]));
			setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...undo } : t)));
			setError(e instanceof Error ? e.message : 'Could not save.');
		}
	}, []);

	async function addRow(text: string) {
		const raw = text.trim();
		if (!raw || adding) return;
		const [first, ...rest] = raw.split(/\s+/);
		const key = first.replace(/[:,;]+$/, '').toUpperCase();
		// "KB-123 Fix the thing" (as Jira shows it): the key goes in its own cell.
		const body = JIRA_KEY.test(key) && rest.length ? { jira_key: key, title: rest.join(' ') } : { title: raw };
		setAdding(true);
		setError(null);
		try {
			const res = await fetch('/api/work/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
			const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; task?: WorkTaskRow } | null;
			if (!res.ok || !payload?.task) throw new Error(payload?.error || 'Could not save.');
			setTasks((ts) => [...ts, payload.task as WorkTaskRow]);
			if (view === 'done') setView('active');
			setGhost('');
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not save.');
		} finally {
			setAdding(false);
			ghostRef.current?.focus();
		}
	}

	async function remove(t: WorkTaskRow) {
		if (!confirm(`Delete ${t.jira_key ? `${t.jira_key} ` : ''}"${t.title}" with its comments and time log?`)) return;
		const snapshot = tasksRef.current;
		setTasks((ts) => ts.filter((x) => x.id !== t.id));
		setError(null);
		try {
			const res = await fetch(`/api/work/tasks/${t.id}/delete`, { method: 'POST', headers: { Accept: 'application/json' } });
			const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
			if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not delete.');
		} catch (e) {
			setTasks(snapshot);
			setError(e instanceof Error ? e.message : 'Could not delete.');
		}
	}

	const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; });

	const setSummary = useCallback((id: string, s: Summary) => {
		setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...s } : t)));
	}, []);

	const changeHours = useCallback((day: string, delta: number) => {
		const now = todayInBudapest();
		setHours((h) => ({
			today: day === now ? Math.max(0, Math.round((h.today + delta) * 100) / 100) : h.today,
			week: day >= weekStart(now) && day <= now ? Math.max(0, Math.round((h.week + delta) * 100) / 100) : h.week,
		}));
	}, []);

	function onImported(r: Imported) {
		if (r.reload) {
			router.refresh();
		} else {
			setTasks((ts) => {
				const byId = new Map(r.tasks.map((t) => [t.id, t]));
				return [...ts.map((t) => byId.get(t.id) ?? t), ...r.tasks.filter((t) => !ts.some((x) => x.id === t.id))];
			});
		}
		setNotice(`Imported: ${r.created} new, ${r.updated} updated${r.skipped ? `, ${r.skipped} skipped` : ''}.`);
		window.setTimeout(() => setNotice(null), 5000);
	}

	async function copyTable() {
		const clean = (s: string | null) => (s ?? '').replace(/[\t\r\n]+/g, ' ').trim();
		const lines = [
			['No.', 'Jira', 'Topic', 'Responsible', 'Status', 'Priority', 'Due', 'Latest comment', 'Logged (h)'].join('\t'),
			...rows.map((t) => [t.no, clean(t.jira_key), clean(t.title), clean(t.responsible), STATUS_LABELS[t.status], PRIORITY_LABELS[t.priority], t.due_on ?? '', clean(t.last_comment), t.hours].join('\t')),
		];
		try {
			await navigator.clipboard.writeText(lines.join('\n'));
			setNotice(`Copied ${rows.length} row${rows.length === 1 ? '' : 's'}: paste them into Excel.`);
		} catch {
			setNotice('Could not copy to the clipboard.');
		}
		window.setTimeout(() => setNotice(null), 4000);
	}

	// ---- keyboard: move, edit, commit -------------------------------------------------

	const focusGrid = () => wrapRef.current?.focus();

	function startEdit(t: WorkTaskRow, col: number, draft: string) {
		setActive({ id: t.id, col });
		setEdit({ id: t.id, col, draft });
	}

	function moveFrom(id: string, col: number, dr: number, dc: number) {
		const r = rows.findIndex((t) => t.id === id);
		if (r < 0) return;
		const nr = Math.min(Math.max(r + dr, 0), rows.length - 1);
		const nc = Math.min(Math.max(col + dc, 0), COLS.length - 1);
		setActive({ id: rows[nr].id, col: nc });
	}

	function commit(move?: 'down' | 'right' | 'left') {
		const cur = editRef.current;
		if (!cur) return;
		editRef.current = null;
		setEdit(null);
		const task = tasksRef.current.find((t) => t.id === cur.id);
		const col = COLS[cur.col];
		if (task && (col.kind === 'text' || col.kind === 'date')) {
			const key = col.key as 'jira_key' | 'title' | 'responsible' | 'due_on';
			const value = cur.draft.trim();
			const next = key === 'jira_key' ? value.toUpperCase() : value;
			if (next !== textOf(task, key) && !(key === 'title' && !next)) patch(task.id, { [key]: next || null } as Partial<WorkTaskRow>);
		}
		if (move === 'down') moveFrom(cur.id, cur.col, 1, 0);
		else if (move === 'right') moveFrom(cur.id, cur.col, 0, 1);
		else if (move === 'left') moveFrom(cur.id, cur.col, 0, -1);
		focusGrid();
	}

	function cancelEdit() {
		editRef.current = null;
		setEdit(null);
		focusGrid();
	}

	function onGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
		if (e.target !== e.currentTarget || !active || edit) return;
		const r = rows.findIndex((t) => t.id === active.id);
		if (r < 0) return;
		const task = rows[r];
		const col = COLS[active.col];
		const go = (dr: number, dc: number) => { e.preventDefault(); moveFrom(task.id, active.col, dr, dc); };

		switch (e.key) {
			case 'ArrowDown': return go(1, 0);
			case 'ArrowUp': return go(-1, 0);
			case 'ArrowRight': return go(0, 1);
			case 'ArrowLeft': return go(0, -1);
			case 'Tab': return go(0, e.shiftKey ? -1 : 1);
			case 'Escape': setActive(null); return;
			case 'Enter':
			case 'F2':
				e.preventDefault();
				if (col.kind === 'text' || col.kind === 'date') startEdit(task, active.col, textOf(task, col.key));
				else if (col.kind === 'select') document.getElementById(`cell-${task.id}-${active.col}`)?.focus();
				else toggle(task.id);
				return;
			case 'Delete':
			case 'Backspace':
				if (col.kind === 'text' && col.key !== 'title' && textOf(task, col.key)) { e.preventDefault(); patch(task.id, { [col.key]: null } as Partial<WorkTaskRow>); }
				else if (col.kind === 'date' && task.due_on) { e.preventDefault(); patch(task.id, { due_on: null }); }
				return;
			default:
				if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && col.kind === 'text') {
					e.preventDefault();
					startEdit(task, active.col, e.key);
				}
		}
	}

	const arrow = (key: ColKey | 'no') => (sort?.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : '');
	const toggleSort = (key: ColKey | 'no') => setSort((s) => (!s || s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));

	const year = today.slice(0, 4);
	const viewLabel = { active: `Active ${counts.active}`, all: `All ${counts.all}`, done: `Done ${counts.done}` } as const;

	return (
		<div className="mt-8">
			{error && <FormError>{error}</FormError>}

			<div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
				<div className={segmented} role="group" aria-label="Show">
					{(['active', 'all', 'done'] as const).map((v) => (
						<button
							key={v}
							type="button"
							onClick={() => setView(v)}
							className={cx(view === v ? segmentedActive : segmentedItem, 'cursor-pointer border-0', view !== v && 'bg-transparent')}
						>{viewLabel[v]}</button>
					))}
				</div>
				<input
					type="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Filter rows…"
					aria-label="Filter rows"
					className="h-7 w-44 rounded-full border border-line bg-canvas px-3 text-xs text-ink outline-none focus:border-ink"
				/>
				<span className="text-xs tabular-nums text-muted" title="Hours logged, Budapest time">
					Today {formatHours(hours.today)} · This week {formatHours(hours.week)}
				</span>
				<div className="ml-auto flex flex-wrap items-center gap-2">
					{notice && <span className="text-xs text-muted" aria-live="polite">{notice}</span>}
					<button type="button" className={cx(btnGhost, 'min-h-8 px-3.5 text-xs')} onClick={copyTable}>Copy table</button>
					<ImportPopup onImported={onImported} />
				</div>
			</div>

			<div
				ref={wrapRef}
				tabIndex={0}
				onKeyDown={onGridKeyDown}
				aria-label="Tickets"
				className="max-h-[72dvh] overflow-auto rounded-xl border border-line bg-paper outline-none"
			>
				<table className="w-full min-w-[1000px] border-separate border-spacing-0 text-[13px] leading-snug">
					<thead>
						<tr>
							<th
								className="sticky top-0 z-10 w-14 cursor-pointer select-none border-b border-r border-line bg-canvas px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted"
								onClick={() => toggleSort('no')}
							>No.{arrow('no')}</th>
							{COLS.map((c) => (
								<th
									key={c.key}
									onClick={() => toggleSort(c.key)}
									className={cx('sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap border-b border-r border-line bg-canvas px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted', c.width)}
								>{c.label}{arrow(c.key)}</th>
							))}
							<th className="sticky top-0 z-10 w-9 border-b border-line bg-canvas" aria-label="Delete" />
						</tr>
					</thead>
					<tbody>
						{rows.map((t) => {
							const isOpen = open.has(t.id);
							const muted = t.status === 'done';
							const overdue = Boolean(t.due_on && today && t.due_on < today && t.status !== 'done');
							return [
								<tr key={t.id} className={cx('group/row', muted && 'text-muted')}>
									<td className="whitespace-nowrap border-b border-r border-line bg-canvas px-1 py-1.5 text-center align-top text-xs tabular-nums text-muted">
										<button
											type="button"
											aria-expanded={isOpen}
											aria-label={isOpen ? 'Close ticket' : 'Open ticket'}
											title={isOpen ? 'Close' : 'Description, comments, time log'}
											onClick={() => toggle(t.id)}
											className="mr-0.5 cursor-pointer border-0 bg-transparent p-0 text-muted hover:text-ink"
										><span aria-hidden="true" className={cx('inline-block transition-transform', isOpen && 'rotate-90')}>▸</span></button>
										{t.no}
									</td>
									{COLS.map((c, ci) => {
										const isActive = active?.id === t.id && active.col === ci;
										const editing = edit?.id === t.id && edit.col === ci;
										const common = cx(cell, c.width, isActive && 'relative outline outline-2 -outline-offset-2 outline-ink');
										const select = () => setActive({ id: t.id, col: ci });

										if (c.kind === 'select') {
											const isStatus = c.key === 'status';
											return (
												<td key={c.key} className={cx(common, 'py-1')} onMouseDown={select}>
													<select
														id={`cell-${t.id}-${ci}`}
														aria-label={`${isStatus ? 'Status' : 'Priority'} of ${t.title}`}
														value={isStatus ? t.status : t.priority}
														onFocus={select}
														onChange={(e) => patch(t.id, isStatus ? { status: e.target.value as TaskStatus } : { priority: e.target.value as TaskPriority })}
														className={cx(
															'h-6 max-w-full cursor-pointer rounded-md border-0 px-1.5 text-xs outline-none',
															isStatus ? cx('font-medium', STATUS_CLS[t.status]) : cx('bg-transparent', PRIORITY_CLS[t.priority]),
														)}
													>
														{isStatus
															? TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)
															: TASK_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
													</select>
												</td>
											);
										}

										if (c.kind === 'readonly') {
											const opensDetail = () => { select(); if (!isOpen) toggle(t.id); if (c.key === 'last_comment') window.setTimeout(() => document.getElementById(`comment-${t.id}`)?.focus(), 60); };
											return (
												<td key={c.key} className={cx(common, 'cursor-pointer')} onMouseDown={select} onDoubleClick={opensDetail}>
													{c.key === 'hours' ? (
														<span className="tabular-nums">{t.hours > 0 ? formatHours(t.hours) : <span className="text-muted">–</span>}</span>
													) : t.last_comment ? (
														<span className="flex items-baseline gap-2" title={t.last_comment}>
															<span className="line-clamp-2 min-w-0 flex-1 break-words">{t.last_comment}</span>
															{t.last_comment_at && <span className="shrink-0 text-[11px] tabular-nums text-muted">{fmtShort(t.last_comment_at.slice(0, 10))}</span>}
														</span>
													) : (
														<span className="text-muted">–</span>
													)}
												</td>
											);
										}

										if (editing && edit) {
											return (
												<td key={c.key} className={cx(common, 'p-0')}>
													<EditCell
														type={c.kind === 'date' ? 'date' : 'text'}
														draft={edit.draft}
														onChange={(draft) => setEdit({ ...edit, draft })}
														onCommit={commit}
														onCancel={cancelEdit}
													/>
												</td>
											);
										}

										const value = textOf(t, c.key);
										return (
											<td
												key={c.key}
												className={cx(common, c.key === 'title' && 'break-words', c.key === 'jira_key' && 'whitespace-nowrap font-medium', c.key === 'due_on' && overdue && 'font-medium text-negative')}
												onMouseDown={select}
												onDoubleClick={() => startEdit(t, ci, value)}
											>
												{c.key === 'due_on' ? (value ? fmtDue(value, year || '0') : '') : value}
											</td>
										);
									})}
									<td className="border-b border-line px-1 py-1.5 text-center align-top">
										<button
											type="button"
											aria-label={`Delete ${t.title}`}
											title="Delete row"
											onClick={() => remove(t)}
											className="cursor-pointer border-0 bg-transparent p-0 text-muted opacity-0 transition-opacity hover:text-ink focus:opacity-100 group-hover/row:opacity-100 max-md:opacity-100"
										>×</button>
									</td>
								</tr>,
								isOpen && (
									<tr key={`${t.id}-open`}>
										<td colSpan={COLS.length + 2} className="border-b border-line p-0">
											{/* Sticky and capped to the screen, so a wide table scrolling sideways never carries the panel out of view. */}
											<div className="sticky left-0 w-full max-w-[calc(100vw-3rem)]">
												<TaskDetail task={t} onSummary={setSummary} onHours={changeHours} />
											</div>
										</td>
									</tr>
								),
							];
						})}

						<tr>
							<td className="border-r border-line bg-canvas px-2 py-1.5 text-center text-xs text-muted">+</td>
							<td colSpan={COLS.length + 1} className="p-0">
								<input
									ref={ghostRef}
									value={ghost}
									disabled={adding}
									onChange={(e) => setGhost(e.target.value)}
									onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRow(ghost); } }}
									placeholder="Add a row: type the topic and press Enter  (or paste “KB-123 Summary”)"
									aria-label="New ticket"
									className="h-9 w-full border-0 bg-transparent px-2 text-[13px] text-ink outline-none placeholder:text-muted focus:bg-canvas"
								/>
							</td>
							<td />
						</tr>
					</tbody>
				</table>
				{rows.length === 0 && (
					<p className="m-0 border-t border-line px-4 py-6 text-center text-sm text-muted">
						{tasks.length === 0 ? 'No tickets yet. Add a row below, or paste your list from Jira.' : 'No rows match.'}
					</p>
				)}
			</div>
		</div>
	);
}

/** The input that replaces a cell while you edit it: Enter commits and moves down, Tab moves right, Esc cancels. */
function EditCell({ type, draft, onChange, onCommit, onCancel }: {
	type: 'text' | 'date';
	draft: string;
	onChange: (v: string) => void;
	onCommit: (move?: 'down' | 'right' | 'left') => void;
	onCancel: () => void;
}) {
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.focus();
		if (type === 'text') el.setSelectionRange(el.value.length, el.value.length);
	}, [type]);
	return (
		<input
			ref={ref}
			type={type}
			value={draft}
			onChange={(e) => onChange(e.target.value)}
			onBlur={() => onCommit()}
			onKeyDown={(e) => {
				if (e.key === 'Enter') { e.preventDefault(); onCommit('down'); }
				else if (e.key === 'Tab') { e.preventDefault(); onCommit(e.shiftKey ? 'left' : 'right'); }
				else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
			}}
			className="h-full min-h-8 w-full border-0 bg-paper px-2 py-1.5 text-[13px] text-ink outline outline-2 -outline-offset-2 outline-ink"
		/>
	);
}
