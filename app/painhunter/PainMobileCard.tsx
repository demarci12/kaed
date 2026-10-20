'use client';

import { CardDetails } from '@/components/CardDetails';
import { CardItem, RemoveButton } from '@/components/CardList';
import { InlineEdit } from '@/components/InlineEdit';
import { cardCompact, chip, chipMuted, cx, deleteBtn, iconBtn, Pill, scoreBadge } from '@/components/ui';
import { PAIN_SOURCE_LABELS, painScore, SCORE_MAX, SCORES, type PainPoint } from '@/lib/painhunter';
import type { LinkedIdea } from './IdeaLinks';
import { PainDetails } from './PainDetails';
import { SOURCE_OPTIONS } from './PainRow';
import { ScoreSelect } from './ScoreSelect';

const ENDPOINT = '/api/painhunter';

/**
 * The small-screen version of a pain: title, source, context and the five
 * score dropdowns up front, everything else behind a collapsed "Details".
 */
export function PainMobileCard({ pain, linked, linkOptions, top }: {
	pain: PainPoint;
	linked: LinkedIdea[];
	linkOptions: { id: string; title: string }[];
	top: boolean;
}) {
	const score = painScore(pain);

	return (
		<CardItem as="article" id={pain.id} className={cardCompact}>
			<div className="flex items-start gap-2.5">
				<span
					className={cx(scoreBadge, 'mt-0.5', top && 'border-ink text-ink')}
					title={score != null ? `Score ${score} of ${SCORE_MAX}` : 'Score all five to rank this pain'}
				>{score ?? '–'}</span>
				<InlineEdit
					value={pain.title}
					field="title"
					id={pain.id}
					endpoint={ENDPOINT}
					className="block flex-1 min-w-0 font-serif text-base font-semibold leading-snug text-ink"
				/>
				<span className="inline-flex items-center gap-1 shrink-0">
					<RemoveButton
						id={pain.id}
						endpoint={`${ENDPOINT}/${pain.id}/archive`}
						className={iconBtn}
						ariaLabel="Archive pain"
						title="Archive"
						confirm={`Archive "${pain.title}"? You can restore it from the archive.`}
					>⤓</RemoveButton>
					<RemoveButton
						id={pain.id}
						endpoint={`${ENDPOINT}/${pain.id}/delete`}
						className={deleteBtn}
						ariaLabel="Delete pain"
						confirm={`Delete "${pain.title}" permanently? This cannot be undone.`}
					>×</RemoveButton>
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-1.5">
				<InlineEdit
					value={pain.source}
					field="source"
					id={pain.id}
					endpoint={ENDPOINT}
					kind="select"
					options={SOURCE_OPTIONS}
					className="inline-block cursor-pointer"
					display={<Pill value={pain.source}>{PAIN_SOURCE_LABELS[pain.source]}</Pill>}
				/>
				<InlineEdit
					value={pain.context ?? ''}
					field="context"
					id={pain.id}
					endpoint={ENDPOINT}
					className="inline-block cursor-text"
					placeholder="Add context"
					display={<span className={cx(chipMuted, 'max-w-[10rem] truncate align-middle')}>{pain.context || 'Add context'}</span>}
				/>
				{top && <span className={chip}>★ Top 3</span>}
			</div>

			<div className="grid grid-cols-5 gap-1 justify-items-center">
				{SCORES.map(({ key, label, hint }) => (
					<div key={key} className="flex flex-col items-center gap-0.5" title={hint}>
						<span className="text-[10px] text-muted">{label}</span>
						<ScoreSelect id={pain.id} field={`score_${key}`} value={pain[`score_${key}` as const]} label={`${label} score`} hint={hint} />
					</div>
				))}
			</div>

			<CardDetails
				label={linked.length ? `Details · ${linked.length} idea${linked.length === 1 ? '' : 's'}` : 'Details'}
				preview={pain.details}
			>
				<PainDetails pain={pain} linked={linked} linkOptions={linkOptions} />
			</CardDetails>
		</CardItem>
	);
}
