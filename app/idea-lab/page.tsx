import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { getOrCreateWorksheet } from '@/lib/idea-lab-worksheet';
import {
	IDEA_DECISION_LABELS, IDEA_LAB_PHASE_LABELS, IDEA_LAB_STEPS,
	type IdeaCandidate, type IdeaLabEvidence, type IdeaLabStep,
} from '@/lib/idea-lab';
import { InlineEdit } from '@/components/InlineEdit';
import {
	btn, cardValue, chip, chipMuted, cx, deleteBtn, Empty, FormError, PageHead, Pill,
} from '@/components/ui';
import { NewEvidencePopup } from './NewEvidencePopup';

const DECISION_OPTIONS = Object.entries(IDEA_DECISION_LABELS) as [string, string][];

/**
 * The Idea Lab *is* the worksheet. There is no candidate list standing in
 * front of it and no "pick an idea first" gate: the 11 steps are how you find
 * an idea, so they have to be the first thing on the page. Ideas appear at
 * Step 6, out of the work done in Steps 1-5.
 */
export default async function IdeaLabPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase, user } = await requireOwner();
	const [{ error }, worksheet] = await Promise.all([
		searchParams,
		getOrCreateWorksheet(supabase, user.id),
	]);

	if (!worksheet) {
		return (
			<section className="max-w-[760px]">
				<PageHead eyebrow="Delivery" title="Idea Lab." lede="The 11-step process for finding a startup idea worth building." />
				<FormError>Could not open your worksheet. Reload to try again.</FormError>
			</section>
		);
	}

	const [{ data: evidence }, { data: candidates }] = await Promise.all([
		supabase
			.from('idea_lab_evidence')
			.select('*')
			.eq('idea_lab_id', worksheet.id)
			.order('created_at', { ascending: false }),
		supabase
			.from('idea_candidates')
			.select('*')
			.eq('idea_lab_id', worksheet.id)
			.order('rank', { ascending: true }),
	]);

	const typedEvidence = (evidence ?? []) as IdeaLabEvidence[];
	const typedCandidates = (candidates ?? []) as IdeaCandidate[];

	const done = (step: IdeaLabStep) => {
		if (step.field === 'evidence') return typedEvidence.length > 0;
		if (step.field === 'candidates') return typedCandidates.length > 0;
		return Boolean(worksheet[step.field]);
	};

	return (
		<section className="max-w-[760px]">
			<PageHead
				eyebrow="Delivery"
				title="Idea Lab."
				lede="Eleven steps for finding a startup idea worth building. Steps 1-5 gather the raw material, Step 6 is where the ideas actually surface, Steps 7-11 sharpen them. Click any field to write."
			/>

			{error && <FormError>{error}</FormError>}

			{/* Jump-to-step rail, doubling as a progress read: a filled marker
			    means that step has something in it. Without this the only way to
			    reach Step 11 was scrolling past ten others every time. */}
			<nav className="mt-6 flex gap-1.5 flex-wrap items-center" aria-label="Jump to step">
				{IDEA_LAB_STEPS.map((step) => (
					<a
						key={step.n}
						href={`#step-${step.n}`}
						title={`${step.n}. ${step.title}`}
						className={cx(
							'font-mono text-[11px] no-underline border rounded-full px-2.5 py-[3px]',
							done(step)
								? 'bg-ink text-paper border-ink'
								: 'bg-paper text-muted border-line hover:border-ink hover:text-ink',
						)}
					>
						{step.n}
					</a>
				))}
				<span className="ml-1 text-xs text-muted tabular-nums">
					{IDEA_LAB_STEPS.filter(done).length}/{IDEA_LAB_STEPS.length}
				</span>
			</nav>

			<div className="mt-10 flex flex-col gap-12">
				{IDEA_LAB_STEPS.map((step, i) => (
					<div key={step.n} id={`step-${step.n}`} className="scroll-mt-6">
						{(i === 0 || IDEA_LAB_STEPS[i - 1].phase !== step.phase) && (
							<p className="mt-0 mb-5 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted">
								{IDEA_LAB_PHASE_LABELS[step.phase]}
							</p>
						)}

						<div className="flex items-baseline gap-2.5">
							<span className="font-serif text-lg font-semibold text-muted tabular-nums">{step.n}.</span>
							<h2 className="m-0 font-serif text-lg font-semibold">{step.title}</h2>
						</div>
						<p className="mt-1.5 mb-4 text-sm text-muted leading-relaxed">{step.guidance}</p>

						{step.field === 'evidence' ? (
							<div className="flex flex-col gap-3">
								<div className="flex justify-end">
									<NewEvidencePopup />
								</div>
								{typedEvidence.length ? (
									<div className="flex flex-col gap-3">
										{typedEvidence.map((e) => (
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
						) : step.field === 'candidates' ? (
							<div className="flex flex-col gap-3">
								<form method="post" action="/api/idea-lab/candidates/create" className="m-0 flex gap-2 flex-wrap">
									<input
										type="text" name="title" required maxLength={160} placeholder="An idea that came out of the above…"
										className="h-10 flex-1 min-w-[16rem] px-3.5 rounded-full border border-line bg-canvas text-sm text-ink outline-none focus:border-ink"
									/>
									<button type="submit" className={btn}>+ Add idea</button>
								</form>

								{typedCandidates.length ? (
									<div className="flex flex-col gap-3">
										{typedCandidates.map((c) => (
											<div key={c.id} className="p-4 rounded-[10px] border border-line bg-canvas">
												<div className="flex items-start justify-between gap-3">
													<InlineEdit
														value={c.title}
														field="title"
														id={c.id}
														endpoint="/api/idea-lab"
														className="text-sm font-medium"
														display={c.title}
													/>
													<form method="post" action={`/api/idea-lab/${c.id}/delete`} className="m-0 shrink-0">
														<button type="submit" className={deleteBtn} aria-label="Delete idea">×</button>
													</form>
												</div>

												<InlineEdit
													value={c.note ?? ''}
													field="note"
													id={c.id}
													endpoint="/api/idea-lab"
													kind="textarea"
													className={cx('block mt-1', cardValue)}
													placeholder="Why this one, in a line…"
												/>

												<div className="mt-2 flex items-center gap-2 flex-wrap">
													<InlineEdit
														value={c.decision}
														field="decision"
														id={c.id}
														endpoint="/api/idea-lab"
														kind="select"
														options={DECISION_OPTIONS}
														className="inline-block cursor-pointer"
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
						) : (
							<InlineEdit
								value={worksheet[step.field] ?? ''}
								field={step.field}
								id={worksheet.id}
								endpoint="/api/idea-lab/worksheet"
								kind="textarea"
								className={cx('block', cardValue)}
								placeholder="Write something…"
							/>
						)}
					</div>
				))}
			</div>
		</section>
	);
}
