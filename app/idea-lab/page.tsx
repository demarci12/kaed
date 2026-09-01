import { requireOwner } from '@/lib/auth';
import { getOrCreateWorksheet } from '@/lib/idea-lab-worksheet';
import {
	IDEA_LAB_PHASE_LABELS, IDEA_LAB_STEPS,
	type IdeaCandidate, type IdeaLabEvidence, type IdeaLabStep,
} from '@/lib/idea-lab';
import { btn, btnGhost, cx, FormError, PageHead } from '@/components/ui';
import { StepBody } from './StepBody';

/**
 * The Idea Lab *is* the process. There is no candidate list standing in front
 * of it and no "pick an idea first" gate: the 11 steps are how you find an
 * idea, so they have to be the first thing on the page. Ideas appear at Step
 * 6, out of the work done in Steps 1-5.
 *
 * Default view is the guided walkthrough -- one step at a time, with the
 * position remembered on the worksheet so you resume where you stopped rather
 * than re-finding your place in a wall of eleven boxes. `?view=all` is the
 * escape hatch for when you want to read or edit across the whole thing.
 */
export default async function IdeaLabPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string; view?: string }>;
}) {
	const { supabase, user } = await requireOwner();
	const [{ error, view }, worksheet] = await Promise.all([
		searchParams,
		getOrCreateWorksheet(supabase, user.id),
	]);

	if (!worksheet) {
		return (
			<section className="max-w-[760px]">
				<PageHead eyebrow="Personal" title="Idea Lab." lede="The 11-step process for finding a startup idea worth building." />
				<FormError>Could not open your worksheet. Reload to try again.</FormError>
			</section>
		);
	}

	const [{ data: evidence }, { data: candidates }] = await Promise.all([
		supabase.from('idea_lab_evidence').select('*').eq('idea_lab_id', worksheet.id).order('created_at', { ascending: false }),
		supabase.from('idea_candidates').select('*').eq('idea_lab_id', worksheet.id).order('rank', { ascending: true }),
	]);

	const typedEvidence = (evidence ?? []) as IdeaLabEvidence[];
	const typedCandidates = (candidates ?? []) as IdeaCandidate[];

	const done = (step: IdeaLabStep) => {
		if (step.field === 'evidence') return typedEvidence.length > 0;
		if (step.field === 'candidates') return typedCandidates.length > 0;
		return Boolean(worksheet[step.field]);
	};

	const doneCount = IDEA_LAB_STEPS.filter(done).length;
	const guided = view !== 'all';

	// Clamp rather than trust: current_step is a plain column, and a stale
	// value (or a shortened step list) shouldn't render an empty page.
	const currentN = Math.min(Math.max(worksheet.current_step ?? 1, 1), IDEA_LAB_STEPS.length);
	const current = IDEA_LAB_STEPS[currentN - 1];
	const prev = IDEA_LAB_STEPS[currentN - 2];
	const next = IDEA_LAB_STEPS[currentN];

	const body = (step: IdeaLabStep) => (
		<StepBody step={step} worksheet={worksheet} evidence={typedEvidence} candidates={typedCandidates} />
	);

	/** Jump straight to a step. A form, not a link, because it persists position. */
	const goTo = (n: number, children: React.ReactNode, className: string, title?: string) => (
		<form method="post" action="/api/idea-lab/step" className="m-0 inline">
			<input type="hidden" name="step" value={n} />
			<button type="submit" className={className} title={title}>{children}</button>
		</form>
	);

	return (
		<section className="max-w-[760px]">
			<PageHead
				eyebrow="Personal"
				title="Idea Lab."
				lede={
					guided
						? 'Eleven steps for finding a startup idea worth building. Work one at a time — the lab remembers where you are. Steps 1-5 gather the raw material, Step 6 is where the ideas surface, Steps 7-11 sharpen them.'
						: 'All eleven steps at once. Steps 1-5 gather the raw material, Step 6 is where the ideas surface, Steps 7-11 sharpen them.'
				}
			/>

			{error && <FormError>{error}</FormError>}

			{/* Progress: a filled marker means that step has something in it. In
			    guided mode the current step is ringed so "where am I" and "what
			    have I done" are answered by the same row of dots. */}
			<div className="mt-6 flex gap-1.5 flex-wrap items-center">
				{IDEA_LAB_STEPS.map((step) =>
					goTo(
						step.n,
						step.n,
						cx(
							'font-mono text-[11px] border rounded-full px-2.5 py-[3px] cursor-pointer',
							done(step) ? 'bg-ink text-paper border-ink' : 'bg-paper text-muted border-line hover:border-ink hover:text-ink',
							guided && step.n === currentN && 'ring-2 ring-offset-2 ring-ink',
						),
						`${step.n}. ${step.title}`,
					),
				)}
				<span className="ml-1 text-xs text-muted tabular-nums">{doneCount}/{IDEA_LAB_STEPS.length} done</span>
				<a href={guided ? '/idea-lab?view=all' : '/idea-lab'} className="ml-auto text-[13px] text-muted no-underline hover:text-ink">
					{guided ? 'See all 11 steps →' : '← Back to guided'}
				</a>
			</div>

			{guided ? (
				<div className="mt-10">
					<p className="mt-0 mb-1 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted">
						{IDEA_LAB_PHASE_LABELS[current.phase]} · Step {current.n} of {IDEA_LAB_STEPS.length}
					</p>
					<h2 className="mt-0 mb-2 font-serif text-[clamp(1.4rem,3vw,1.9rem)] font-semibold tracking-[-0.01em] leading-tight">
						{current.title}
					</h2>
					<p className="mt-0 mb-6 text-sm text-muted leading-relaxed">{current.guidance}</p>

					{body(current)}

					{/* Next is never blocked on writing something -- a step you have
					    nothing for yet is information, not a wall to be stuck behind.
					    The hint says so without stopping you. */}
					<div className="mt-10 pt-6 border-t border-line flex items-center gap-3 flex-wrap">
						{prev
							? goTo(prev.n, `← ${prev.n}. ${prev.title}`, cx(btnGhost, 'max-w-full truncate'))
							: <span />}
						{next ? (
							<div className="ml-auto flex items-center gap-3">
								{!done(current) && <span className="text-xs text-muted">Nothing here yet — you can come back.</span>}
								{goTo(next.n, `Next: ${next.n}. ${next.title} →`, cx(btn, 'max-w-full truncate'))}
							</div>
						) : (
							<span className="ml-auto text-sm text-muted">
								Last step. Set each idea&rsquo;s verdict at {goTo(6, 'Step 6', 'underline cursor-pointer')} and convert the winners.
							</span>
						)}
					</div>
				</div>
			) : (
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
							{body(step)}
						</div>
					))}
				</div>
			)}
		</section>
	);
}
