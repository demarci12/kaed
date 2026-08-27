import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { HEADLINE_SIGNAL_TYPES } from '@/lib/projects';
import type { BusinessIdea } from '@/lib/business-ideas';
import { btn, btnDanger, btnGhost, cx, FormError } from '@/components/ui';

const fieldLabel = 'text-xs font-semibold tracking-[0.06em] uppercase text-muted';
const fieldBox =
	'w-full bg-canvas border border-line rounded-[10px] px-3.5 py-2.5 outline-none resize-y transition-colors duration-150 focus:border-ink focus:shadow-[0_0_0_3px_rgb(20_17_15/0.08)]';
const wide = 'w-full md:w-auto justify-center md:justify-normal';

export default async function BusinessIdeaDetailPage({
	params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { id } = await params;
	const { error } = await searchParams;

	const { data: idea } = await supabase.from('business_ideas').select('*').eq('id', id).maybeSingle();
	if (!idea) redirect('/business-ideas');

	const typed = idea as BusinessIdea;

	const { data: linkedProject } = await supabase
		.from('projects')
		.select('id, title')
		.eq('business_idea_id', typed.id)
		.maybeSingle();

	let headlineSignalCount = 0;
	if (linkedProject) {
		const { data: logs } = await supabase
			.from('project_logs')
			.select('signal_type')
			.eq('project_id', linkedProject.id)
			.in('signal_type', HEADLINE_SIGNAL_TYPES);
		headlineSignalCount = logs?.length ?? 0;
	}

	return (
		<section className="max-w-[760px]">
			<Link className="inline-block mb-6 text-[13px] text-muted no-underline hover:text-ink" href="/business-ideas">← Business ideas</Link>

			<h1 className="m-0 font-serif text-[clamp(1.9rem,4vw,2.6rem)] font-semibold tracking-[-0.02em]">{typed.title}</h1>
			<p className="mt-2.5 text-[13px] text-muted">
				Registered {new Date(typed.created_at).toLocaleDateString()}
				{typed.updated_at !== typed.created_at && ` · updated ${new Date(typed.updated_at).toLocaleDateString()}`}
			</p>

			{error && <FormError>{error}</FormError>}

			<div className="mt-6 flex items-center gap-3 flex-wrap md:flex-nowrap">
				{linkedProject ? (
					<>
						<Link className={cx(btnGhost, wide)} href={`/projects/${linkedProject.id}`}>→ {linkedProject.title}</Link>
						<span className="text-[13px] text-muted">
							{headlineSignalCount} signal{headlineSignalCount === 1 ? '' : 's'}
						</span>
					</>
				) : (
					<form method="post" action="/api/projects/create" className="m-0">
						<input type="hidden" name="title" value={typed.title} />
						<input type="hidden" name="description" value={typed.pain_point ?? ''} />
						<input type="hidden" name="business_idea_id" value={typed.id} />
						<input type="hidden" name="return_to" value={`/business-ideas/${typed.id}`} />
						<button type="submit" className={cx(btn, wide)}>Start working on this →</button>
					</form>
				)}
			</div>

			<form method="post" action={`/api/business-ideas/${typed.id}/update`} className="flex flex-col gap-7 mt-10 w-full">
				<div className="flex flex-col gap-2">
					<label htmlFor="title" className={fieldLabel}>Title</label>
					<input
						id="title"
						name="title"
						type="text"
						required
						maxLength={160}
						defaultValue={typed.title}
						className={cx(fieldBox, 'font-serif text-xl font-semibold text-ink')}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="pain_point" className={fieldLabel}>Pain point</label>
					<textarea id="pain_point" name="pain_point" rows={3} defaultValue={typed.pain_point ?? ''} className={cx(fieldBox, 'font-sans text-base text-ink')} />
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="target_market" className={fieldLabel}>Target market</label>
					<textarea id="target_market" name="target_market" rows={3} defaultValue={typed.target_market ?? ''} className={cx(fieldBox, 'font-sans text-base text-ink')} />
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="validation" className={fieldLabel}>Validation</label>
					<textarea id="validation" name="validation" rows={3} defaultValue={typed.validation ?? ''} className={cx(fieldBox, 'font-sans text-base text-ink')} />
				</div>

				<div className="flex items-center gap-3.5 mt-2 flex-wrap md:flex-nowrap">
					<button type="submit" className={cx(btn, wide)}>Save changes</button>
					<button type="submit" form="delete-idea" className={cx(btnDanger, wide)}>Delete idea</button>
				</div>
			</form>

			<form id="delete-idea" method="post" action={`/api/business-ideas/${typed.id}/delete`} />
		</section>
	);
}
