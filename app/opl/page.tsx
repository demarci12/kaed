import { requireOwner } from '@/lib/auth';
import { OPEN_POINT_STATUS_LABELS, type OpenPoint } from '@/lib/open-points';
import type { Goal } from '@/lib/goals';
import type { Project } from '@/lib/projects';
import { InlineEdit } from '@/components/InlineEdit';
import {
	btn, card, cardDate, cardFoot, cardGrid, cardHead, cardLabel, cardTitle, cardValue,
	chip, chipMuted, deleteBtn, Empty, FormError, PageHead, Pill,
} from '@/components/ui';

const STATUS_OPTIONS = Object.entries(OPEN_POINT_STATUS_LABELS) as [string, string][];

export default async function OplPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	// One round trip, not three -- see the Promise.all rule in CLAUDE.md.
	const [{ data: points }, { data: goals }, { data: projects }] = await Promise.all([
		supabase.from('open_points').select('*').order('created_at', { ascending: false }),
		supabase.from('goals').select('id, title').order('rank', { ascending: true }),
		supabase.from('projects').select('id, title').order('title', { ascending: true }),
	]);

	const typedPoints = (points ?? []) as OpenPoint[];
	const typedGoals = (goals ?? []) as Pick<Goal, 'id' | 'title'>[];
	const typedProjects = (projects ?? []) as Pick<Project, 'id' | 'title'>[];

	const goalById = new Map(typedGoals.map((g) => [g.id, g]));
	const projectById = new Map(typedProjects.map((p) => [p.id, p]));

	/**
	 * One dropdown covers both parent kinds. Values are prefixed so a single
	 * select can express "goal G", "project P", or "unlinked" -- the endpoint
	 * splits the prefix back out and enforces the single-parent rule.
	 */
	const linkOptions: [string, string][] = [
		['', 'No link'],
		...typedGoals.map((g) => [`g_${g.id}`, `Goal · ${g.title}`] as [string, string]),
		...typedProjects.map((p) => [`p_${p.id}`, `Project · ${p.title}`] as [string, string]),
	];

	const linkValue = (point: OpenPoint) =>
		point.goal_id ? `g_${point.goal_id}` : point.project_id ? `p_${point.project_id}` : '';

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Delivery"
				title="OPL: Open Point List."
				lede="Every open item in one place: what needs doing, who's on it, where it stands, and which goal or project it belongs to. Click any field to edit it."
				actions={
					<form method="post" action="/api/open-points/create-inline" className="m-0 shrink-0 w-full md:w-auto">
						<button type="submit" className={`${btn} w-full md:w-auto`}>+ New item</button>
					</form>
				}
			/>

			{error && <FormError>{error}</FormError>}

			<div className={cardGrid}>
				{typedPoints.length ? (
					typedPoints.map((point) => {
						const goal = point.goal_id ? goalById.get(point.goal_id) : undefined;
						const project = point.project_id ? projectById.get(point.project_id) : undefined;
						return (
							<article key={point.id} className={card}>
								<div className={cardHead}>
									<InlineEdit
										value={point.title}
										field="title"
										id={point.id}
										endpoint="/api/open-points"
										className={cardTitle}
										display={point.title || 'Untitled'}
									/>
									<form method="post" action={`/api/open-points/${point.id}/delete`} className="m-0 shrink-0">
										<button type="submit" className={deleteBtn} aria-label="Delete item">×</button>
									</form>
								</div>

								<div className="flex gap-2 flex-wrap items-center">
									<InlineEdit
										value={point.status}
										field="status"
										id={point.id}
										endpoint="/api/open-points"
										kind="select"
										options={STATUS_OPTIONS}
										className="cursor-pointer"
										display={<Pill value={point.status}>{OPEN_POINT_STATUS_LABELS[point.status]}</Pill>}
									/>

									<InlineEdit
										value={linkValue(point)}
										field="link"
										id={point.id}
										endpoint="/api/open-points"
										kind="select"
										options={linkOptions}
										className="cursor-pointer"
										display={
											goal ? (
												<span className={chip}>Goal · {goal.title}</span>
											) : project ? (
												<span className={chip}>Project · {project.title}</span>
											) : (
												<span className={chipMuted}>No link</span>
											)
										}
									/>
								</div>

								<div className="min-w-0">
									<span className={cardLabel}>Description</span>
									<InlineEdit
										value={point.body ?? ''}
										field="body"
										id={point.id}
										endpoint="/api/open-points"
										kind="textarea"
										className={`block ${cardValue}`}
										placeholder="Write something…"
									/>
								</div>

								<div className="min-w-0">
									<span className={cardLabel}>Contributors</span>
									<InlineEdit
										value={point.contributors ?? ''}
										field="contributors"
										id={point.id}
										endpoint="/api/open-points"
										className={`block ${cardValue}`}
										placeholder="Unassigned."
									/>
								</div>

								<div className={`${cardFoot} justify-end`}>
									<span className={cardDate}>{new Date(point.created_at).toLocaleDateString()}</span>
								</div>
							</article>
						);
					})
				) : (
					<Empty>Nothing here yet. Click &quot;+ New item&quot; to log your first open point.</Empty>
				)}
			</div>
		</section>
	);
}
