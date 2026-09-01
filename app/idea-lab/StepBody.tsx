import Link from 'next/link';
import {
	IDEA_DECISION_LABELS, type IdeaCandidate, type IdeaLabEvidence, type IdeaLabStep, type IdeaLabWorksheet,
} from '@/lib/idea-lab';
import { InlineEdit } from '@/components/InlineEdit';
import { btn, cardValue, chip, chipMuted, cx, deleteBtn, Empty, Pill } from '@/components/ui';
import { NewEvidencePopup } from './NewEvidencePopup';

const DECISION_OPTIONS = Object.entries(IDEA_DECISION_LABELS) as [string, string][];

/**
 * The working surface for one step -- a prose field, the Step 3 evidence log,
 * or the Step 6 idea list. Split out of the page because both views render it:
 * the guided walkthrough shows exactly one, the "all steps" view shows eleven.
 * Keeping it in one place is what stops the two views from drifting apart.
 */
export function StepBody({
	step, worksheet, evidence, candidates,
}: {
	step: IdeaLabStep;
	worksheet: IdeaLabWorksheet;
	evidence: IdeaLabEvidence[];
	candidates: IdeaCandidate[];
}) {
	if (step.field === 'evidence') {
		return (
			<div className="flex flex-col gap-3">
				<div className="flex justify-end">
					<NewEvidencePopup />
				</div>
				{evidence.length ? (
					<div className="flex flex-col gap-3">
						{evidence.map((e) => (
							<div key={e.id} className="p-4 rounded-[10px] border border-line bg-canvas">
								<div className="flex items-start justify-between gap-3">
									<p className="m-0 text-sm font-medium">{e.problem}</p>
									<form method="post" action={`/api/idea-lab/evidence/${e.id}/delete`} className="m-0 shrink-0">
										<button type="submit" className={deleteBtn} aria-label="Delete evidence">×</button>
									</form>
								</div>
								<div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-muted">
									{e.source && <span className={chipMuted}>{e.source}</span>}
									{e.engagement && <span>{e.engagement}</span>}
									{e.found_on && <span className="tabular-nums">{new Date(e.found_on).toLocaleDateString()}</span>}
									{e.permalink && (
										<a href={e.permalink} target="_blank" rel="noopener noreferrer" className="text-ink">↗ Source</a>
									)}
								</div>
								{e.quote && <p className="mt-2.5 mb-0 text-sm italic text-muted">&ldquo;{e.quote}&rdquo;</p>}
							</div>
						))}
					</div>
				) : (
					<Empty>No findings logged yet.</Empty>
				)}
			</div>
		);
	}

	if (step.field === 'candidates') {
		return (
			<div className="flex flex-col gap-3">
				<form method="post" action="/api/idea-lab/candidates/create" className="m-0 flex gap-2 flex-wrap">
					<input
						type="text" name="title" required maxLength={160} placeholder="An idea that came out of the above…"
						className="h-10 flex-1 min-w-[16rem] px-3.5 rounded-full border border-line bg-canvas text-sm text-ink outline-none focus:border-ink"
					/>
					<button type="submit" className={btn}>+ Add idea</button>
				</form>

				{candidates.length ? (
					<div className="flex flex-col gap-3">
						{candidates.map((c) => (
							<div key={c.id} className="p-4 rounded-[10px] border border-line bg-canvas">
								<div className="flex items-start justify-between gap-3">
									<InlineEdit
										value={c.title} field="title" id={c.id} endpoint="/api/idea-lab"
										className="text-sm font-medium" display={c.title}
									/>
									<form method="post" action={`/api/idea-lab/${c.id}/delete`} className="m-0 shrink-0">
										<button type="submit" className={deleteBtn} aria-label="Delete idea">×</button>
									</form>
								</div>

								<InlineEdit
									value={c.note ?? ''} field="note" id={c.id} endpoint="/api/idea-lab" kind="textarea"
									className={cx('block mt-1', cardValue)} placeholder="Why this one, in a line…"
								/>

								<div className="mt-2 flex items-center gap-2 flex-wrap">
									<InlineEdit
										value={c.decision} field="decision" id={c.id} endpoint="/api/idea-lab"
										kind="select" options={DECISION_OPTIONS} className="inline-block cursor-pointer"
										display={<Pill value={c.decision}>{IDEA_DECISION_LABELS[c.decision]}</Pill>}
									/>
									{c.business_idea_id ? (
										<Link href={`/business-ideas/${c.business_idea_id}`} className={chip}>→ View business idea</Link>
									) : (
										<form method="post" action={`/api/idea-lab/${c.id}/convert`} className="m-0">
											<button type="submit" className={chip}>Convert to business idea →</button>
										</form>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
					<Empty>No ideas yet. Work Steps 1-5 first, then name what surfaced.</Empty>
				)}
			</div>
		);
	}

	return (
		<InlineEdit
			value={worksheet[step.field] ?? ''}
			field={step.field}
			id={worksheet.id}
			endpoint="/api/idea-lab/worksheet"
			kind="textarea"
			className={cx('block', cardValue)}
			placeholder="Write something…"
		/>
	);
}
