import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { OPEN_POINT_STATUS_LABELS, type OpenPoint, type OpenPointNote } from '@/lib/open-points';
import type { Goal } from '@/lib/goals';
import type { Project } from '@/lib/projects';
import { InlineEdit } from '@/components/InlineEdit';
import {
	btn, card, cardDate, cardFoot, cardGrid, cardHead, cardLabel, cardTitle, cardValue,
	chip, chipMuted, deleteBtn, iconBtn, Empty, FormError, PageHead, Pill,
} from '@/components/ui';
import { NewNotePopup } from './[id]/NewNotePopup';

const STATUS_OPTIONS = Object.entries(OPEN_POINT_STATUS_LABELS) as [string, string][];

export default async function OplPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	// One round trip, not four -- see the Promise.all rule in CLAUDE.md.
	const [{ data: points }, { data: goals }, { data: projects }, { data: notes }] = await Promise.all([
		supabase.from('open_points').select('*').order('created_at', { ascending: false }),
		supabase.from('goals').select('id, title').order('rank', { ascending: true }),
		supabase.from('projects').select('id, title').order('title', { ascending: true }),
		// Newest first, so the first row seen per open_point_id below is
		// already the latest -- no separate per-point query needed.
		supabase.from('open_point_notes').select('*').order('created_at', { ascending: false }),
	]);

	const typedPoints = (points ?? []) as OpenPoint[];
	const typedGoals = (goals ?? []) as Pick<Goal, 'id' | 'title'>[];
	const typedProjects = (projects ?? []) as Pick<Project, 'id' | 'title'>[];
	const typedNotes = (notes ?? []) as OpenPointNote[];

	const goalById = new Map(typedGoals.map((g) => [g.id, g]));
	const projectById = new Map(typedProjects.map((p) => [p.id, p]));

	const latestNoteByPoint = new Map<string, OpenPointNote>();
	for (const note of typedNotes) {
		if (!latestNoteByPoint.has(note.open_point_id)) latestNoteByPoint.set(note.open_point_id, note);
	}

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
				lede="Every open item in one place: what needs doing, who's on it, where it stands, and which goal or project it belongs to. Click any field to edit it, or open one to see its full note history and how long it's spent in each status."
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
						const latestNote = latestNoteByPoint.get(point.id);
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
									<div className="flex items-center gap-1.5 shrink-0">
										<Link href={`/opl/${point.id}`} className={iconBtn} aria-label={`Open ${point.title || 'item'}`} title="Open">↗</Link>
										<form method="post" action={`/api/open-points/${point.id}/delete`} className="m-0 shrink-0">
											<button type="submit" className={deleteBtn} aria-label="Delete item">×</button>
										</form>
									</div>
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

									{point.status !== 'closed' && (
										<form method="post" action={`/api/open-points/${point.id}/close`} className="m-0 ml-auto">
											<button type="submit" className={chip}>✓ Done</button>
										</form>
									)}
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

								<div className="min-w-0">
									<div className="flex items-center justify-between gap-2">
										<span className={cardLabel}>Latest note</span>
										<NewNotePopup pointId={point.id} />
									</div>
									{latestNote ? (
										<Link href={`/opl/${point.id}`} className={`block ${cardValue} no-underline hover:bg-canvas`}>
											<span className="block text-xs text-muted tabular-nums mb-1">
												{new Date(latestNote.created_at).toLocaleString()}
											</span>
											{latestNote.note}
										</Link>
									) : (
										<Link href={`/opl/${point.id}`} className={`block ${cardValue} no-underline`}>
											<span className="text-muted">No notes yet.</span>
										</Link>
									)}
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
