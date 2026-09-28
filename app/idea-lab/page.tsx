import { requireOwner } from '@/lib/auth';
import { getOrCreateWorksheet } from '@/lib/idea-lab-worksheet';
import {
	IDEA_LAB_PHASE_LABELS, IDEA_LAB_STEPS,
	type IdeaCandidate, type IdeaLabEvidence, type IdeaLabStep,
} from '@/lib/idea-lab';
import { cx, FormError, PageHead } from '@/components/ui';
import { StepBody } from './StepBody';
import { PlaybookSection, type PlaybookRow } from './PlaybookSection';

/**
 * The Idea Lab is one page: the playbook (reference text, every section an
 * editable text input) followed by the 11-step worksheet -- the working
 * surface where you actually run the process. Steps 1-5 gather the raw
 * material, Step 6 is where the ideas surface, Steps 7-11 sharpen them.
 * There are no views or sub-pages; the two halves share one scroll.
 */
export default async function IdeaLabPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase, user } = await requireOwner();
	const [{ error }, worksheet, { data: rows }] = await Promise.all([
		searchParams,
		getOrCreateWorksheet(supabase, user.id),
		supabase.from('idea_lab_playbook').select('id, title, body').order('position', { ascending: true }),
	]);
	const sections = (rows ?? []) as PlaybookRow[];

	if (!worksheet) {
		return (
			<section className="max-w-[860px]">
				<PageHead eyebrow="Personal" title="Idea Lab." lede="How to find pain points and successful business opportunities." />
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

	return (
		<section className="max-w-[860px]">
			<PageHead
				eyebrow="Personal"
				title="Idea Lab."
				lede="How to find pain points and successful business opportunities — the playbook first, then the 11-step worksheet where you run it. Everything on the page is editable and saves when you leave a box."
			/>

			{error && <FormError>{error}</FormError>}

			{/* Jump row: a filled marker means that worksheet step has something in it. */}
			<div className="mt-6 flex gap-1.5 flex-wrap items-center">
				<a href="#playbook" className="text-[13px] text-muted no-underline hover:text-ink mr-2">Playbook</a>
				<a href="#worksheet" className="text-[13px] text-muted no-underline hover:text-ink mr-2">Worksheet</a>
				{IDEA_LAB_STEPS.map((step) => (
					<a
						key={step.n}
						href={`#step-${step.n}`}
						title={`${step.n}. ${step.title}`}
						className={cx(
							'font-mono text-[11px] border rounded-full px-2.5 py-[3px] no-underline',
							done(step) ? 'bg-ink text-paper border-ink' : 'bg-paper text-muted border-line hover:border-ink hover:text-ink',
						)}
					>
						{step.n}
					</a>
				))}
				<span className="ml-1 text-xs text-muted tabular-nums">{doneCount}/{IDEA_LAB_STEPS.length} steps started</span>
			</div>

			<div id="playbook" className="mt-10 flex flex-col gap-10 scroll-mt-6">
				{sections.length
					? sections.map((row, i) => <PlaybookSection key={row.id} row={row} index={i} />)
					: <p className="text-sm text-muted">No playbook text yet.</p>}
			</div>

			<div id="worksheet" className="mt-16 pt-10 border-t border-line scroll-mt-6">
				<h2 className="mt-0 mb-2 font-serif text-2xl font-semibold tracking-[-0.01em]">The 11-step worksheet</h2>
				<p className="mt-0 mb-10 text-sm text-muted leading-relaxed">
					The process, run for real. Steps 1-5 gather the raw material, Step 6 is where the ideas surface, Steps 7-11 sharpen them.
				</p>
				<div className="flex flex-col gap-12">
					{IDEA_LAB_STEPS.map((step, i) => (
						<div key={step.n} id={`step-${step.n}`} className="scroll-mt-6">
							{(i === 0 || IDEA_LAB_STEPS[i - 1].phase !== step.phase) && (
								<p className="mt-0 mb-5 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted">
									{IDEA_LAB_PHASE_LABELS[step.phase]}
								</p>
							)}
							<div className="flex items-baseline gap-2.5">
								<span className="font-serif text-lg font-semibold text-muted tabular-nums">{step.n}.</span>
								<h3 className="m-0 font-serif text-lg font-semibold">{step.title}</h3>
							</div>
							<p className="mt-1.5 mb-4 text-sm text-muted leading-relaxed">{step.guidance}</p>
							<StepBody step={step} worksheet={worksheet} evidence={typedEvidence} candidates={typedCandidates} />
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
