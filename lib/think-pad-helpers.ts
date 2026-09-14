import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared logic for the Think Pad's wiki-links, rename propagation, and search
 * index -- kept out of the route handlers so app/api/think-pad/** stays thin.
 *
 * Scope note: a line is one row, not a paragraph -- there's no room for
 * block-level Markdown (headings, code fences, lists) inside one line, so
 * rendering here only resolves [[wiki links]]; the rest of a line's text is
 * shown as plain text. Full Markdown formatting is deliberately out of scope
 * for the per-line editor (see CLAUDE.md).
 */

const WIKI_LINK_RE = /\[\[([^\[\]|]+)\]\]/g;

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Renders one line to HTML for its "not being edited" state: plain text,
 * except [[Page Title]] becomes a link -- to the page if `titleToId` has a
 * case-insensitive match, otherwise to /think-pad/new?title=... (the usual
 * wiki "click to create" move). The raw body (with [[...]] intact) is what
 * the textarea shows once you click into the line to edit it.
 */
export function renderLineHtml(body: string, titleToId: ReadonlyMap<string, string>): string {
	const escaped = escapeHtml(body);
	return escaped.replace(WIKI_LINK_RE, (match, rawTitle: string) => {
		const title = rawTitle.trim();
		if (!title) return match;
		const id = titleToId.get(title.toLowerCase());
		const label = escapeHtml(title);
		// Tailwind utilities inline, not a named class -- this HTML is dropped
		// straight into the DOM via dangerouslySetInnerHTML, and kead's globals.css
		// deliberately carries tokens only, no component classes (see CLAUDE.md).
		if (id) return `<a href="/think-pad/${id}" class="text-ink underline decoration-line hover:decoration-ink">${label}</a>`;
		return `<a href="/think-pad/new?title=${encodeURIComponent(title)}" class="text-negative underline decoration-dashed">${label}</a>`;
	});
}

/**
 * Renaming a page would otherwise silently turn every [[OldTitle]] pointing
 * at it into a dead link -- this rewrites them to [[NewTitle]] across every
 * other page's lines, the same propagation notekeep's page rename does.
 */
export async function rewriteWikiLinks(
	supabase: SupabaseClient,
	userId: string,
	oldTitle: string,
	newTitle: string,
	excludePageId: string,
): Promise<void> {
	if (oldTitle === newTitle) return;
	// Plain string ops, not a global regex: a shared /g RegExp's .test() carries
	// lastIndex state across calls (it only resets to 0 on a *failed* match), so
	// reusing one across a .filter() over many lines can make a match on an
	// earlier line cause a later line's check to start mid-string and miss a
	// real match -- an easy way for rename propagation to silently skip pages.
	// [[Title]] has no regex metacharacters to worry about, so there's no reason
	// to reach for RegExp here at all.
	const needle = `[[${oldTitle}]]`;
	const replacement = `[[${newTitle}]]`;

	const { data: lines } = await supabase
		.from('think_pad_entries')
		.select('id, body, page_id')
		.eq('user_id', userId)
		.neq('page_id', excludePageId);

	const matches = (lines ?? []).filter((line) => (line.body as string).includes(needle));
	await Promise.all(
		matches.map((line) =>
			supabase
				.from('think_pad_entries')
				.update({
					body: (line.body as string).replaceAll(needle, replacement),
					updated_at: new Date().toISOString(),
				})
				.eq('id', line.id),
		),
	);
	const touched = new Set(matches.map((line) => line.page_id as string));
	await Promise.all([...touched].map((pageId) => recomputeSearchText(supabase, pageId)));
}

/** Every OTHER page that links to `title` via [[title]] in one of its lines. */
export async function backlinksFor(
	supabase: SupabaseClient,
	userId: string,
	title: string,
	selfPageId: string,
): Promise<{ id: string; title: string }[]> {
	// % and _ are LIKE/ILIKE wildcards in Postgres -- escape them so a title
	// that happens to contain either is matched literally, not as a wildcard.
	const escaped = title.replace(/[%_]/g, '\\$&');
	const pattern = `%[[${escaped}]]%`;
	const { data: lines } = await supabase
		.from('think_pad_entries')
		.select('page_id')
		.eq('user_id', userId)
		.neq('page_id', selfPageId)
		.ilike('body', pattern);

	const pageIds = [...new Set((lines ?? []).map((l) => l.page_id as string))];
	if (!pageIds.length) return [];

	const { data: pages } = await supabase.from('think_pad_pages').select('id, title').in('id', pageIds);
	return ((pages ?? []) as { id: string; title: string }[]).sort((a, b) =>
		a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
	);
}

/**
 * Flattens every line's body into `think_pad_pages.search_text`; a DB
 * trigger derives `search_tsv` from that (plus the title) automatically.
 * Called after any line mutation -- cheap at personal-notes scale, same
 * "recompute the whole thing" approach notekeep used for its SQLite FTS5.
 */
export async function recomputeSearchText(supabase: SupabaseClient, pageId: string): Promise<void> {
	const { data: lines } = await supabase.from('think_pad_entries').select('body').eq('page_id', pageId);
	const parts = (lines ?? []).map((line) => line.body as string).filter(Boolean);
	await supabase
		.from('think_pad_pages')
		.update({ search_text: parts.join(' ') })
		.eq('id', pageId);
}
