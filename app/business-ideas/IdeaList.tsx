'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { BusinessIdea } from '@/lib/business-ideas';
import { IDEA_CATEGORY_PILL_LABELS } from '@/lib/idea-categories';
import { InlineEdit } from '@/components/InlineEdit';
import { RankBadge, RankControls } from './RankControls';
import {
	card, cardActions, cardDate, cardFoot, cardGrid, cardHead, cardLabel, cardTitle, cardValue,
	chip, chipMuted, cx, deleteBtn, iconBtn, Empty, FormError, Pill,
} from '@/components/ui';

const CATEGORY_OPTIONS: [string, string][] = [
	['', 'Pick category'],
	...(Object.entries(IDEA_CATEGORY_PILL_LABELS) as [string, string][]),
];

export type IdeaListItem = {
	idea: BusinessIdea;
	linkedProject: { id: string; title: string } | null;
	signalCount: number;
};

/**
 * Owns the ordered list on the client. Delete and reorder apply optimistically
 * and fire the API call in the background — no router.refresh(), no reload. On
 * failure the previous order is restored and the reason is shown.
 */
export function IdeaList({ items }: { items: IdeaListItem[] }) {
	const [list, setList] = useState(items);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const inFlight = useRef(0);
	// Drag state: `armed` is set by pressing the ⠿ handle (so text inside the
	// card stays selectable), `dragId` while a drag is live, `startList` is the
	// order to roll back to if saving the drop fails.
	const [armedId, setArmedId] = useState<string | null>(null);
	const [dragId, setDragId] = useState<string | null>(null);
	const startList = useRef<IdeaListItem[]>(items);

	// Server stays the source of truth: adopt a fresh render (new idea created,
	// edits from another tab) whenever nothing local is pending.
	useEffect(() => {
		if (inFlight.current === 0) setList(items);
	}, [items]);

	async function mutate(next: IdeaListItem[], request: () => Promise<Response>) {
		const snapshot = list;
		setError(null);
		setList(next);
		setBusy(true);
		inFlight.current++;
		try {
			const res = await request();
			const payload = (await res.json().catch(() => null)) as
				| { ok?: boolean; moved?: boolean; error?: string }
				| null;
			if (!res.ok || payload?.ok === false) {
				throw new Error(payload?.error || 'Something went wrong.');
			}
			// move endpoint reports moved:false when the neighbour was stale.
			if (payload?.moved === false) setList(snapshot);
		} catch (e) {
			setList(snapshot);
			setError(e instanceof Error ? e.message : 'Something went wrong.');
		} finally {
			inFlight.current--;
			if (inFlight.current === 0) setBusy(false);
		}
	}

	function remove(id: string) {
		mutate(
			list.filter((it) => it.idea.id !== id),
			() => fetch(`/api/business-ideas/${id}/delete`, {
				method: 'POST',
				headers: { Accept: 'application/json' },
			}),
		);
	}

	function archive(id: string) {
		mutate(
			list.filter((it) => it.idea.id !== id),
			() => fetch(`/api/business-ideas/${id}/archive`, {
				method: 'POST',
				headers: { Accept: 'application/json' },
			}),
		);
	}

	function dragOver(targetId: string, before: boolean) {
		if (!dragId || dragId === targetId) return;
		setList((current) => {
			const dragged = current.find((it) => it.idea.id === dragId);
			const next = current.filter((it) => it.idea.id !== dragId);
			const at = next.findIndex((it) => it.idea.id === targetId);
			if (!dragged || at === -1) return current;
			next.splice(before ? at : at + 1, 0, dragged);
			return next;
		});
	}

	async function drop() {
		const id = dragId;
		setDragId(null);
		setArmedId(null);
		if (!id) return;
		const from = startList.current.findIndex((it) => it.idea.id === id);
		const to = list.findIndex((it) => it.idea.id === id);
		if (from === -1 || to === -1 || from === to) return;
		const snapshot = startList.current;
		setError(null);
		setBusy(true);
		inFlight.current++;
		try {
			const res = await fetch(`/api/business-ideas/${id}/rank`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ position: to + 1 }),
			});
			const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
			if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not save the new order.');
		} catch (e) {
			setList(snapshot);
			setError(e instanceof Error ? e.message : 'Something went wrong.');
		} finally {
			inFlight.current--;
			if (inFlight.current === 0) setBusy(false);
		}
	}

	function move(id: string, direction: 'up' | 'down') {
		const i = list.findIndex((it) => it.idea.id === id);
		const j = direction === 'up' ? i - 1 : i + 1;
		if (i === -1 || j < 0 || j >= list.length) return;
		const next = list.slice();
		[next[i], next[j]] = [next[j], next[i]];
		mutate(next, () => fetch(`/api/business-ideas/${id}/move`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ direction }),
		}));
	}

	function rank(id: string, position: number) {
		const i = list.findIndex((it) => it.idea.id === id);
		if (i === -1) return;
		const target = Math.min(Math.max(Math.round(position) - 1, 0), list.length - 1);
		if (target === i) return;
		const next = list.slice();
		const [item] = next.splice(i, 1);
		next.splice(target, 0, item);
		mutate(next, () => fetch(`/api/business-ideas/${id}/rank`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ position }),
		}));
	}

	return (
		<>
			{error && <FormError>{error}</FormError>}
			<div className={cardGrid}>
				{list.length ? (
					list.map((it, index) => (
						<IdeaCard
							key={it.idea.id}
							item={it}
							index={index}
							total={list.length}
							busy={busy}
							onMove={move}
							onRank={rank}
							onDelete={remove}
							onArchive={archive}
							dragging={dragId === it.idea.id}
							armed={armedId === it.idea.id}
							onArm={setArmedId}
							onDragStart={() => { startList.current = list; setDragId(it.idea.id); }}
							onDragOver={dragOver}
							onDrop={drop}
							onDragEnd={() => { setDragId(null); setArmedId(null); }}
						/>
					))
				) : (
					<Empty>No business ideas registered yet.</Empty>
				)}
			</div>
		</>
	);
}

