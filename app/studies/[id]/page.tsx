import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import {
	STUDY_SOURCE_LABELS, STUDY_STATUS_LABELS, TAKEAWAY_CATEGORY_LABELS,
	type Study, type StudyComment, type StudyTakeaway,
} from '@/lib/studies';
import {
	btn, btnGhost, chipMuted, Empty, FormError, Pill, table, tableWrap, td, th,
} from '@/components/ui';

export default async function StudyDetailPage({
	params, searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ error?: string }>;
}) {
	const { supabase } = await requireOwner();
	const [{ id }, { error }] = await Promise.all([params, searchParams]);

	const { data: study } = await supabase.from('studies').select('*').eq('id', id).maybeSingle();
	if (!study) redirect('/studies');
	const typed = study as Study;

	const [{ data: takeaways }, { data: comments }] = await Promise.all([
		supabase.from('study_takeaways').select('*').eq('study_id', id).order('created_at', { ascending: true }),
		supabase.from('study_comments').select('*').eq('study_id', id).order('created_at', { ascending: false }),
	]);

	const typedTakeaways = (takeaways ?? []) as StudyTakeaway[];
	const typedComments = (comments ?? []) as StudyComment[];

	return (
		<section className="max-w-[820px]">
			<Link href="/studies" className="inline-block mb-6 text-[13px] text-muted no-underline hover:text-ink">← Studies</Link>

			<div className="flex items-start justify-between gap-3 flex-wrap">
				<h1 className="m-0 font-serif text-[clamp(1.7rem,4vw,2.3rem)] font-semibold tracking-[-0.02em] leading-tight">
					{typed.title || 'Untitled'}
				</h1>
				{typed.status !== 'summarized' && (
					<form method="post" action={`/api/studies/${typed.id}/retry`}>
						<button type="submit" className={btn}>
							{typed.status === 'pending' ? 'Summarize' : '↺ Retry'}
						</button>
					</form>
				)}
			</div>

			<div className="mt-3 flex items-center gap-2 flex-wrap">
				<Pill value={typed.status}>{STUDY_STATUS_LABELS[typed.status]}</Pill>
				<span className={chipMuted}>{STUDY_SOURCE_LABELS[typed.source_type]}</span>
				<a href={typed.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted no-underline hover:text-ink">
					{typed.url} ↗
				</a>
			</div>

			{error && <FormError>{error}</FormError>}
			{typed.status === 'failed' && typed.error && (
				<FormError>{typed.error}</FormError>
			)}

			<div className="mt-12">
				<h2 className="m-0 mb-5 font-serif text-[22px] font-semibold">Takeaways</h2>
				{typedTakeaways.length ? (
					<div className={tableWrap}>
						<table className={table}>
							<thead>
								<tr>
									<th className={th}>Category</th>
									<th className={th}>Takeaway</th>
								</tr>
							</thead>
							<tbody>
								{typedTakeaways.map((t) => (
									<tr key={t.id}>
										<td className={`${td} whitespace-nowrap align-top`}>
											<Pill value={t.category}>{TAKEAWAY_CATEGORY_LABELS[t.category]}</Pill>
										</td>
										<td className={`${td} align-top`}>{t.takeaway}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<Empty>
						{typed.status === 'pending'
							? 'Not summarized yet.'
							: typed.status === 'failed'
								? 'Summarization failed -- retry above.'
								: 'No takeaways found in this one.'}
					</Empty>
				)}
			</div>

			<div className="mt-14">
				<h2 className="m-0 mb-5 font-serif text-[22px] font-semibold">Comments</h2>

				<form method="post" action={`/api/studies/${typed.id}/comments`} className="flex gap-2.5 items-start flex-wrap mb-8">
					<textarea
						name="comment" rows={2} required placeholder="Add a comment…"
						className="flex-1 basis-64 px-3.5 py-2.5 rounded-[10px] border border-line bg-canvas text-sm text-ink outline-none resize-y focus:border-ink"
					/>
					<button type="submit" className={btnGhost}>Comment</button>
				</form>

				<div className="flex flex-col">
					{typedComments.length ? (
						typedComments.map((c, i) => (
							<div key={c.id} className="group flex gap-3 md:gap-[18px]">
								<div className="flex flex-col items-center shrink-0 w-3">
									<span className="w-3 h-3 rounded-full bg-ink border-2 border-paper shadow-[0_0_0_1px_var(--color-line)] mt-1.5" />
									{i < typedComments.length - 1 && <span className="flex-1 w-px bg-line mt-1" />}
								</div>
								<div className="flex-1 pb-7">
									<span className="text-[13px] text-muted tabular-nums">{new Date(c.created_at).toLocaleString()}</span>
									<p className="mt-2 mb-0 text-[15px] leading-relaxed whitespace-pre-wrap">{c.comment}</p>
								</div>
							</div>
						))
					) : (
						<Empty>No comments yet.</Empty>
					)}
				</div>
			</div>
		</section>
	);
}
