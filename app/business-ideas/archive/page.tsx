import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import type { BusinessIdea } from '@/lib/business-ideas';
import { IDEA_CATEGORY_PILL_LABELS } from '@/lib/idea-categories';
import { CardItem, CardList, RemoveButton } from '@/components/CardList';
import {
	btnGhost, card, cardDate, cardFoot, cardHead, cardTitle, deleteBtn, Empty, FormError, PageHead, Pill,
} from '@/components/ui';

export default async function BusinessIdeasArchivePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const { data: ideas } = await supabase
		.from('business_ideas')
		.select('*')
		.not('archived_at', 'is', null)
		.order('archived_at', { ascending: false });

	const typedIdeas = (ideas ?? []) as BusinessIdea[];

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Personal"
				title="Idea archive."
				lede="Ideas hidden from the register. Nothing is lost -- restore one to put it back at the bottom of the ranking, or delete it for good."
				actions={<Link href="/business-ideas" className={btnGhost}>← Business ideas</Link>}
			/>

			{error && <FormError>{error}</FormError>}

			<CardList className="mt-10 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
				{typedIdeas.length ? (
					typedIdeas.map((idea) => (
						<CardItem key={idea.id} id={idea.id} className={card}>
							<div className={cardHead}>
								<Link href={`/business-ideas/${idea.id}`} className={cardTitle}>{idea.title || 'Untitled'}</Link>
								<RemoveButton
									id={idea.id}
									endpoint={`/api/business-ideas/${idea.id}/delete`}
									className={`${deleteBtn} shrink-0`}
									ariaLabel="Delete permanently"
									confirm="Delete this idea for good?"
								>×</RemoveButton>
							</div>

							{idea.category && <Pill value={idea.category}>{IDEA_CATEGORY_PILL_LABELS[idea.category]}</Pill>}

							<div className={`${cardFoot} justify-between`}>
								<span className={cardDate}>
									Archived {idea.archived_at ? new Date(idea.archived_at).toLocaleDateString() : ''}
								</span>
								<RemoveButton
									id={idea.id}
									endpoint={`/api/business-ideas/${idea.id}/restore`}
									className={btnGhost}
									ariaLabel="Restore"
								>↺ Restore</RemoveButton>
							</div>
						</CardItem>
					))
				) : (
					<Empty>Nothing archived.</Empty>
				)}
			</CardList>
		</section>
	);
}
