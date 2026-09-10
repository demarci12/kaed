import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { STUDY_SOURCE_LABELS, STUDY_STATUS_LABELS, type Study } from '@/lib/studies';
import { CardItem, CardList, RemoveButton } from '@/components/CardList';
import {
	btn, card, cardDate, cardFoot, cardGrid, cardHead, cardTitle, chipMuted, deleteBtn, Empty, FormError, PageHead, Pill,
} from '@/components/ui';

const SOURCE_OPTIONS = Object.entries(STUDY_SOURCE_LABELS) as [string, string][];

export default async function StudiesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const [{ data: studies }, { data: takeaways }] = await Promise.all([
		supabase.from('studies').select('*').order('created_at', { ascending: false }),
		supabase.from('study_takeaways').select('study_id'),
	]);

	const typedStudies = (studies ?? []) as Study[];
	const countByStudy = new Map<string, number>();
	for (const t of (takeaways ?? []) as { study_id: string }[]) {
		countByStudy.set(t.study_id, (countByStudy.get(t.study_id) ?? 0) + 1);
	}

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Personal"
				title="Studies."
				lede="Paste a URL -- Claude reads it and pulls out takeaways relevant to delivery, marketing, sales, market research, or anything else that matters for building a startup. Manual for now; auto-scraping YouTube/X/websites is the long-term goal."
			/>

			{error && <FormError>{error}</FormError>}

			<form method="post" action="/api/studies/create" className="mt-8 flex gap-2.5 flex-wrap items-stretch">
				<input
					type="url" name="url" required placeholder="https://…"
					className="flex-1 basis-64 h-11 px-3.5 rounded-full border border-line bg-canvas text-sm text-ink outline-none focus:border-ink"
				/>
				<select
					name="source_type" defaultValue="blog"
					className="h-11 px-3.5 rounded-full border border-line bg-canvas text-sm text-ink outline-none focus:border-ink"
				>
					{SOURCE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
				</select>
				<button type="submit" className={btn}>Summarize</button>
			</form>

			<CardList className={cardGrid}>
				{typedStudies.length ? (
					typedStudies.map((s) => (
						<CardItem key={s.id} id={s.id} className={card}>
							<div className={cardHead}>
								<Link href={`/studies/${s.id}`} className={cardTitle}>
									{s.title || (s.status === 'pending' ? 'Summarizing…' : new URL(s.url).hostname)}
								</Link>
								<RemoveButton
									id={s.id}
									endpoint={`/api/studies/${s.id}/delete`}
									className={`${deleteBtn} shrink-0`}
									ariaLabel="Delete study"
								>×</RemoveButton>
							</div>

							<div className="flex items-center gap-2 flex-wrap">
								<Pill value={s.status}>{STUDY_STATUS_LABELS[s.status]}</Pill>
								<span className={chipMuted}>{STUDY_SOURCE_LABELS[s.source_type]}</span>
								{s.status === 'summarized' && (
									<span className={chipMuted}>{countByStudy.get(s.id) ?? 0} takeaways</span>
								)}
							</div>

							<a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted truncate hover:text-ink">
								{s.url}
							</a>

							<div className={`${cardFoot} justify-end`}>
								<span className={cardDate}>{new Date(s.created_at).toLocaleDateString()}</span>
							</div>
						</CardItem>
					))
				) : (
					<Empty>Nothing here yet. Paste a URL above to summarize your first one.</Empty>
				)}
			</CardList>
		</section>
	);
}
