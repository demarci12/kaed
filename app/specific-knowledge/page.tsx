import { requireOwner } from '@/lib/auth';
import { KNOWLEDGE_KIND_LABELS, type KnowledgeCard } from '@/lib/knowledge';
import { InlineEdit } from '@/components/InlineEdit';
import {
	card, cardDate, cardFoot, cardGrid, cardHead, cardLabel, cardTitle, cardValue,
	chipMuted, deleteBtn, Empty, FormError, PageHead, Pill,
} from '@/components/ui';
import { NewCardPopup } from './NewCardPopup';

const KIND_OPTIONS: [string, string][] = [['', 'No kind'], ...Object.entries(KNOWLEDGE_KIND_LABELS)];

export default async function SpecificKnowledgePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const { data: cards } = await supabase
		.from('knowledge_cards')
		.select('*')
		.order('created_at', { ascending: false });

	const typedCards = (cards ?? []) as KnowledgeCard[];

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Personal"
				title="Specific knowledge."
				lede="What you can't be trained for — the things you're genuinely obsessed with, unusually good at, or have actually lived through. Feels like play to you, looks like work to everyone else. Click any field to edit it."
				actions={<NewCardPopup />}
			/>

			{error && <FormError>{error}</FormError>}

			<div className={cardGrid}>
				{typedCards.length ? (
					typedCards.map((item) => (
						<article key={item.id} className={card}>
							<div className={cardHead}>
								<InlineEdit
									value={item.title}
									field="title"
									id={item.id}
									endpoint="/api/knowledge-cards"
									className={cardTitle}
								/>
								<form method="post" action={`/api/knowledge-cards/${item.id}/delete`} className="m-0 shrink-0">
									<button type="submit" className={deleteBtn} aria-label="Delete card">×</button>
								</form>
							</div>

							<InlineEdit
								value={item.kind ?? ''}
								field="kind"
								id={item.id}
								endpoint="/api/knowledge-cards"
								kind="select"
								options={KIND_OPTIONS}
								className="inline-block self-start cursor-pointer"
								display={
									item.kind
										? <Pill value={item.kind}>{KNOWLEDGE_KIND_LABELS[item.kind]}</Pill>
										: <span className={chipMuted}>Pick kind</span>
								}
							/>

							<div className="min-w-0">
								<span className={cardLabel}>What it is</span>
								<InlineEdit
									value={item.body ?? ''}
									field="body"
									id={item.id}
									endpoint="/api/knowledge-cards"
									kind="textarea"
									className={`block ${cardValue}`}
								/>
							</div>

							<div className="min-w-0">
								<span className={cardLabel}>Evidence</span>
								<InlineEdit
									value={item.evidence ?? ''}
									field="evidence"
									id={item.id}
									endpoint="/api/knowledge-cards"
									kind="textarea"
									className={`block ${cardValue}`}
								/>
							</div>

							<div className={`${cardFoot} justify-end`}>
								<span className={cardDate}>{new Date(item.created_at).toLocaleDateString()}</span>
							</div>
						</article>
					))
				) : (
					<Empty>Nothing here yet. Add your first card to start mapping what you actually know.</Empty>
				)}
			</div>
		</section>
	);
}
