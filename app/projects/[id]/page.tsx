import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import {
	HEADLINE_SIGNAL_TYPES, FUNDING_STAGE_LABELS, externalHref,
	type Project, type ProjectLog, type SignalType,
} from '@/lib/projects';
import { OPEN_POINT_STATUS_LABELS, type OpenPoint } from '@/lib/open-points';
import { InlineEdit } from '@/components/InlineEdit';
import { LogProgressPopup } from './LogProgressPopup';
import {
	btnDanger, btnGhost, cardLabel, cardValue, cx, table, tableWrap, td, th,
	FormError, Pill,
} from '@/components/ui';

const SIGNAL_LABELS: Record<SignalType, string> = {
	progress: 'Progress',
	customer_contact: 'conversations',
	interest_expressed: 'interested',
	paid: 'paid',
	rejected: 'rejected',
};

const STATUS_LABELS: Record<string, string> = {
	not_started: 'Not started',
	active: 'Active',
	done: 'Done',
};

const PROOF_STATUS_LABELS: Record<string, string> = {
	pending: 'Pending',
	verified: 'Verified',
	rejected: 'Rejected',
};

const PROOF_PILL_CLASS: Record<string, string> = {
	pending: 'bg-warn-bg text-warn',
	verified: 'bg-positive-bg text-positive',
	rejected: 'bg-negative-bg text-negative',
};

const TIMELINE_DOT_CLASS: Record<string, string> = {
	pending: 'bg-warn',
	verified: 'bg-positive',
	rejected: 'bg-negative',
};

const FUNDING_STAGE_OPTIONS: [string, string][] = [
	['', 'Pick stage'],
	...(Object.entries(FUNDING_STAGE_LABELS) as [string, string][]),
];

const back = 'inline-block mb-6 text-[13px] text-muted no-underline hover:text-ink';
const sectionTitle = 'm-0 mb-5 font-serif text-[22px] font-semibold';

