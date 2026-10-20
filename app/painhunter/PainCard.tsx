import { CardItem, RemoveButton } from '@/components/CardList';
import { InlineEdit } from '@/components/InlineEdit';
import {
	card, cardActions, cardHead, cardLabel, cardTitle, cardValue, chip, chipMuted, cx, deleteBtn, iconBtn, Pill,
	scoreBadge, btnGhost, cardFoot,
} from '@/components/ui';
import {
	PAIN_CONTEXT_LABELS, PAIN_CONTEXTS, PAIN_SOURCE_LABELS, PAIN_SOURCE_OPTION_LABELS, PAIN_SOURCES,
	painScore, SCORE_MAX, SCORES, type PainPoint,
} from '@/lib/painhunter';
import { IdeaLinks, type LinkedIdea } from './IdeaLinks';

const ENDPOINT = '/api/painhunter';

const SOURCE_OPTIONS: [string, string][] = PAIN_SOURCES.map((s) => [s, PAIN_SOURCE_OPTION_LABELS[s]]);
const CONTEXT_OPTIONS: [string, string][] = [['', 'No context'], ...PAIN_CONTEXTS.map((c): [string, string] => [c, PAIN_CONTEXT_LABELS[c]])];
const SCORE_OPTIONS: [string, string][] = [['', '–'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']];

function Field({ label, field, pain, value }: { label: string; field: string; pain: PainPoint; value: string | null }) {
	return (
		<div className="min-w-0">
			<span className={cardLabel}>{label}</span>
			<InlineEdit value={value ?? ''} field={field} id={pain.id} endpoint={ENDPOINT} kind="textarea" className={`block ${cardValue}`} />
		</div>
	);
}

export function PainCard({ pain, linked, linkOptions, top }: {
	pain: PainPoint;
	linked: LinkedIdea[];
	linkOptions: { id: string; title: string }[];
	/** One of the three best fully-scored pains in an unfiltered, score-sorted list. */
	top: boolean;
}) {
	const score = painScore(pain);

	return (
		<CardItem id={pain.id} className={card}>
			<div className={cardHead}>
				<span
					className={scoreBadge}
					title={score != null ? `Score ${score} of ${SCORE_MAX}` : 'Score all five to rank this pain'}
				>{score ?? '–'}</span>
				<InlineEdit value={pain.title} field="title" id={pain.id} endpoint={ENDPOINT} className={cardTitle} />
				<div className={cardActions}>
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
				</div>
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
					kind="select"
					options={CONTEXT_OPTIONS}
					className="inline-block cursor-pointer"
					display={<span className={chipMuted}>{pain.context ? PAIN_CONTEXT_LABELS[pain.context] : 'Add context'}</span>}
				/>
				<InlineEdit
					value={pain.noticed_on}
					field="noticed_on"
					id={pain.id}
					endpoint={ENDPOINT}
					kind="date"
					className="inline-block text-xs text-muted tabular-nums"
				/>
				{top && <span className={chip}>★ Top 3</span>}
			</div>

			<Field label="What happens" field="details" pain={pain} value={pain.details} />
			<Field label="Who has it" field="who" pain={pain} value={pain.who} />
			<Field label="How it is handled today" field="workaround" pain={pain} value={pain.workaround} />

			<div>
				<span className={cardLabel}>Score</span>
				<div className="mt-1 grid grid-cols-5 gap-1.5">
					{SCORES.map(({ key, label, hint }) => {
						const value = pain[`score_${key}`];
						return (
							<div key={key} className="flex flex-col items-center gap-0.5" title={hint}>
								<span className="text-[10px] text-muted">{label}</span>
								<InlineEdit
									value={value == null ? '' : String(value)}
									field={`score_${key}`}
									id={pain.id}
									endpoint={ENDPOINT}
									kind="select"
									options={SCORE_OPTIONS}
									className="inline-block cursor-pointer"
									display={
										<span className={cx(
											'inline-flex items-center justify-center w-8 h-7 rounded-lg border text-sm tabular-nums',
											value == null ? 'border-dashed border-line text-muted' : 'border-line bg-canvas text-ink font-semibold',
										)}>{value ?? '–'}</span>
									}
								/>
							</div>
						);
					})}
				</div>
			</div>

			<div className="min-w-0">
				<span className={cardLabel}>Business ideas</span>
				<div className="mt-1.5">
					<IdeaLinks painId={pain.id} linked={linked} options={linkOptions} />
				</div>
			</div>

			{linked.length === 0 && (
				<div className={cardFoot}>
					<form method="post" action={`${ENDPOINT}/${pain.id}/promote`} className="m-0">
						<button type="submit" className={btnGhost}>→ Make it a business idea</button>
					</form>
				</div>
			)}
		</CardItem>
	);
}
