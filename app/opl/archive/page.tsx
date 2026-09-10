import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { OPEN_POINT_STATUS_LABELS, type OpenPoint } from '@/lib/open-points';
import { CardItem, CardList, RemoveButton } from '@/components/CardList';
import {
	btnGhost, card, cardDate, cardFoot, cardHead, cardTitle, deleteBtn, Empty, FormError, PageHead, Pill,
} from '@/components/ui';

export default async function OplArchivePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const { data: points } = await supabase
		.from('open_points')
		.select('*')
		.not('archived_at', 'is', null)
		.order('archived_at', { ascending: false });

	const typedPoints = (points ?? []) as OpenPoint[];

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Delivery"
				title="OPL archive."
				lede="Items hidden from the main list. Notes and status history are kept -- restore one to bring it back, or delete it for good."
				actions={<Link href="/opl" className={btnGhost}>← OPL</Link>}
			/>

			{error && <FormError>{error}</FormError>}

			<CardList className="mt-10 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
				{typedPoints.length ? (
					typedPoints.map((point) => (
						<CardItem key={point.id} id={point.id} className={card}>
							<div className={cardHead}>
								<Link href={`/opl/${point.id}`} className={cardTitle}>{point.title || 'Untitled'}</Link>
								<RemoveButton
									id={point.id}
									endpoint={`/api/open-points/${point.id}/delete`}
									className={`${deleteBtn} shrink-0`}
									ariaLabel="Delete permanently"
									confirm="Delete this item for good? Notes and history go with it."
								>×</RemoveButton>
							</div>

							<Pill value={point.status}>{OPEN_POINT_STATUS_LABELS[point.status]}</Pill>

							<div className={`${cardFoot} justify-between`}>
								<span className={cardDate}>
									Archived {point.archived_at ? new Date(point.archived_at).toLocaleDateString() : ''}
								</span>
								<RemoveButton
									id={point.id}
									endpoint={`/api/open-points/${point.id}/restore`}
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
