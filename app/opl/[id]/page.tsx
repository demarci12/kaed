import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import {
	OPEN_POINT_STATUS_LABELS,
	buildStatusTimeline,
	formatDuration,
	type OpenPoint,
	type OpenPointNote,
	type OpenPointStatusEvent,
} from '@/lib/open-points';
import type { Goal } from '@/lib/goals';
import type { Project } from '@/lib/projects';
import { InlineEdit } from '@/components/InlineEdit';
import { btn, btnGhost, cardLabel, cardValue, chip, chipMuted, cx, Empty, FormError, Pill } from '@/components/ui';
import { NewNotePopup } from './NewNotePopup';

const STATUS_OPTIONS = Object.entries(OPEN_POINT_STATUS_LABELS) as [string, string][];

export default async function OpenPointDetailPage({
	params, searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ error?: string }>;
}) {
	const { supabase } = await requireOwner();
	const [{ id }, { error }] = await Promise.all([params, searchParams]);

	const { data: point } = await supabase.from('open_points').select('*').eq('id', id).maybeSingle();
	if (!point) redirect('/opl');
	const typed = point as OpenPoint;

	// One round trip, not four -- see the Promise.all rule in CLAUDE.md.
	const [{ data: notes }, { data: events }, { data: goals }, { data: projects }] = await Promise.all([
		supabase.from('open_point_notes').select('*').eq('open_point_id', id).order('created_at', { ascending: false }),
		supabase.from('open_point_status_events').select('*').eq('open_point_id', id),
		supabase.from('goals').select('id, title').order('rank', { ascending: true }),
		supabase.from('projects').select('id, title').order('title', { ascending: true }),
	]);

	const typedNotes = (notes ?? []) as OpenPointNote[];
	const typedEvents = (events ?? []) as OpenPointStatusEvent[];
	const typedGoals = (goals ?? []) as Pick<Goal, 'id' | 'title'>[];
	const typedProjects = (projects ?? []) as Pick<Project, 'id' | 'title'>[];

	const goal = typed.goal_id ? typedGoals.find((g) => g.id === typed.goal_id) : undefined;
	const project = typed.project_id ? typedProjects.find((p) => p.id === typed.project_id) : undefined;

	const linkOptions: [string, string][] = [
		['', 'No link'],
		...typedGoals.map((g) => [`g_${g.id}`, `Goal · ${g.title}`] as [string, string]),
		...typedProjects.map((p) => [`p_${p.id}`, `Project · ${p.title}`] as [string, string]),
	];
	const linkValue = typed.goal_id ? `g_${typed.goal_id}` : typed.project_id ? `p_${typed.project_id}` : '';

	// Oldest first: a timeline reads top-to-bottom as "what happened, in order" --
	// reversing it to match the notes feed (newest first) would make the two
	// lists on the same page scroll in opposite directions.
	const timeline = buildStatusTimeline(typedEvents).sort((a, b) => a.from.localeCompare(b.from));

	return (
		<section className="max-w-[720px]">
			<Link href="/opl" className="inline-block mb-6 text-[13px] text-muted no-underline hover:text-ink">← OPL</Link>

			<div className="flex items-start justify-between gap-3 flex-wrap">
				<InlineEdit
					value={typed.title}
					field="title"
					id={typed.id}
					endpoint="/api/open-points"
					className="font-serif text-[clamp(1.9rem,4vw,2.6rem)] font-semibold tracking-[-0.02em] leading-tight"
					display={typed.title || 'Untitled'}
				/>
				<div className="flex items-center gap-2 shrink-0">
					{typed.status !== 'closed' && (
						<form method="post" action={`/api/open-points/${typed.id}/close`}>
							<button type="submit" className={btn}>✓ Mark done</button>
						</form>
					)}
					{typed.archived_at ? (
						<form method="post" action={`/api/open-points/${typed.id}/restore`}>
							<button type="submit" className={btnGhost}>↺ Restore</button>
						</form>
					) : (
						<form method="post" action={`/api/open-points/${typed.id}/archive`}>
							<button type="submit" className={btnGhost}>🗄 Archive</button>
						</form>
					)}
				</div>
			</div>

			{typed.archived_at && (
				<p className="mt-3 mb-0 text-sm text-muted">
					Archived {new Date(typed.archived_at).toLocaleString()}.
				</p>
			)}

			{error && <FormError>{error}</FormError>}

			<div className="flex gap-2 flex-wrap items-center mt-4">
				<InlineEdit
					value={typed.status}
					field="status"
					id={typed.id}
					endpoint="/api/open-points"
					kind="select"
					options={STATUS_OPTIONS}
					className="cursor-pointer"
					display={<Pill value={typed.status}>{OPEN_POINT_STATUS_LABELS[typed.status]}</Pill>}
				/>
				<InlineEdit
					value={linkValue}
					field="link"
					id={typed.id}
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

			<div className="mt-6 min-w-0">
				<span className={cardLabel}>Description</span>
				<InlineEdit
					value={typed.body ?? ''}
					field="body"
					id={typed.id}
					endpoint="/api/open-points"
					kind="textarea"
					className={cx('block', cardValue)}
					placeholder="Write something…"
				/>
			</div>

			<div className="mt-5 min-w-0">
				<span className={cardLabel}>Contributors</span>
				<InlineEdit
					value={typed.contributors ?? ''}
					field="contributors"
					id={typed.id}
					endpoint="/api/open-points"
					className={cx('block', cardValue)}
					placeholder="Unassigned."
				/>
			</div>

			<div className="mt-14">
				<h2 className="m-0 mb-5 font-serif text-[22px] font-semibold">Status timeline</h2>
				<p className="mt-0 mb-5 text-sm text-muted">How long this actually spent in each stage, not just where it is now.</p>
				<div className="flex flex-col">
					{timeline.map((phase, i) => (
						<div key={phase.from} className="flex gap-3 md:gap-[18px]">
							<div className="flex flex-col items-center shrink-0 w-3">
								<span className="w-3 h-3 rounded-full bg-ink border-2 border-paper shadow-[0_0_0_1px_var(--color-line)] mt-1.5" />
								{i < timeline.length - 1 && <span className="flex-1 w-px bg-line mt-1" />}
							</div>
							<div className="flex-1 pb-7">
								<div className="flex items-center gap-2 flex-wrap">
									<Pill value={phase.status}>{OPEN_POINT_STATUS_LABELS[phase.status]}</Pill>
									<span className="text-[13px] text-muted tabular-nums">
										{new Date(phase.from).toLocaleString()}
										{phase.to && ` → ${new Date(phase.to).toLocaleString()}`}
									</span>
								</div>
								<p className="mt-1.5 mb-0 text-sm text-muted">
									{phase.to ? formatDuration(phase.durationMs) : `${formatDuration(phase.durationMs)} so far`}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>

			<div className="mt-14">
				<div className="flex items-center justify-between gap-3 flex-wrap mb-5">
					<h2 className="m-0 font-serif text-[22px] font-semibold">Notes</h2>
					<NewNotePopup pointId={typed.id} />
				</div>

				<div className="flex flex-col">
					{typedNotes.length ? (
						typedNotes.map((note, i) => (
							<div key={note.id} className="group flex gap-3 md:gap-[18px]">
								<div className="flex flex-col items-center shrink-0 w-3">
									<span className="w-3 h-3 rounded-full bg-ink border-2 border-paper shadow-[0_0_0_1px_var(--color-line)] mt-1.5" />
									{i < typedNotes.length - 1 && <span className="flex-1 w-px bg-line mt-1" />}
								</div>
								<div className="flex-1 pb-7">
									<span className="text-[13px] text-muted tabular-nums">{new Date(note.created_at).toLocaleString()}</span>
									<p className="mt-2 mb-0 text-[15px] leading-relaxed whitespace-pre-wrap">{note.note}</p>
								</div>
							</div>
						))
					) : (
						<Empty>No notes yet.</Empty>
					)}
				</div>
			</div>
		</section>
	);
}
