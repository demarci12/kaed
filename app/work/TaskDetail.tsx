'use client';

import { useEffect, useRef, useState } from 'react';
import { btn, cardLabel, cx, FormError, input, textarea } from '@/components/ui';
import { formatHours, todayInBudapest, type WorkComment, type WorkLog, type WorkTaskRow } from '@/lib/work';

export type Summary = Pick<WorkTaskRow, 'comment_count' | 'last_comment' | 'last_comment_at' | 'hours'>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const fmtStamp = (iso: string) => {
	const d = new Date(iso);
	return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

async function call<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, ...init });
	const payload = (await res.json().catch(() => null)) as ({ ok?: boolean; error?: string } & T) | null;
	if (!res.ok || !payload || payload.ok === false) throw new Error(payload?.error || 'Could not save.');
	return payload;
}

const SOURCE_NOTE: Record<string, string> = { claude: 'Claude', import: 'import' };

/**
 * The open part of a ticket row: description, comment history and time log.
 * Loaded when the row opens; every change saves in the background and reports
 * the new totals back so the grid's "Latest comment" and "Logged" columns stay
 * current without a refresh.
 */
export function TaskDetail({ task, onSummary, onHours }: {
	task: WorkTaskRow;
	onSummary: (id: string, summary: Summary) => void;
	/** A log entry on `day` was added (+) or removed (-): the toolbar's day and week totals follow. */
	onHours: (day: string, delta: number) => void;
}) {
	const [loaded, setLoaded] = useState(false);
	const [description, setDescription] = useState('');
	const [savedDescription, setSavedDescription] = useState('');
	const [comments, setComments] = useState<WorkComment[]>([]);
	const [logs, setLogs] = useState<WorkLog[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [commentText, setCommentText] = useState('');
	const [busy, setBusy] = useState(false);
	const [logHours, setLogHours] = useState('');
	const [logDay, setLogDay] = useState('');
	const [logNote, setLogNote] = useState('');
	const commentRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		let live = true;
		setLogDay(todayInBudapest());
		call<{ description: string; comments: WorkComment[]; logs: WorkLog[] }>(`/api/work/tasks/${task.id}`)
			.then((d) => {
				if (!live) return;
				setDescription(d.description);
				setSavedDescription(d.description);
				setComments(d.comments);
				setLogs(d.logs);
				setLoaded(true);
			})
			.catch((e) => live && setError(e instanceof Error ? e.message : 'Could not load the ticket.'));
		return () => { live = false; };
	}, [task.id]);

	const totalHours = logs.reduce((a, l) => a + l.hours, 0);
	const summarise = (nextComments: WorkComment[], nextLogs: WorkLog[]) => {
		const last = nextComments[0];
		onSummary(task.id, {
			comment_count: nextComments.length,
			last_comment: last?.body ?? null,
			last_comment_at: last?.created_at ?? null,
			hours: Math.round(nextLogs.reduce((a, l) => a + l.hours, 0) * 100) / 100,
		});
	};

	async function saveDescription() {
		if (description === savedDescription) return;
		setError(null);
		try {
			await call(`/api/work/tasks/${task.id}`, { method: 'POST', body: JSON.stringify({ description }) });
			setSavedDescription(description);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not save.');
		}
	}

	async function addComment() {
		const body = commentText.trim();
		if (!body || busy) return;
		setBusy(true);
		setError(null);
		try {
			const { comment } = await call<{ comment: WorkComment }>(`/api/work/tasks/${task.id}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
			const next = [comment, ...comments];
			setComments(next);
			setCommentText('');
			summarise(next, logs);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not save.');
		} finally {
			setBusy(false);
		}
	}

	async function removeComment(c: WorkComment) {
		if (!confirm('Delete this comment?')) return;
		const next = comments.filter((x) => x.id !== c.id);
		setComments(next);
		summarise(next, logs);
		try {
			await call(`/api/work/comments/${c.id}/delete`, { method: 'POST' });
		} catch (e) {
			setComments(comments);
			summarise(comments, logs);
			setError(e instanceof Error ? e.message : 'Could not delete.');
		}
	}

	async function addLog() {
		if (!logHours.trim() || busy) return;
		setBusy(true);
		setError(null);
		try {
			const { log } = await call<{ log: WorkLog }>(`/api/work/tasks/${task.id}/logs`, {
				method: 'POST',
				body: JSON.stringify({ hours: logHours, logged_on: logDay || undefined, note: logNote }),
			});
			const next = [log, ...logs].sort((a, b) => b.logged_on.localeCompare(a.logged_on) || b.created_at.localeCompare(a.created_at));
			setLogs(next);
			setLogHours('');
			setLogNote('');
			summarise(comments, next);
			onHours(log.logged_on, log.hours);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not save.');
		} finally {
			setBusy(false);
		}
	}

	async function removeLog(l: WorkLog) {
		const next = logs.filter((x) => x.id !== l.id);
		setLogs(next);
		summarise(comments, next);
		onHours(l.logged_on, -l.hours);
		try {
			await call(`/api/work/logs/${l.id}/delete`, { method: 'POST' });
		} catch (e) {
			setLogs(logs);
			summarise(comments, logs);
			onHours(l.logged_on, l.hours);
			setError(e instanceof Error ? e.message : 'Could not delete.');
		}
	}

	return (
		<div data-detail className="grid gap-5 bg-canvas px-4 py-4 sm:px-6 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]" onKeyDown={(e) => e.stopPropagation()}>
			{error && <div className="col-span-full"><FormError>{error}</FormError></div>}

			<div className="min-w-0">
				<label className="block">
					<span className={cardLabel}>Description</span>
					<textarea
						className={cx(textarea, 'mt-1.5 bg-paper')}
						rows={7}
						value={description}
						disabled={!loaded}
						placeholder={loaded ? 'What the ticket is about, acceptance criteria, links…' : 'Loading…'}
						onChange={(e) => setDescription(e.target.value)}
						onBlur={saveDescription}
					/>
				</label>

				<div className="mt-5">
					<span className={cardLabel}>Time logged · {formatHours(totalHours)}</span>
					<div className="mt-1.5 flex flex-wrap gap-2">
						<input
							className={cx(input, 'h-9 w-24 flex-none bg-paper text-sm')}
							aria-label="Hours"
							placeholder="1.5 / 90m"
							value={logHours}
							onChange={(e) => setLogHours(e.target.value)}
							onKeyDown={(e) => { if (e.key === 'Enter') addLog(); }}
						/>
						<input
							className={cx(input, 'h-9 w-36 flex-none bg-paper text-sm')}
							type="date"
							aria-label="Day"
							value={logDay}
							onChange={(e) => setLogDay(e.target.value)}
						/>
						<input
							className={cx(input, 'h-9 min-w-0 flex-1 basis-40 bg-paper text-sm')}
							aria-label="What the time was spent on"
							placeholder="What was it spent on?"
							maxLength={300}
							value={logNote}
							onChange={(e) => setLogNote(e.target.value)}
							onKeyDown={(e) => { if (e.key === 'Enter') addLog(); }}
						/>
						<button type="button" className={cx(btn, 'min-h-9')} disabled={busy || !logHours.trim()} onClick={addLog}>Log</button>
					</div>
					{logs.length > 0 && (
						<ul className="m-0 mt-2.5 list-none p-0 text-sm">
							{logs.map((l) => (
								<li key={l.id} className="group/log flex items-baseline gap-3 border-b border-line py-1.5 last:border-b-0">
									<span className="w-14 shrink-0 text-xs tabular-nums text-muted">{fmtDay(l.logged_on)}</span>
									<span className="w-12 shrink-0 tabular-nums text-ink">{formatHours(l.hours)}</span>
									<span className="min-w-0 flex-1 text-muted">
										{l.note}
										{SOURCE_NOTE[l.source] && <span className="ml-2 text-[11px] uppercase tracking-wide">{SOURCE_NOTE[l.source]}</span>}
									</span>
									<button type="button" aria-label="Delete time entry" title="Delete" onClick={() => removeLog(l)} className="cursor-pointer border-0 bg-transparent p-0 text-muted opacity-0 transition-opacity hover:text-ink focus:opacity-100 group-hover/log:opacity-100 max-md:opacity-100">×</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div className="min-w-0">
				<label className="block">
					<span className={cardLabel}>Comments · {comments.length}</span>
					<textarea
						ref={commentRef}
						id={`comment-${task.id}`}
						className={cx(textarea, 'mt-1.5 bg-paper')}
						rows={3}
						value={commentText}
						placeholder="Status update, decision, what you are waiting for…  (Ctrl/Cmd+Enter to add)"
						onChange={(e) => setCommentText(e.target.value)}
						onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addComment(); } }}
					/>
				</label>
				<div className="mt-2 flex justify-end">
					<button type="button" className={cx(btn, 'min-h-9')} disabled={busy || !commentText.trim()} onClick={addComment}>Add comment</button>
				</div>
				{comments.length > 0 && (
					<ul className="m-0 mt-2 list-none p-0">
						{comments.map((c) => (
							<li key={c.id} className="group/comment border-t border-line py-2.5 first:border-t-0">
								<div className="flex items-center gap-2 text-xs text-muted">
									<span className="tabular-nums">{fmtStamp(c.created_at)}</span>
									{SOURCE_NOTE[c.source] && <span className="uppercase tracking-wide">{SOURCE_NOTE[c.source]}</span>}
									<button type="button" aria-label="Delete comment" title="Delete" onClick={() => removeComment(c)} className="ml-auto cursor-pointer border-0 bg-transparent p-0 text-muted opacity-0 transition-opacity hover:text-ink focus:opacity-100 group-hover/comment:opacity-100 max-md:opacity-100">×</button>
								</div>
								<p className="m-0 mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{c.body}</p>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
