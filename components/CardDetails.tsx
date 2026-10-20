import type { ReactNode } from 'react';
import { cardDetailsSummary } from './ui';

/**
 * Collapsed-by-default section for a card's long fields, so a grid of cards
 * stays scannable: title, status and the headline chips up front, the rest one
 * click away. A native <details>, so it needs no JS and works from Server and
 * Client Components alike; the content stays mounted while closed, so inline
 * edits inside it behave exactly as before.
 *
 * `preview` is a one-line glimpse (usually the first long field) shown next to
 * the label while collapsed.
 */
export function CardDetails({ label = 'Details', preview, children }: {
	label?: string;
	preview?: string | null;
	children: ReactNode;
}) {
	const glimpse = preview?.replace(/\s+/g, ' ').trim();
	return (
		<details className="group min-w-0">
			<summary className={cardDetailsSummary}>
				<span aria-hidden="true" className="inline-block shrink-0 transition-transform group-open:rotate-90">▸</span>
				<span className="shrink-0">{label}</span>
				{glimpse && <span className="min-w-0 truncate group-open:hidden">· {glimpse}</span>}
			</summary>
			<div className="mt-2 flex flex-col gap-2.5">{children}</div>
		</details>
	);
}
