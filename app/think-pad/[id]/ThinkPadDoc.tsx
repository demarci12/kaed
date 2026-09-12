'use client';

import { useEffect, useRef, useState } from 'react';
import type { ThinkPadSource } from '@/lib/think-pad';
import { renderLineHtml } from '@/lib/think-pad-helpers';

/**
 * One page's document: every row is a line, ordered by the float `position`
 * column. Enter splits the focused line at the cursor and inserts a new one
 * at the midpoint between its new neighbours (nothing else needs
 * renumbering); Backspace at the start of a line merges it into the one
 * above and deletes the row.
 *
 * A line has two faces: rendered (plain text, [[wiki links]] resolved and
 * clickable) when it isn't the one being edited, and a raw `<textarea>` (the
 * literal [[Title]]/markup) when it is -- click a rendered line to edit it.
 * Only one line is ever in edit mode at a time; `editingId` tracks which.
 *
 * A freshly typed line starts as a client-only "draft" (a temp id, no DB
 * row) and becomes real the moment it's finalized -- Enter splits it, or it
 * loses focus. `ensurePersisted` dedupes concurrent calls for the same draft
 * so a fast Enter-then-blur can't insert it twice.
 */

type Line = {
	id: string;
	body: string;
	source: ThinkPadSource;
	position: number;
	persisted: boolean;
};

let tempSeq = 0;
function tempId() {
	tempSeq += 1;
	return `draft-${Date.now()}-${tempSeq}`;
}

async function postJson(url: string, body: unknown) {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; line?: Line } | null;
	if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not save.');
	return payload;
}

