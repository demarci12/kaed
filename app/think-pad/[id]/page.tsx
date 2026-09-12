import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import type { ThinkPadEntry, ThinkPadPage } from '@/lib/think-pad';
import { backlinksFor } from '@/lib/think-pad-helpers';
import { getTableForPage, listRows } from '@/lib/think-pad-tables';
import { InlineEdit } from '@/components/InlineEdit';
import { btnGhost, btnDanger, chip, FormError } from '@/components/ui';
import { ThinkPadDoc } from './ThinkPadDoc';
import { TableSection } from './TableSection';

export default async function ThinkPadPageDetail({ params, searchParams }: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ error?: string }>;
}) {
	const { supabase } = await requireOwner();
	const { id } = await params;
	const { error } = await searchParams;

	const { data: page } = await supabase.from('think_pad_pages').select('*').eq('id', id).maybeSingle();
	if (!page) redirect('/think-pad');
	const typedPage = page as ThinkPadPage;

	const [{ data: lines }, { data: allPages }, table] = await Promise.all([
		supabase.from('think_pad_entries').select('*').eq('page_id', id).order('position', { ascending: true }),
		supabase.from('think_pad_pages').select('id, title').neq('id', id),
		getTableForPage(supabase, id),
	]);

	const [rows, backlinks] = await Promise.all([
		table ? listRows(supabase, table.id) : Promise.resolve([]),
		backlinksFor(supabase, typedPage.user_id, typedPage.title, id),
	]);

	const titleToId = new Map<string, string>();
	for (const p of (allPages ?? []) as { id: string; title: string }[]) {
		titleToId.set(p.title.toLowerCase(), p.id);
	}

	return (
		<section className="max-w-[760px]">
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<Link href="/think-pad" className={btnGhost}>← Think Pad</Link>
				<form method="post" action={`/api/think-pad/${typedPage.id}/delete`} className="m-0">
					<button type="submit" className={btnDanger}>Delete page</button>
				</form>
			</div>

			<InlineEdit
				value={typedPage.title}
				field="title"
				id={typedPage.id}
				endpoint="/api/think-pad"
				className="block mt-3 font-serif text-[clamp(1.9rem,4vw,2.6rem)] font-semibold tracking-[-0.02em] leading-tight"
			/>

			{error && <FormError>{error}</FormError>}

			<ThinkPadDoc pageId={typedPage.id} initialLines={(lines ?? []) as ThinkPadEntry[]} titleToId={titleToId} />

			<TableSection pageId={typedPage.id} table={table} rows={rows} />

			{backlinks.length > 0 && (
				<section className="mt-10 pt-4 border-t border-line">
					<h2 className="m-0 mb-3 font-serif text-lg font-semibold">Linked from</h2>
					<div className="flex flex-wrap gap-2">
						{backlinks.map((b) => (
							<Link key={b.id} href={`/think-pad/${b.id}`} className={chip}>{b.title}</Link>
						))}
					</div>
				</section>
			)}
		</section>
	);
}
