'use client';

import {
	createContext, useCallback, useContext, useState,
	type ElementType, type ReactNode,
} from 'react';

/**
 * Removes a row from a list/grid of server-rendered cards without re-rendering
 * the page — the async counterpart to the plain `<form method="post">` + 303
 * redirect pattern used elsewhere.
 *
 *   <CardList className={cardGrid}>
 *     {items.map((it) => (
 *       <CardItem key={it.id} id={it.id} className={card}>
 *         …
 *         <RemoveButton id={it.id} endpoint={`/api/…/${it.id}/delete`}
 *           className={deleteBtn} ariaLabel="Delete" />
 *       </CardItem>
 *     ))}
 *   </CardList>
 *
 * A successful POST hides that `CardItem` immediately; the server catches up on
 * its next render (a sibling inline edit, a navigation) and drops the row from
 * its data for good. Same "server is the source of truth, adopt it when nothing
 * is pending" contract as `InlineEdit` and the business-ideas list.
 *
 * The matching API route must answer JSON when the request sends
 * `Accept: application/json` — use `createMutationRoute` (`lib/mutation-route.ts`).
 */

type RemoveFn = (id: string) => void;

const RemoveContext = createContext<RemoveFn>(() => {});
const RemovedContext = createContext<ReadonlySet<string>>(new Set());

export function CardList({ as, className, children }: {
	as?: ElementType;
	className?: string;
	children: ReactNode;
}) {
	const Tag = as ?? 'div';
	const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set());

	const remove = useCallback<RemoveFn>((id) => {
		setRemoved((prev) => {
			const next = new Set(prev);
			next.add(id);
			return next;
		});
	}, []);

	return (
		<RemoveContext.Provider value={remove}>
			<RemovedContext.Provider value={removed}>
				<Tag className={className}>{children}</Tag>
			</RemovedContext.Provider>
		</RemoveContext.Provider>
	);
}

export function CardItem({ id, as, className, children }: {
	id: string;
	as?: ElementType;
	className?: string;
	children: ReactNode;
}) {
	const Tag = as ?? 'article';
	const removed = useContext(RemovedContext);
	if (removed.has(id)) return null;
	return <Tag className={className}>{children}</Tag>;
}

/** Access the enclosing list's remove function directly (e.g. from a custom
 *  control that isn't a `RemoveButton`). */
export function useRemoveCard(): RemoveFn {
	return useContext(RemoveContext);
}

/**
 * Button that POSTs to `endpoint` and, on success, removes the enclosing
 * `CardItem`. On failure the row stays and the reason shows on hover.
 */
export function RemoveButton({
	id, endpoint, className, children, confirm, ariaLabel, title,
}: {
	id: string;
	endpoint: string;
	className?: string;
	children: ReactNode;
	/** window.confirm copy; skip the action if the user cancels. */
	confirm?: string;
	ariaLabel?: string;
	title?: string;
}) {
	const remove = useRemoveCard();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function go() {
		if (busy) return;
		if (confirm && !window.confirm(confirm)) return;
		setBusy(true);
		setError(null);
		try {
			const res = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' } });
			const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
			if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not complete.');
			remove(id); // button unmounts with the row — no need to clear `busy`
		} catch (e) {
			setBusy(false);
			setError(e instanceof Error ? e.message : 'Could not complete.');
		}
	}

	return (
		<button
			type="button"
			className={className}
			disabled={busy}
			aria-label={ariaLabel}
			title={error ?? title ?? ariaLabel}
			onClick={go}
		>
			{children}
		</button>
	);
}