export function ThinkPadDoc({ pageId, initialLines, titleToId }: {
	pageId: string;
	initialLines: { id: string; body: string; source: ThinkPadSource; position: number }[];
	titleToId: ReadonlyMap<string, string>;
}) {
	const [lines, setLines] = useState<Line[]>(() =>
		initialLines.length
			? initialLines.map((l) => ({ ...l, persisted: true }))
			: [{ id: tempId(), body: '', source: 'app', position: 0, persisted: false }],
	);
	const [editingId, setEditingId] = useState<string | null>(null);

	const refs = useRef(new Map<string, HTMLTextAreaElement>());
	const focusRequest = useRef<{ id: string; caret: number } | null>(null);
	const creating = useRef(new Map<string, Promise<string>>());

	// Run after every commit that might have queued a focus request. Depends
	// on editingId too, not just lines: clicking a rendered (view-mode) line
	// changes only editingId (mounting its textarea), and without editingId in
	// the deps this effect wouldn't re-run, so the new textarea would sit there
	// unfocused until a second click.
	useEffect(() => {
		const req = focusRequest.current;
		if (!req) return;
		focusRequest.current = null;
		const el = refs.current.get(req.id);
		if (el) {
			el.focus();
			el.setSelectionRange(req.caret, req.caret);
		}
	}, [lines, editingId]);

	function setRef(id: string, el: HTMLTextAreaElement | null) {
		if (el) refs.current.set(id, el);
		else refs.current.delete(id);
	}

	function grow(el: HTMLTextAreaElement) {
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight}px`;
	}

	/** Turns a draft into a durable row; a no-op if it already is one.
	 *  Concurrent callers for the same draft id share one in-flight request. */
	async function ensurePersisted(line: Pick<Line, 'id' | 'body' | 'position'>): Promise<string> {
		const inFlight = creating.current.get(line.id);
		if (inFlight) return inFlight;

		const promise = (async () => {
			try {
				const payload = await postJson(`/api/think-pad/${pageId}/create-line`, {
					body: line.body,
					position: line.position,
				});
				if (!payload?.line) throw new Error('Could not save.');
				const real = payload.line;
				setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, id: real.id, persisted: true } : l)));
				setEditingId((current) => (current === line.id ? real.id : current));
				const el = refs.current.get(line.id);
				if (el) {
					refs.current.set(real.id, el);
					refs.current.delete(line.id);
				}
				return real.id;
			} finally {
				creating.current.delete(line.id);
			}
		})();

		creating.current.set(line.id, promise);
		return promise;
	}

	function saveBody(id: string, body: string) {
		postJson(`/api/think-pad/lines/${id}/body`, { body }).catch((e) => console.error(e));
	}

	function deleteLine(id: string) {
		fetch(`/api/think-pad/lines/${id}/delete`, { method: 'POST' }).catch((e) => console.error(e));
	}

	function handleChange(id: string, body: string) {
		setLines((prev) => prev.map((l) => (l.id === id ? { ...l, body } : l)));
	}

	function handleBlur(line: Line) {
		if (line.persisted) saveBody(line.id, line.body);
		else if (line.body) void ensurePersisted(line);
		setEditingId((current) => (current === line.id ? null : current));
	}

	async function handleEnter(index: number, caret: number) {
		const line = lines[index];
		const before = line.body.slice(0, caret);
		const after = line.body.slice(caret);
		const next = lines[index + 1];
		const newLine: Line = {
			id: tempId(),
			body: after,
			source: 'app',
			position: next ? (line.position + next.position) / 2 : line.position + 1,
			persisted: false,
		};

		setLines((prev) => {
			const copy = [...prev];
			copy[index] = { ...copy[index], body: before };
			copy.splice(index + 1, 0, newLine);
			return copy;
		});
		setEditingId(newLine.id);
		focusRequest.current = { id: newLine.id, caret: 0 };

		// Enter finalizes the line you pressed it in -- persist both halves so
		// a reload never loses text you've already moved past.
		if (line.persisted) saveBody(line.id, before);
		else void ensurePersisted({ ...line, body: before });
		void ensurePersisted(newLine);
	}

	function handleBackspaceAtStart(index: number) {
		if (index === 0) return; // nothing above to merge into
		const line = lines[index];
		const prev = lines[index - 1];
		const merged = prev.body + line.body;
		const caret = prev.body.length;

		setLines((current) => {
			const copy = current.filter((l) => l.id !== line.id);
			const at = copy.findIndex((l) => l.id === prev.id);
			if (at !== -1) copy[at] = { ...copy[at], body: merged };
			return copy;
		});
		setEditingId(prev.id);
		focusRequest.current = { id: prev.id, caret };

		if (line.persisted) deleteLine(line.id);
		if (prev.persisted) saveBody(prev.id, merged);
		else void ensurePersisted({ ...prev, body: merged });
	}

	function startEditing(line: Line) {
		setEditingId(line.id);
		focusRequest.current = { id: line.id, caret: line.body.length };
	}

	function focusLast() {
		const last = lines[lines.length - 1];
		startEditing(last);
	}

	return (
		<div className="mt-8 flex flex-col">
			{lines.map((line, index) => {
				const isEditing = editingId === line.id;
				return (
					<div key={line.id} className="group flex items-start gap-2">
						{isEditing ? (
							<textarea
								ref={(el) => setRef(line.id, el)}
								value={line.body}
								rows={1}
								onChange={(e) => { handleChange(line.id, e.target.value); grow(e.currentTarget); }}
								onBlur={() => handleBlur(line)}
								onKeyDown={(e) => {
									const el = e.currentTarget;
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault();
										void handleEnter(index, el.selectionStart ?? line.body.length);
									} else if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0) {
										e.preventDefault();
										handleBackspaceAtStart(index);
									} else if (e.key === 'ArrowUp' && el.selectionStart === 0) {
										if (index > 0) { e.preventDefault(); startEditing(lines[index - 1]); }
									} else if (e.key === 'ArrowDown' && el.selectionStart === line.body.length) {
										if (index < lines.length - 1) { e.preventDefault(); startEditing(lines[index + 1]); }
									} else if (e.key === 'Escape') {
										(e.currentTarget as HTMLTextAreaElement).blur();
									}
								}}
								placeholder={lines.length === 1 && !line.body ? 'Write your first thought, or [[link]] to another page…' : ''}
								className="flex-1 min-w-0 resize-none overflow-hidden bg-transparent border-none outline-none font-sans text-[15px] leading-7 text-ink placeholder:text-muted py-0.5"
							/>
						) : (
							// Empty lines render as a thin clickable strip -- otherwise
							// there'd be nothing to click to reach an all-blank line.
							<div
								role="button"
								tabIndex={0}
								onClick={() => startEditing(line)}
								onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEditing(line); } }}
								className="flex-1 min-w-0 cursor-text py-0.5 text-[15px] leading-7 text-ink whitespace-pre-wrap break-words min-h-[1.75rem] rounded hover:bg-canvas"
								dangerouslySetInnerHTML={{ __html: renderLineHtml(line.body, titleToId) || '&nbsp;' }}
							/>
						)}
						{line.source === 'mcp' && (
							<span
								className="mt-1.5 shrink-0 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
								title="Saved by Claude"
							>💬</span>
						)}
					</div>
				);
			})}
			<div className="h-[30vh]" onClick={focusLast} />
		</div>
	);
}
