import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { painScore, PAIN_SOURCE_LABELS, SCORE_MAX, type PainPoint } from '@/lib/painhunter';
import { CardItem, CardList, RemoveButton } from '@/components/CardList';
import {
	btnGhost, cardCompact, cardDate, chipMuted, deleteBtn, Empty, FormError, PageHead, Pill, scoreBadge, table, tableWrap,
	tdCompact, tdScore, thCompact, thScore,
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
	const archivedOn = (p: PainPoint) => (p.archived_at ? new Date(p.archived_at).toLocaleDateString() : '');
	const badge = (p: PainPoint) => {
		const score = painScore(p);
		return <span className={scoreBadge} title={score != null ? `Score ${score} of ${SCORE_MAX}` : 'Not fully scored'}>{score ?? '–'}</span>;
	};
	const restore = (p: PainPoint) => (
		<RemoveButton id={p.id} endpoint={`/api/painhunter/${p.id}/restore`} className={btnGhost} ariaLabel="Restore">↺ Restore</RemoveButton>
	);
	const del = (p: PainPoint) => (
		<RemoveButton id={p.id} endpoint={`/api/painhunter/${p.id}/delete`} className={deleteBtn} ariaLabel="Delete permanently" confirm="Delete this pain for good?">×</RemoveButton>
	);

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Personal"
				title="Pain archive."
				lede="Pains hidden from the hunt. Nothing is lost -- restore one to put it back, or delete it for good."
				actions={<Link href="/painhunter" className={btnGhost}>← Painhunter</Link>}
			/>

			{error && <FormError>{error}</FormError>}

			{pains.length ? (
				// Table on a wide screen, compact cards below; one CardList so a restore or delete hides both.
				<CardList className="mt-10">
					<div className={`${tableWrap} hidden lg:block`}>
						<table className={`${table} min-w-[640px]`}>
							<thead>
								<tr>
									<th className={thScore}>Total</th>
									<th className={thCompact}>Pain</th>
									<th className={thCompact}>Source</th>
									<th className={thCompact}>Context</th>
									<th className={thCompact}>Archived</th>
									<th className="border-b border-line" aria-label="Actions" />
								</tr>
							</thead>
							<tbody>
								{pains.map((pain) => (
									<CardItem key={pain.id} as="tr" id={pain.id}>
										<td className={tdScore}>{badge(pain)}</td>
										<td className={`${tdCompact} min-w-[14rem] font-serif text-base font-semibold leading-snug`}>{pain.title}</td>
										<td className={tdCompact}><Pill value={pain.source}>{PAIN_SOURCE_LABELS[pain.source]}</Pill></td>
										<td className={tdCompact}>{pain.context ? <span className={chipMuted}>{pain.context}</span> : <span className="text-xs text-muted">–</span>}</td>
										<td className={`${tdCompact} whitespace-nowrap text-xs text-muted tabular-nums`}>{archivedOn(pain)}</td>
										<td className={`${tdCompact} whitespace-nowrap`}>
											<span className="inline-flex items-center gap-2">{restore(pain)}{del(pain)}</span>
										</td>
									</CardItem>
								))}
							</tbody>
						</table>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 lg:hidden">
						{pains.map((pain) => (
							<CardItem key={pain.id} as="article" id={pain.id} className={cardCompact}>
								<div className="flex items-start gap-2.5">
									<span className="mt-0.5">{badge(pain)}</span>
									<span className="flex-1 min-w-0 font-serif text-base font-semibold leading-snug">{pain.title}</span>
									{del(pain)}
								</div>
								<div className="flex flex-wrap items-center gap-1.5">
									<Pill value={pain.source}>{PAIN_SOURCE_LABELS[pain.source]}</Pill>
									{pain.context && <span className={chipMuted}>{pain.context}</span>}
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className={cardDate}>Archived {archivedOn(pain)}</span>
									{restore(pain)}
								</div>
							</CardItem>
						))}
					</div>
				</CardList>
			) : (
				<div className="mt-10">
					<Empty>Nothing archived.</Empty>
				</div>
			)}
		</section>
	);
}
