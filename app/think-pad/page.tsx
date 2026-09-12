import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import type { ThinkPadPage } from '@/lib/think-pad';
import { CardItem, CardList, RemoveButton } from '@/components/CardList';
import { NewPagePopup } from './NewPagePopup';
import {
	card, cardDate, cardFoot, cardGrid, cardHead, cardTitle, deleteBtn, Empty, FormError, PageHead,
} from '@/components/ui';

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString();
}

export default async function ThinkPadListPage({ searchParams }: {
	searchParams: Promise<{ error?: string; q?: string }>;
}) {
	const { supabase } = await requireOwner();
	const { error, q } = await searchParams;
	const query = (q ?? '').trim();

	let pages: ThinkPadPage[];
	if (query) {
		// type: 'plain' runs the query through plainto_tsquery, which tokenizes
		// and ANDs the words itself -- unlike raw to_tsquery it never throws on
		// punctuation, so whatever the user typed is safe to pass straight through.
		const { data } = await supabase
			.from('think_pad_pages')
			.select('*')
			.textSearch('search_tsv', query, { type: 'plain' });
		pages = (data ?? []) as ThinkPadPage[];
	} else {
		const { data } = await supabase.from('think_pad_pages').select('*').order('updated_at', { ascending: false });
		pages = (data ?? []) as ThinkPadPage[];
	}

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Personal"
				title="Think Pad."
				lede="Your own wiki. Pages of Notion-style lines, linked with [[Page Title]], with a database and full-text search when you need one."
				actions={<NewPagePopup />}
			/>

			<form action="/think-pad" method="get" className="mt-6 flex gap-2 max-w-md">
				<input
					type="search"
					name="q"
					defaultValue={query}
					placeholder="Search pages, lines, and tables…"
					className="flex-1 h-10 px-3.5 rounded-full border border-line bg-canvas text-sm text-ink outline-none focus:border-ink"
				/>
			</form>

			{error && <FormError>{error}</FormError>}

			<CardList className={cardGrid}>
				{pages.length ? (
					pages.map((page) => (
						<CardItem key={page.id} id={page.id} className={card}>
							<div className={cardHead}>
								<Link href={`/think-pad/${page.id}`} className={cardTitle}>{page.title}</Link>
								<RemoveButton
									id={page.id}
									endpoint={`/api/think-pad/${page.id}/delete`}
									className={deleteBtn}
									ariaLabel="Delete page"
									confirm={`Delete "${page.title}"? This can't be undone.`}
								>×</RemoveButton>
							</div>
							<div className={`${cardFoot} justify-end`}>
								<span className={cardDate}>{formatDate(page.updated_at)}</span>
							</div>
						</CardItem>
					))
				) : (
					<Empty>
						{query
							? `No pages match "${query}".`
							: 'Nothing here yet. Click "+ New page" to write your first one.'}
					</Empty>
				)}
			</CardList>
		</section>
	);
}
