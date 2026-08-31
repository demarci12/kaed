import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { IDEA_DECISION_LABELS, type IdeaCandidate } from '@/lib/idea-lab';
import {
	btn, card, cardDate, cardFoot, cardGrid, cardHead, cardTitle, chip, deleteBtn, Empty, FormError, PageHead, Pill,
} from '@/components/ui';

export default async function IdeaLabPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const { data: candidates } = await supabase
		.from('idea_candidates')
		.select('*')
		.order('rank', { ascending: true });

	const typedCandidates = (candidates ?? []) as IdeaCandidate[];

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Delivery"
				title="Idea Lab."
				lede="The 11-step process for finding a startup idea worth building -- from auditing your own background through to a go/no-go decision. Open a candidate to work through the steps; convert it to the business idea register once it's earned it."
				actions={
					<form method="post" action="/api/idea-lab/create" className="m-0 shrink-0 w-full md:w-auto">
						<input type="text" name="title" required placeholder="New candidate idea…" maxLength={160}
							className="h-10 px-3.5 rounded-full border border-line bg-canvas text-sm text-ink outline-none w-full md:w-64 focus:border-ink" />
						<button type="submit" className={`${btn} w-full md:w-auto mt-2 md:mt-0 md:ml-2`}>+ Start</button>
					</form>
				}
			/>

			{error && <FormError>{error}</FormError>}

			<div className={cardGrid}>
				{typedCandidates.length ? (
					typedCandidates.map((c) => (
						<article key={c.id} className={card}>
							<div className={cardHead}>
								<Link href={`/idea-lab/${c.id}`} className={cardTitle}>{c.title}</Link>
								<form method="post" action={`/api/idea-lab/${c.id}/delete`} className="m-0 shrink-0">
									<button type="submit" className={deleteBtn} aria-label="Delete candidate">×</button>
								</form>
							</div>

							<div className="flex items-center gap-2 flex-wrap">
								<Pill value={c.decision}>{IDEA_DECISION_LABELS[c.decision]}</Pill>
								{c.business_idea_id && (
									<Link href={`/business-ideas/${c.business_idea_id}`} className={chip}>→ Converted</Link>
								)}
							</div>

							<div className={`${cardFoot} justify-end`}>
								<span className={cardDate}>{new Date(c.updated_at).toLocaleDateString()}</span>
							</div>
						</article>
					))
				) : (
					<Empty>No candidates yet. Start one above and work through the 11 steps.</Empty>
				)}
			</div>
		</section>
	);
}
