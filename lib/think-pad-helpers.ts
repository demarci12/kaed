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

function escapeRegExp(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
	const pattern = new RegExp(`\\[\\[${escapeRegExp(oldTitle)}\\]\\]`, 'g');

	const { data: lines } = await supabase
		.from('think_pad_entries')
		.select('id, body, page_id')
		.eq('user_id', userId)
		.neq('page_id', excludePageId);

	const touched = new Set<string>();
	for (const line of lines ?? []) {
		if (!pattern.test(line.body as string)) continue;
		const rewritten = (line.body as string).replace(pattern, `[[${newTitle}]]`);
		await supabase
			.from('think_pad_entries')
			.update({ body: rewritten, updated_at: new Date().toISOString() })
			.eq('id', line.id);
		touched.add(line.page_id as string);
	}
	await Promise.all([...touched].map((pageId) => recomputeSearchText(supabase, pageId)));
}

/** Every OTHER page that links to `title` via [[title]] in one of its lines. */
export async function backlinksFor(
	supabase: SupabaseClient,
	userId: string,
	title: string,
	selfPageId: string,
): Promise<{ id: string; title: string }[]> {
	const pattern = `%[[${title}]]%`;
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
 * Flattens a page's title + every line's body + every table cell into
 * `think_pad_pages.search_text`; a DB trigger derives `search_tsv` from that
 * automatically. Called after any line or table mutation -- cheap at
 * personal-notes scale, same "recompute the whole thing" approach as
 * notekeep's reindexTableText.
 */
export async function recomputeSearchText(supabase: SupabaseClient, pageId: string): Promise<void> {
	const [{ data: page }, { data: lines }, { data: table }] = await Promise.all([
		supabase.from('think_pad_pages').select('title').eq('id', pageId).maybeSingle(),
		supabase.from('think_pad_entries').select('body').eq('page_id', pageId),
		supabase.from('think_pad_tables').select('id').eq('page_id', pageId).maybeSingle(),
	]);

	const parts: string[] = [];
	for (const line of lines ?? []) {
		if (line.body) parts.push(line.body as string);
	}

	if (table) {
		const { data: rows } = await supabase.from('think_pad_table_rows').select('data').eq('table_id', table.id);
		for (const row of rows ?? []) {
			const data = row.data as Record<string, unknown>;
			for (const value of Object.values(data)) {
				if (value != null && value !== '') parts.push(String(value));
			}
		}
	}

	await supabase
		.from('think_pad_pages')
		.update({ search_text: parts.join(' ') })
		.eq('id', pageId);
}
