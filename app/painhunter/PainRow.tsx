'use client';

import { useState } from 'react';
import { CardItem, RemoveButton } from '@/components/CardList';
import { InlineEdit } from '@/components/InlineEdit';
import { chip, chipMuted, cx, deleteBtn, iconBtn, Pill, scoreBadge, tdCompact, tdScore } from '@/components/ui';
import {
	PAIN_SOURCE_LABELS, PAIN_SOURCE_OPTION_LABELS, PAIN_SOURCES, painScore, SCORE_MAX, SCORES, type PainPoint,
} from '@/lib/painhunter';
import type { LinkedIdea } from './IdeaLinks';
import { PainDetails } from './PainDetails';
import { ScoreSelect } from './ScoreSelect';

const ENDPOINT = '/api/painhunter';

/** Columns in the main line: expand, total, pain, source, context, five scores, ideas, actions. */
export const PAIN_COLUMNS = 5 + SCORES.length + 3;

export const SOURCE_OPTIONS: [string, string][] = PAIN_SOURCES.map((s) => [s, PAIN_SOURCE_OPTION_LABELS[s]]);

/**
 * One pain as a line in the desktop table: score total, the pain, where it
 * came from and the five scores as dropdowns. Everything else is in a detail
 * line under it, opened with the chevron.
 */
export function PainRow({ pain, linked, linkOptions, top }: {
	pain: PainPoint;
	linked: LinkedIdea[];
	linkOptions: { id: string; title: string }[];
	/** One of the three best fully-scored pains in an unfiltered, score-sorted list. */
	top: boolean;
}) {
	const [open, setOpen] = useState(false);
	const score = painScore(pain);
	const edge = open ? 'border-b-0' : '';

	return (
		<CardItem as="tbody" id={pain.id}>
			<tr>
				<td className={cx(tdCompact, edge, 'w-8 !px-2')}>
					<button
						type="button"
						className={iconBtn}
						aria-expanded={open}
						aria-label={open ? 'Hide details' : 'Show details'}
						title={open ? 'Hide details' : 'Details'}
						onClick={() => setOpen(!open)}
					><span aria-hidden="true" className={cx('inline-block transition-transform', open && 'rotate-90')}>▸</span></button>
				</td>
				<td className={cx(tdScore, edge)}>
					<span className="inline-flex flex-col items-center gap-0.5">
						<span
							className={cx(scoreBadge, top && 'border-ink text-ink')}
							title={score != null ? `Score ${score} of ${SCORE_MAX}${top ? ' — top 3' : ''}` : 'Score all five to rank this pain'}
						>{score ?? '–'}</span>
						{top && <span className="text-[10px] leading-none text-ink" title="Top 3" aria-label="Top 3">★</span>}
					</span>
				</td>
				<td className={cx(tdCompact, edge, 'min-w-[14rem]')}>
					<InlineEdit
						value={pain.title}
						field="title"
						id={pain.id}
						endpoint={ENDPOINT}
						className="block font-serif text-base font-semibold leading-snug text-ink"
					/>
				</td>
				<td className={cx(tdCompact, edge)}>
					<InlineEdit
						value={pain.source}
						field="source"
						id={pain.id}
						endpoint={ENDPOINT}
						kind="select"
						options={SOURCE_OPTIONS}
						className="inline-block cursor-pointer whitespace-nowrap"
						display={<Pill value={pain.source}>{PAIN_SOURCE_LABELS[pain.source]}</Pill>}
					/>
				</td>
				<td className={cx(tdCompact, edge)}>
					<InlineEdit
						value={pain.context ?? ''}
						field="context"
						id={pain.id}
						endpoint={ENDPOINT}
						className="inline-block cursor-text"
						placeholder="Add context"
						display={<span className={cx(chipMuted, 'max-w-[9rem] truncate align-middle')} title={pain.context ?? undefined}>{pain.context || 'Add context'}</span>}
					/>
				</td>
				{SCORES.map(({ key, label, hint }) => (
					<td key={key} className={cx(tdScore, edge)}>
						<ScoreSelect id={pain.id} field={`score_${key}`} value={pain[`score_${key}` as const]} label={`${label} score`} hint={hint} />
					</td>
				))}
				<td className={cx(tdCompact, edge)}>
					{linked.length ? (
						<button type="button" className={cx(chip, 'cursor-pointer whitespace-nowrap')} title="Show linked ideas" onClick={() => setOpen(true)}>
							{linked.length} idea{linked.length === 1 ? '' : 's'}
						</button>
					) : (
						<span className="text-xs text-muted">–</span>
					)}
				</td>
				<td className={cx(tdCompact, edge, 'whitespace-nowrap')}>
					<span className="inline-flex items-center gap-1.5">
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
				</td>
			</tr>

			{open && (
				<tr>
					<td colSpan={PAIN_COLUMNS} className="px-5 pt-1 pb-5 border-b border-line bg-canvas">
						<PainDetails pain={pain} linked={linked} linkOptions={linkOptions} />
					</td>
				</tr>
			)}
		</CardItem>
	);
}
