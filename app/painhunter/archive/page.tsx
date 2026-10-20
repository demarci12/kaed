import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { painScore, PAIN_CONTEXT_LABELS, PAIN_SOURCE_LABELS, SCORE_MAX, type PainPoint } from '@/lib/painhunter';
import { CardItem, CardList, RemoveButton } from '@/components/CardList';
import {
	btnGhost, card, cardDate, cardFoot, cardGrid, cardHead, cardTitle, chipMuted, deleteBtn, Empty, FormError, PageHead,
	Pill, scoreBadge,
} from '@/components/ui';

export default async function PainhunterArchivePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const { data } = await supabase
		.from('pain_points')
		.select('*')
		.not('archived_at', 'is', null)
		.order('archived_at', { ascending: false });

	const pains = (data ?? []) as PainPoint[];

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Personal"
				title="Pain archive."
				lede="Pains hidden from the hunt. Nothing is lost -- restore one to put it back, or delete it for good."
				actions={<Link href="/painhunter" className={btnGhost}>← Painhunter</Link>}
			/>

			{error && <FormError>{error}</FormError>}

			<CardList className={cardGrid}>
				{pains.length ? (
					pains.map((pain) => {
						const score = painScore(pain);
						return (
							<CardItem key={pain.id} id={pain.id} className={card}>
								<div className={cardHead}>
									<span className={scoreBadge} title={score != null ? `Score ${score} of ${SCORE_MAX}` : 'Not fully scored'}>{score ?? '–'}</span>
									<span className={cardTitle}>{pain.title}</span>
									<RemoveButton
										id={pain.id}
										endpoint={`/api/painhunter/${pain.id}/delete`}
										className={`${deleteBtn} shrink-0`}
										ariaLabel="Delete permanently"
										confirm="Delete this pain for good?"
									>×</RemoveButton>
								</div>

								<div className="flex flex-wrap items-center gap-1.5">
									<Pill value={pain.source}>{PAIN_SOURCE_LABELS[pain.source]}</Pill>
									{pain.context && <span className={chipMuted}>{PAIN_CONTEXT_LABELS[pain.context]}</span>}
								</div>

								<div className={`${cardFoot} justify-between`}>
									<span className={cardDate}>
										Archived {pain.archived_at ? new Date(pain.archived_at).toLocaleDateString() : ''}
									</span>
									<RemoveButton
										id={pain.id}
										endpoint={`/api/painhunter/${pain.id}/restore`}
										className={btnGhost}
										ariaLabel="Restore"
									>↺ Restore</RemoveButton>
								</div>
							</CardItem>
						);
					})
				) : (
					<Empty>Nothing archived.</Empty>
				)}
			</CardList>
		</section>
	);
}
