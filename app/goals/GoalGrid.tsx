'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Goal } from '@/lib/goals';
import { InlineEdit } from '@/components/InlineEdit';
import {
	card, cardDate, cardFoot, cardGrid, cardHead, cardLabel, cardTitle, cardValue,
	cx, deleteBtn, Empty,
} from '@/components/ui';

/**
 * Drag-to-reorder grid. React owns the order as state rather than mutating the
 * DOM the way the Astro version did, so a re-render can never fight the moved
 * nodes; the server is told the new order on drop and `router.refresh()` pulls
 * the canonical ranks back down.
 */
export function GoalGrid({ goals }: { goals: Goal[] }) {
	const router = useRouter();
	const [items, setItems] = useState(goals);
	const [dragId, setDragId] = useState<string | null>(null);

	// The server is the source of truth: adopt a fresh list after a refresh.
	useEffect(() => setItems(goals), [goals]);

	function moveOver(targetId: string, before: boolean) {
		if (!dragId || dragId === targetId) return;
		setItems((current) => {
			const next = current.filter((g) => g.id !== dragId);
			const dragged = current.find((g) => g.id === dragId);
			if (!dragged) return current;
			const at = next.findIndex((g) => g.id === targetId);
			if (at === -1) return current;
			next.splice(before ? at : at + 1, 0, dragged);
			return next;
		});
	}

	async function persist(order: string[]) {
		try {
			const res = await fetch('/api/goals/reorder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ order }),
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok || !payload?.ok) throw new Error(payload?.error || 'Could not save the new order.');
			router.refresh();
		} catch (error) {
			console.error(error);
			router.refresh();
		}
	}

	if (!items.length) return <div className={cardGrid}><Empty>No goals yet. Register your first one.</Empty></div>;

	return (
		<div className={cardGrid}>
			{items.map((goal) => (
				<article
					key={goal.id}
					className={cx(card, 'cursor-default', dragId === goal.id && 'opacity-40')}
					draggable
					onDragStart={(e) => {
						setDragId(goal.id);
						e.dataTransfer.effectAllowed = 'move';
						e.dataTransfer.setData('text/plain', goal.id);
					}}
					onDragEnd={() => setDragId(null)}
					onDragOver={(e) => {
						if (!dragId) return;
						e.preventDefault();
						const rect = e.currentTarget.getBoundingClientRect();
						moveOver(goal.id, e.clientY < rect.top + rect.height / 2);
					}}
					onDrop={(e) => {
						e.preventDefault();
						setDragId(null);
						persist(items.map((g) => g.id));
					}}
				>
					<div className={cardHead}>
						<span className="shrink-0 cursor-grab select-none text-muted text-base leading-none" title="Drag to reorder">⠿</span>
						<InlineEdit
							value={goal.title}
							field="title"
							id={goal.id}
							endpoint="/api/goals"
							className={cardTitle}
						/>
						<form method="post" action={`/api/goals/${goal.id}/delete`} className="m-0 shrink-0">
							<button type="submit" className={deleteBtn} aria-label="Delete goal">×</button>
						</form>
					</div>

					<div className="min-w-0">
						<span className={cardLabel}>Description</span>
						<InlineEdit
							value={goal.description ?? ''}
							field="description"
							id={goal.id}
							endpoint="/api/goals"
							kind="textarea"
							className={`block ${cardValue}`}
						/>
					</div>

					<div className={`${cardFoot} justify-end`}>
						<span className={cardDate}>{new Date(goal.created_at).toLocaleDateString()}</span>
					</div>
				</article>
			))}
		</div>
	);
}