function IdeaCard({ item, index, total, busy, onMove, onRank, onDelete, onArchive, dragging, armed, onArm, onDragStart, onDragOver, onDrop, onDragEnd }: {
	item: IdeaListItem;
	index: number;
	total: number;
	busy: boolean;
	onMove: (id: string, direction: 'up' | 'down') => void;
	onRank: (id: string, position: number) => void;
	onDelete: (id: string) => void;
	onArchive: (id: string) => void;
	dragging: boolean;
	armed: boolean;
	onArm: (id: string | null) => void;
	onDragStart: () => void;
	onDragOver: (targetId: string, before: boolean) => void;
	onDrop: () => void;
	onDragEnd: () => void;
}) {
	const { idea, linkedProject, signalCount } = item;

	return (
		<article
			className={cx(card, dragging && 'opacity-40')}
			draggable={armed}
			onDragStart={(e) => {
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', idea.id);
				onDragStart();
			}}
			onDragEnd={onDragEnd}
			onDragOver={(e) => {
				e.preventDefault();
				const rect = e.currentTarget.getBoundingClientRect();
				onDragOver(idea.id, e.clientY < rect.top + rect.height / 2);
			}}
			onDrop={(e) => { e.preventDefault(); onDrop(); }}
		>
			<div className={cardHead}>
				<span
					className="shrink-0 cursor-grab select-none text-muted text-base leading-none touch-none"
					title="Drag to reorder"
					aria-hidden="true"
					onPointerDown={() => onArm(idea.id)}
					onPointerUp={() => onArm(null)}
				>⠿</span>
				<RankBadge position={index + 1} busy={busy} onRank={(pos) => onRank(idea.id, pos)} />
				<InlineEdit
					value={idea.title}
					field="title"
					id={idea.id}
					endpoint="/api/business-ideas"
					className={cardTitle}
				/>
				<div className={cardActions}>
					<Link
						className={iconBtn}
						href={`/business-ideas/${idea.id}`}
						aria-label={`Open ${idea.title}`}
						title="Open"
					>↗</Link>
					<RankControls
						isFirst={index === 0}
						isLast={index === total - 1}
						busy={busy}
						onMove={(direction) => onMove(idea.id, direction)}
					/>
					<button
						type="button"
						className={iconBtn}
						aria-label="Archive business idea"
						title="Archive"
						disabled={busy}
						onClick={() => { if (confirm(`Archive "${idea.title}"? You can restore it from the archive.`)) onArchive(idea.id); }}
					>⤓</button>
					<button
						type="button"
						className={deleteBtn}
						aria-label="Delete business idea"
						disabled={busy}
						onClick={() => { if (confirm(`Delete "${idea.title}" permanently? This cannot be undone.`)) onDelete(idea.id); }}
					>×</button>
				</div>
			</div>

			<div>
				<InlineEdit
					value={idea.category ?? ''}
					field="category"
					id={idea.id}
					endpoint="/api/business-ideas"
					kind="select"
					options={CATEGORY_OPTIONS}
					className="inline-block cursor-pointer"
					display={
						idea.category
							? <Pill value={idea.category}>{IDEA_CATEGORY_PILL_LABELS[idea.category]}</Pill>
							: <Pill value="">Pick category</Pill>
					}
				/>
			</div>

			<div className="min-w-0">
				<span className={cardLabel}>Pain point</span>
				<InlineEdit value={idea.pain_point ?? ''} field="pain_point" id={idea.id} endpoint="/api/business-ideas" kind="textarea" className={`block ${cardValue}`} />
			</div>

			<div className="min-w-0">
				<span className={cardLabel}>Target market</span>
				<InlineEdit value={idea.target_market ?? ''} field="target_market" id={idea.id} endpoint="/api/business-ideas" kind="textarea" className={`block ${cardValue}`} />
			</div>

			<div className="min-w-0">
				<span className={cardLabel}>Validation</span>
				<InlineEdit value={idea.validation ?? ''} field="validation" id={idea.id} endpoint="/api/business-ideas" kind="textarea" className={`block ${cardValue}`} />
			</div>

			<div className={cardFoot}>
				{linkedProject ? (
					<Link className={chip} href={`/projects/${linkedProject.id}`}>
						→ {linkedProject.title} · {signalCount} signal{signalCount === 1 ? '' : 's'}
					</Link>
				) : (
					<span className={chipMuted}>Not started as a project</span>
				)}
				<span className={cardDate}>{new Date(idea.created_at).toLocaleDateString()}</span>
			</div>
		</article>
	);
}