export default async function ProjectDetailPage({
	params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { id } = await params;
	const { error } = await searchParams;

	const { data: project } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
	if (!project) redirect('/projects');

	const typed = project as Project;

	const [{ data: logs }, { data: openPoints }, originIdeaResult] = await Promise.all([
		supabase.from('project_logs').select('*').eq('project_id', id).order('created_at', { ascending: false }),
		supabase.from('open_points').select('*').eq('project_id', id).order('created_at', { ascending: true }),
		typed.business_idea_id
			? supabase.from('business_ideas').select('id, title').eq('id', typed.business_idea_id).maybeSingle()
			: Promise.resolve({ data: null }),
	]);

	const typedLogs = (logs ?? []) as ProjectLog[];
	const typedOpenPoints = (openPoints ?? []) as OpenPoint[];
	const originIdea = originIdeaResult.data as { id: string; title: string } | null;

	const doneCount = typedOpenPoints.filter((point) => point.status === 'closed').length;

	const signalCounts = typedLogs.reduce(
		(acc, log) => {
			acc[log.signal_type] = (acc[log.signal_type] ?? 0) + 1;
			return acc;
		},
		{} as Record<SignalType, number>,
	);
	const headlineSignalCount = HEADLINE_SIGNAL_TYPES.reduce((sum, type) => sum + (signalCounts[type] ?? 0), 0);

	const websiteHref = externalHref(typed.website_url);

	return (
		<section className="max-w-[860px]">
			<Link className={back} href="/projects">← Projects</Link>

			<div className="flex items-center gap-3.5 flex-wrap">
				<h1 className="m-0 font-serif text-[clamp(1.9rem,4vw,2.6rem)] font-semibold tracking-[-0.02em]">{typed.title}</h1>
				<Pill value={typed.status}>{STATUS_LABELS[typed.status]}</Pill>
			</div>

			{originIdea && (
				<Link
					className="inline-block mt-2.5 text-[13px] text-muted no-underline border-b border-dotted border-line hover:text-ink hover:border-ink"
					href={`/business-ideas/${originIdea.id}`}
				>from business idea: {originIdea.title}</Link>
			)}

			{typed.description && <p className="mt-3 mb-0 max-w-[60ch] text-muted leading-relaxed">{typed.description}</p>}

			{(typed.start_date || typed.target_end_date) && (
				<p className="mt-2.5 mb-0 text-sm text-muted tabular-nums">{typed.start_date ?? '—'} → {typed.target_end_date ?? '—'}</p>
			)}

			{error && <FormError>{error}</FormError>}

			<form method="post" action={`/api/projects/${typed.id}/status`} className="flex items-center gap-3 mt-8 flex-wrap">
				<label htmlFor="status" className="text-[13px] text-muted">Status</label>
				<select
					id="status"
					name="status"
					defaultValue={typed.status}
					className="h-10 px-3 font-sans text-sm bg-canvas border border-line rounded-full outline-none"
				>
					<option value="not_started">Not started</option>
					<option value="active">Active</option>
					<option value="done">Done</option>
				</select>
				<button type="submit" className={btnGhost}>Update status</button>
				<button type="submit" form="delete-project" className={btnDanger}>Delete project</button>
			</form>

			<form id="delete-project" method="post" action={`/api/projects/${typed.id}/delete`} />

			<div className="mt-10">
				<h2 className={sectionTitle}>Overview</h2>
				<InlineEdit
					value={typed.tagline ?? ''}
					field="tagline"
					id={typed.id}
					endpoint="/api/projects"
					placeholder="Add a one-line pitch…"
					className={cx(
						'block text-lg leading-relaxed py-2.5 px-3 -mx-3 rounded-[10px] transition-colors duration-150',
						typed.tagline ? 'text-ink' : 'text-muted',
					)}
				/>

				<div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 mt-2">
					<div className="min-w-0">
						<span className={cx(cardLabel, 'flex items-center justify-between gap-2')}>
							Website
							{websiteHref && (
								<a
									className="text-[11px] font-normal normal-case tracking-normal text-ink no-underline border-b border-line hover:border-ink"
									href={websiteHref}
									target="_blank"
									rel="noopener noreferrer"
								>Visit ↗</a>
							)}
						</span>
						<InlineEdit
							value={typed.website_url ?? ''}
							field="website_url"
							id={typed.id}
							endpoint="/api/projects"
							className={`block ${cardValue}`}
						/>
					</div>

					<div className="min-w-0">
						<span className={cardLabel}>Location</span>
						<InlineEdit value={typed.location ?? ''} field="location" id={typed.id} endpoint="/api/projects" className={`block ${cardValue}`} />
					</div>

					<div className="min-w-0">
						<span className={cardLabel}>Team size</span>
						<InlineEdit value={typed.team_size?.toString() ?? ''} field="team_size" id={typed.id} endpoint="/api/projects" kind="number" className={`block ${cardValue}`} />
					</div>

					<div className="min-w-0">
						<span className={cardLabel}>Industry</span>
						<InlineEdit value={typed.industry ?? ''} field="industry" id={typed.id} endpoint="/api/projects" className={`block ${cardValue}`} />
					</div>

					<div className="min-w-0">
						<span className={cardLabel}>Founded</span>
						<InlineEdit value={typed.founded_year?.toString() ?? ''} field="founded_year" id={typed.id} endpoint="/api/projects" kind="number" className={`block ${cardValue}`} />
					</div>

					<div className="min-w-0">
						<span className={cardLabel}>Stage</span>
						<div>
							<InlineEdit
								value={typed.funding_stage ?? ''}
								field="funding_stage"
								id={typed.id}
								endpoint="/api/projects"
								kind="select"
								options={FUNDING_STAGE_OPTIONS}
								className="inline-block cursor-pointer"
								display={
									typed.funding_stage
										? <Pill value={typed.funding_stage}>{FUNDING_STAGE_LABELS[typed.funding_stage]}</Pill>
										: <Pill value="">Pick stage</Pill>
								}
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-14">
				<div className="flex justify-between gap-3 flex-wrap items-start md:items-center">
					<h2 className={sectionTitle}>Open points</h2>
					<div className="flex items-center gap-3">
						{typedOpenPoints.length > 0 && (
							<span className="text-[13px] text-muted tabular-nums">{doneCount}/{typedOpenPoints.length} closed</span>
						)}
						<Link className={btnGhost} href="/opl">Open the OPL →</Link>
					</div>
				</div>

				{typedOpenPoints.length > 0 && (
					<div className="h-1.5 bg-canvas border border-line rounded-full overflow-hidden mb-5">
						<div className="h-full bg-ink" style={{ width: `${(doneCount / typedOpenPoints.length) * 100}%` }} />
					</div>
				)}

				<div className={tableWrap}>
					<table className={table}>
						<thead>
							<tr>
								<th className={th}>Status</th>
								<th className={th}>Item</th>
								<th className={th}>Contributors</th>
								<th className={th}>Added</th>
							</tr>
						</thead>
						<tbody>
							{typedOpenPoints.length ? (
								typedOpenPoints.map((point) => (
									<tr key={point.id}>
										<td className={td}>
											<Pill value={point.status}>{OPEN_POINT_STATUS_LABELS[point.status]}</Pill>
										</td>
										<td className={cx(td, point.status === 'closed' && 'text-muted line-through')}>
											{point.title || 'Untitled'}
										</td>
										<td className={cx(td, 'text-muted')}>{point.contributors || '—'}</td>
										<td className={cx(td, 'text-muted tabular-nums whitespace-nowrap')}>{new Date(point.created_at).toLocaleDateString()}</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan={4} className="py-7 px-4 text-muted">
										No open points linked to this project yet. Add one on the <Link href="/opl" className="text-ink">OPL</Link> and link it here.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="mt-14">
				<div className="flex justify-between gap-3 flex-wrap items-start md:items-center">
					<h2 className={sectionTitle}>Timeline</h2>
					<LogProgressPopup projectId={typed.id} />
				</div>

				<div className="flex items-center flex-wrap gap-2.5 mb-5">
					<span className="text-sm font-medium">{headlineSignalCount} validation signal{headlineSignalCount === 1 ? '' : 's'}</span>
					{(Object.keys(signalCounts) as SignalType[])
						.filter((type) => type !== 'progress' && signalCounts[type])
						.map((type) => (
							<span key={type} className="py-[3px] px-2.5 rounded-full bg-canvas border border-line text-xs text-muted">
								{signalCounts[type]} {SIGNAL_LABELS[type]}
							</span>
						))}
				</div>

				<div className="flex flex-col">
					{typedLogs.length ? (
						typedLogs.map((log) => (
							<div key={log.id} className="group/entry flex gap-[18px]">
								<div className="flex flex-col items-center shrink-0 w-3">
									<span className={cx('w-3 h-3 rounded-full border-2 border-paper mt-1.5 shadow-[0_0_0_1px_var(--color-line)]', TIMELINE_DOT_CLASS[log.status] ?? 'bg-muted')} />
									<span className="flex-1 w-px bg-line mt-1 group-last/entry:hidden" />
								</div>
								<div className="flex-1 pb-7">
									<div className="flex items-center justify-between gap-3">
										<span className="text-[13px] text-muted tabular-nums">{new Date(log.created_at).toLocaleString()}</span>
										<span className={cx('px-2.5 py-[3px] rounded-full text-[11px] font-medium', PROOF_PILL_CLASS[log.status])}>{PROOF_STATUS_LABELS[log.status]}</span>
									</div>
									<p className="mt-2 mb-0 text-[15px] leading-relaxed">{log.note}</p>
									{log.proof_type === 'link' && log.proof_url && (
										<a className="inline-block mt-2.5 text-sm text-ink no-underline border-b border-line hover:border-ink" href={log.proof_url} target="_blank" rel="noopener noreferrer">
											View proof link →
										</a>
									)}
									{log.proof_type === 'image' && log.proof_url && (
										/* eslint-disable-next-line @next/next/no-img-element */
										<img className="block mt-3 max-w-full rounded-[10px] border border-line" src={log.proof_url} alt="Proof" />
									)}
								</div>
							</div>
						))
					) : (
						<p className="m-0 text-left text-muted text-[15px]">No progress logged yet.</p>
					)}
				</div>
			</div>
		</section>
	);
}
