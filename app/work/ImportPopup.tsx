'use client';

import { useMemo, useState } from 'react';
import { Popup } from '@/components/Popup';
import { btn, btnGhost, FormError, textarea } from '@/components/ui';
import { STATUS_LABELS, type WorkTaskRow } from '@/lib/work';
import { parseTasks } from '@/lib/work-import';

export interface Imported { tasks: WorkTaskRow[]; created: number; updated: number; skipped: number; reload: boolean }

/** Paste rows copied out of Jira's issue list, a Jira CSV export or Excel; preview them, then import. */
export function ImportPopup({ onImported }: { onImported: (r: Imported) => void }) {
	return (
		<Popup
			title="Paste from Jira or Excel"
			trigger={(open) => <button type="button" className={btnGhost} onClick={open}>Paste from Jira / Excel</button>}
		>
			{(close) => <ImportForm close={close} onImported={onImported} />}
		</Popup>
	);
}

function ImportForm({ close, onImported }: { close: () => void; onImported: (r: Imported) => void }) {
	const [text, setText] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const parsed = useMemo(() => parseTasks(text), [text]);

	async function submit() {
		if (!parsed.rows.length) return;
		setBusy(true);
		setError(null);
		try {
			const res = await fetch('/api/work/tasks/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rows: parsed.rows }),
			});
			const payload = (await res.json().catch(() => null)) as (Imported & { ok?: boolean; error?: string }) | null;
			if (!res.ok || !payload || payload.ok === false) throw new Error(payload?.error || 'Could not import.');
			onImported(payload);
			setText('');
			close();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not import.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div>
			<p className="m-0 mb-3 text-sm leading-relaxed text-muted">
				Copy the rows from Jira (or an Excel sheet or CSV, with its header row) and paste them here. Columns are matched by name:
				Key, Summary, Assignee, Status, Priority, Due date, Description, Comment. A Jira key already on your list updates that row.
			</p>
			<textarea
				className={textarea}
				rows={7}
				value={text}
				placeholder={'Issue key\tSummary\tAssignee\tStatus\tPriority\tDue date\nKB-123\tReview the TARA\tMarton\tIn Progress\tHigh\t30/Oct/26'}
				onChange={(e) => setText(e.target.value)}
			/>

			{text.trim() && (
				<div className="mt-3 text-sm">
					{parsed.rows.length ? (
						<>
							<p className="m-0 text-ink">
								{parsed.rows.length} row{parsed.rows.length === 1 ? '' : 's'} found
								{parsed.skipped > 0 && <span className="text-muted"> · {parsed.skipped} skipped (no topic)</span>}
								{!parsed.header && <span className="text-muted"> · no header row, read as Key, Topic, Responsible, Status, Priority, Due</span>}
							</p>
							<ul className="m-0 mt-2 list-none p-0 text-xs text-muted">
								{parsed.rows.slice(0, 4).map((r, i) => (
									<li key={i} className="truncate">
										{r.jira_key ? <strong className="font-medium text-ink">{r.jira_key}</strong> : '—'} · {r.title}
										{r.status ? ` · ${STATUS_LABELS[r.status]}` : ''}{r.due_on ? ` · ${r.due_on}` : ''}
									</li>
								))}
								{parsed.rows.length > 4 && <li>…and {parsed.rows.length - 4} more</li>}
							</ul>
						</>
					) : (
						<p className="m-0 text-muted">No rows found yet. Each row needs a topic (the Summary column).</p>
					)}
				</div>
			)}

			{error && <FormError>{error}</FormError>}
			<div className="mt-6 flex flex-wrap justify-end gap-2.5">
				<button type="button" className={btnGhost} onClick={close}>Cancel</button>
				<button type="button" className={btn} disabled={busy || !parsed.rows.length} onClick={submit}>
					{busy ? 'Importing…' : parsed.rows.length ? `Import ${parsed.rows.length}` : 'Import'}
				</button>
			</div>
		</div>
	);
}
