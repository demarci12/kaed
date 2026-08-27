import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import {
	ACTOR_KIND_LABELS, REQUIREMENT_KIND_LABELS, REQUIREMENT_PRIORITY_LABELS,
	type SystemActor, type SystemGoal, type SystemUseCase, type SystemRequirement,
} from '@/lib/system-design';
import type { Project } from '@/lib/projects';
import { InlineEdit } from '@/components/InlineEdit';
import { NewActorPopup, NewGoalPopup, NewRequirementPopup, NewUseCasePopup } from './Popups';
import {
	card, cardGrid, cardHead, cardLabel, cardTitle, cardValue, chip, chipMuted, cx,
	deleteBtn, Empty, FormError, PageHead, Pill,
} from '@/components/ui';

const section = 'mt-10 first-of-type:mt-8';
const sectionHead = 'flex items-center justify-between gap-3 mb-4';
const sectionTitle = 'm-0 font-serif text-xl font-semibold tracking-[-0.01em]';

export default async function SystemDesignDetailPage({
	params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { id: projectId } = await params;
	const { error } = await searchParams;

	const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
	if (!project) redirect('/system-design?error=Project not found.');

	const typedProject = project as Project;

	const [{ data: actors }, { data: goals }, { data: useCases }, { data: requirements }] = await Promise.all([
		supabase.from('system_actors').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
		supabase.from('system_goals').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
		supabase.from('system_use_cases').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
		supabase.from('system_requirements').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
	]);

	const typedActors = (actors ?? []) as SystemActor[];
	const typedGoals = (goals ?? []) as SystemGoal[];
	const typedUseCases = (useCases ?? []) as SystemUseCase[];
	const typedRequirements = (requirements ?? []) as SystemRequirement[];

	const actorById = new Map(typedActors.map((actor) => [actor.id, actor]));
	const useCaseById = new Map(typedUseCases.map((useCase) => [useCase.id, useCase]));

	const actorKindOptions = Object.entries(ACTOR_KIND_LABELS) as [string, string][];
	const requirementKindOptions = Object.entries(REQUIREMENT_KIND_LABELS) as [string, string][];
	const requirementPriorityOptions = Object.entries(REQUIREMENT_PRIORITY_LABELS) as [string, string][];
	const actorSelectOptions: [string, string][] = [
		['', 'No actor'],
		...typedActors.map((actor) => [actor.id, actor.name] as [string, string]),
	];
	const useCaseSelectOptions: [string, string][] = [
		['', 'No use case'],
		...typedUseCases.map((useCase) => [useCase.id, useCase.title] as [string, string]),
	];

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Delivery · System design"
				title={`${typedProject.title}.`}
				lede="Actors perform use cases. Use cases satisfy system goals. Requirements trace back to a use case where they can."
			/>
			<Link className="inline-block mt-2 text-[13px] text-muted no-underline hover:text-ink" href="/system-design">← System design</Link>

			{error && <FormError>{error}</FormError>}

			<div className={section}>
				<div className={sectionHead}>
					<h2 className={sectionTitle}>System goals</h2>
					<NewGoalPopup projectId={projectId} />
				</div>
				<div className={cardGrid}>
					{typedGoals.length ? (
						typedGoals.map((goal) => (
							<article key={goal.id} className={card}>
								<div className={cardHead}>
									<InlineEdit value={goal.title} field="title" id={goal.id} endpoint="/api/system-design/goals" className={cardTitle} />
									<form className="shrink-0" method="post" action={`/api/system-design/goals/${goal.id}/delete`}>
										<button type="submit" className={deleteBtn} aria-label="Delete goal">×</button>
									</form>
								</div>
								<InlineEdit value={goal.description ?? ''} field="description" id={goal.id} endpoint="/api/system-design/goals" kind="textarea" className={`block ${cardValue}`} />
							</article>
						))
					) : (
						<Empty>No system goals yet.</Empty>
					)}
				</div>
			</div>

			<div className={section}>
				<div className={sectionHead}>
					<h2 className={sectionTitle}>Actors</h2>
					<NewActorPopup projectId={projectId} />
				</div>
				<div className={cardGrid}>
					{typedActors.length ? (
						typedActors.map((actor) => (
							<article key={actor.id} className={card}>
								<div className={cardHead}>
									<InlineEdit value={actor.name} field="name" id={actor.id} endpoint="/api/system-design/actors" className={cardTitle} />
									<form className="shrink-0" method="post" action={`/api/system-design/actors/${actor.id}/delete`}>
										<button type="submit" className={deleteBtn} aria-label="Delete actor">×</button>
									</form>
								</div>
								<div>
									<InlineEdit
										value={actor.kind}
										field="kind"
										id={actor.id}
										endpoint="/api/system-design/actors"
										kind="select"
										options={actorKindOptions}
										className="inline-block cursor-pointer"
										display={<Pill value={actor.kind}>{ACTOR_KIND_LABELS[actor.kind]}</Pill>}
									/>
								</div>
								<InlineEdit value={actor.description ?? ''} field="description" id={actor.id} endpoint="/api/system-design/actors" kind="textarea" className={`block ${cardValue}`} />
							</article>
						))
					) : (
						<Empty>No actors yet.</Empty>
					)}
				</div>
			</div>

			<div className={section}>
				<div className={sectionHead}>
					<h2 className={sectionTitle}>Use cases</h2>
					<NewUseCasePopup projectId={projectId} actors={typedActors.map((a) => ({ id: a.id, name: a.name }))} />
				</div>
				<div className={cardGrid}>
					{typedUseCases.length ? (
						typedUseCases.map((useCase) => (
							<article key={useCase.id} className={card}>
								<div className={cardHead}>
									<InlineEdit value={useCase.title} field="title" id={useCase.id} endpoint="/api/system-design/use-cases" className={cardTitle} />
									<form className="shrink-0" method="post" action={`/api/system-design/use-cases/${useCase.id}/delete`}>
										<button type="submit" className={deleteBtn} aria-label="Delete use case">×</button>
									</form>
								</div>
								<div>
									<InlineEdit
										value={useCase.actor_id ?? ''}
										field="actor_id"
										id={useCase.id}
										endpoint="/api/system-design/use-cases"
										kind="select"
										options={actorSelectOptions}
										className="inline-block cursor-pointer"
										display={
											useCase.actor_id && actorById.has(useCase.actor_id)
												? <span className={chip}>{actorById.get(useCase.actor_id)!.name}</span>
												: <span className={chipMuted}>No actor</span>
										}
									/>
								</div>
								{([
									['Description', 'description', useCase.description],
									['Preconditions', 'preconditions', useCase.preconditions],
									['Main flow', 'main_flow', useCase.main_flow],
									['Postconditions', 'postconditions', useCase.postconditions],
								] as [string, string, string | null][]).map(([text, field, value]) => (
									<div key={field} className="min-w-0">
										<span className={cardLabel}>{text}</span>
										<InlineEdit value={value ?? ''} field={field} id={useCase.id} endpoint="/api/system-design/use-cases" kind="textarea" className={`block ${cardValue}`} />
									</div>
								))}
							</article>
						))
					) : (
						<Empty>No use cases yet.</Empty>
					)}
				</div>
			</div>

			<div className={section}>
				<div className={sectionHead}>
					<h2 className={sectionTitle}>Requirements</h2>
					<NewRequirementPopup projectId={projectId} useCases={typedUseCases.map((u) => ({ id: u.id, name: u.title }))} />
				</div>
				<div className={cardGrid}>
					{typedRequirements.length ? (
						typedRequirements.map((requirement) => (
							<article key={requirement.id} className={card}>
								<div className={cardHead}>
									<InlineEdit value={requirement.title} field="title" id={requirement.id} endpoint="/api/system-design/requirements" className={cardTitle} />
									<form className="shrink-0" method="post" action={`/api/system-design/requirements/${requirement.id}/delete`}>
										<button type="submit" className={deleteBtn} aria-label="Delete requirement">×</button>
									</form>
								</div>
								<div className="flex gap-2 flex-wrap">
									<InlineEdit
										value={requirement.kind}
										field="kind"
										id={requirement.id}
										endpoint="/api/system-design/requirements"
										kind="select"
										options={requirementKindOptions}
										className="inline-block cursor-pointer"
										display={<Pill value={requirement.kind}>{REQUIREMENT_KIND_LABELS[requirement.kind]}</Pill>}
									/>
									<InlineEdit
										value={requirement.priority}
										field="priority"
										id={requirement.id}
										endpoint="/api/system-design/requirements"
										kind="select"
										options={requirementPriorityOptions}
										className="inline-block cursor-pointer"
										display={<Pill value={requirement.priority}>{REQUIREMENT_PRIORITY_LABELS[requirement.priority]}</Pill>}
									/>
								</div>
								<div>
									<InlineEdit
										value={requirement.use_case_id ?? ''}
										field="use_case_id"
										id={requirement.id}
										endpoint="/api/system-design/requirements"
										kind="select"
										options={useCaseSelectOptions}
										className="inline-block cursor-pointer"
										display={
											requirement.use_case_id && useCaseById.has(requirement.use_case_id)
												? <span className={chip}>{useCaseById.get(requirement.use_case_id)!.title}</span>
												: <span className={chipMuted}>No use case</span>
										}
									/>
								</div>
								<InlineEdit value={requirement.description ?? ''} field="description" id={requirement.id} endpoint="/api/system-design/requirements" kind="textarea" className={cx('block', cardValue)} />
							</article>
						))
					) : (
						<Empty>No requirements yet.</Empty>
					)}
				</div>
			</div>
		</section>
	);
}
