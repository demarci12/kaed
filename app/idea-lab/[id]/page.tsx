import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import {
	IDEA_DECISION_LABELS, IDEA_LAB_STEPS, type IdeaCandidate, type IdeaLabEvidence,
} from '@/lib/idea-lab';
import { InlineEdit } from '@/components/InlineEdit';
import {
	btn, btnGhost, chip, chipMuted, deleteBtn, Empty, FormError, Pill,
} from '@/components/ui';
import { NewEvidencePopup } from './NewEvidencePopup';
import { StepEditor } from './StepEditor';

const DECISION_OPTIONS = Object.entries(IDEA_DECISION_LABELS) as [string, string][];

export default async function IdeaLabDetailPage({
	params, searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ error?: string }>;
}) {
	const { supabase } = await requireOwner();
	const [{ id }, { error }] = await Promise.all([params, searchParams]);

	const { data: candidate } = await supabase.from('idea_candidates').select('*').eq('id', id).maybeSingle();
	if (!candidate) redirect('/idea-lab');
	const typed = candidate as IdeaCandidate;

	const { data: evidence } = await supabase
		.from('idea_lab_evidence')
		.select('*')
		.eq('idea_candidate_id', id)
		.order('created_at', { ascending: false });
	const typedEvidence = (evidence ?? []) as IdeaLabEvidence[];

	return (
		<section className="max-w-[760px]">
			<Link href="/idea-lab" className="inline-block mb-6 text-[13px] text-muted no-underline hover:text-ink">← Idea Lab</Link>

			<div className="flex items-start justify-between gap-3 flex-wrap">
				<InlineEdit
					value={typed.title}
					field="title"
					id={typed.id}
					endpoint="/api/idea-lab"
					className="font-serif text-[clamp(1.9rem,4vw,2.6rem)] font-semibold tracking-[-0.02em] leading-tight"
					display={typed.title}
				/>
				{typed.business_idea_id ? (
					<Link href={`/business-ideas/${typed.business_idea_id}`} className={chip}>→ View business idea</Link>
				) : (
					<form method="post" action={`/api/idea-lab/${typed.id}/convert`}>
						<button type="submit" className={btn}>Convert to business idea →</button>
					</form>
				)}
			</div>

			{error && <FormError>{error}</FormError>}

			<p className="mt-6 mb-0 text-sm text-muted">
				Work through the steps in order -- each builds on the one before it. Fields save as you go.
			</p>

			<div className="mt-10 flex flex-col gap-12">
				{IDEA_LAB_STEPS.map((step) => (
					<div key={step.n}>
						<div className="flex items-baseline gap-2.5">
							<span className="font-serif text-lg font-semibold text-muted tabular-nums">{step.n}.</span>
							<h2 className="m-0 font-serif text-lg font-semibold">{step.title}</h2>
						</div>
						<p className="mt-1.5 mb-4 text-sm text-muted leading-relaxed">{step.guidance}</p>

						{step.field === 'evidence' ? (
							<div className="flex flex-col gap-3">
								<div className="flex justify-end">
									<NewEvidencePopup candidateId={typed.id} />
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
									<Empty>No evidence logged yet.</Empty>
								)}
							</div>
						) : step.field === 'decision' ? (
							<InlineEdit
								value={typed.decision}
								field="decision"
								id={typed.id}
								endpoint="/api/idea-lab"
								kind="select"
								options={DECISION_OPTIONS}
								className="inline-block cursor-pointer"
								display={<Pill value={typed.decision}>{IDEA_DECISION_LABELS[typed.decision]}</Pill>}
							/>
						) : (
							<StepEditor
								candidateId={typed.id}
								step={step}
								initialRaw={typed[step.field as Exclude<typeof step.field, 'evidence' | 'decision'>] as string | null}
							/>
						)}
					</div>
				))}
			</div>

			<div className="mt-14 pt-6 border-t border-line flex justify-end">
				<form method="post" action={`/api/idea-lab/${typed.id}/delete`}>
					<button type="submit" className={btnGhost}>Delete candidate</button>
				</form>
			</div>
		</section>
	);
}
