import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import {
	compareByNewest, compareByScore, contextGroups, contextKey, isPainSource, journalDays, painScore,
	PAIN_SOURCE_LABELS, PAIN_SOURCES, type PainPoint, type PainSource,
} from '@/lib/painhunter';
import {
	btnGhost, chipActive, Empty, FormError, PageHead, segmented, segmentedActive, segmentedItem,
} from '@/components/ui';
import { FilterSelect } from '@/components/FilterSelect';
import { NewPainPopup } from './NewPainPopup';
import { PainTable } from './PainTable';
import { QuickAddPain } from './QuickAddPain';
import { PainhunterGuide } from './PainhunterGuide';

type Search = { error?: string; source?: string; context?: string; idea?: string; sort?: string };

export default async function PainhunterPage({ searchParams }: { searchParams: Promise<Search> }) {
	const { supabase } = await requireOwner();
	const sp = await searchParams;

	const [{ data: rows }, { data: linkRows }, { data: ideaRows }] = await Promise.all([
		supabase.from('pain_points').select('*'),
		supabase.from('pain_point_ideas').select('pain_point_id, business_idea_id'),
		supabase.from('business_ideas').select('id, title, archived_at').order('rank', { ascending: true }),
	]);

	const all = (rows ?? []) as PainPoint[];
	const active = all.filter((p) => !p.archived_at);
	const archivedCount = all.length - active.length;

	const ideas = (ideaRows ?? []) as { id: string; title: string; archived_at: string | null }[];
	const ideaById = new Map(ideas.map((i) => [i.id, i]));
	const ideaIdsByPain = new Map<string, string[]>();
	const painIdsByIdea = new Map<string, Set<string>>();
	for (const l of (linkRows ?? []) as { pain_point_id: string; business_idea_id: string }[]) {
		ideaIdsByPain.set(l.pain_point_id, [...(ideaIdsByPain.get(l.pain_point_id) ?? []), l.business_idea_id]);
		const set = painIdsByIdea.get(l.business_idea_id) ?? new Set<string>();
		set.add(l.pain_point_id);
		painIdsByIdea.set(l.business_idea_id, set);
	}

	const filters = {
		source: sp.source && isPainSource(sp.source) ? sp.source : '',
		context: sp.context && contextGroups(active).some((g) => g.key === sp.context) ? sp.context : '',
		idea: sp.idea && ideaById.has(sp.idea) ? sp.idea : '',
		sort: sp.sort === 'new' ? 'new' : '',
	};
	const filtered = Boolean(filters.source || filters.context || filters.idea);
	const href = (next: Partial<typeof filters>) => {
		const q = new URLSearchParams();
		for (const [k, v] of Object.entries({ ...filters, ...next })) if (v) q.set(k, v);
		const s = q.toString();
		return s ? `/painhunter?${s}` : '/painhunter';
	};

	const visible = active
		.filter((p) => !filters.source || p.source === filters.source)
		.filter((p) => !filters.context || contextKey(p.context) === filters.context)
		.filter((p) => !filters.idea || painIdsByIdea.get(filters.idea)?.has(p.id))
		.sort(filters.sort === 'new' ? compareByNewest : compareByScore);

	const topIds = new Set(
		!filtered && !filters.sort ? visible.filter((p) => painScore(p) != null).slice(0, 3).map((p) => p.id) : [],
	);

	const sourceCounts = PAIN_SOURCES.map((s) => [s, active.filter((p) => p.source === s).length] as const).filter(([, n]) => n);
	const contexts = contextGroups(active);
	const sourceTotals: Partial<Record<PainSource, number>> = Object.fromEntries(sourceCounts);
	const scored = active.filter((p) => painScore(p) != null).length;
	const activeIdeas = ideas.filter((i) => !i.archived_at);

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Personal"
				title="Painhunter."
				lede="Log problems, not solutions: anything slow, manual, annoying, expensive or done in Excel. Score each on pain, frequency, money, access and fit, then link the strong ones to a business idea."
				actions={
					<>
						<Link href="/painhunter/archive" className={btnGhost}>Archive{archivedCount ? ` (${archivedCount})` : ''}</Link>
						<NewPainPopup />
					</>
				}
			/>

			{sp.error && <FormError>{sp.error}</FormError>}

			<QuickAddPain />

			{active.length > 0 && (
				<div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2">
					<FilterSelect
						label="Source"
						active={Boolean(filters.source)}
						value={href({})}
						options={[
							{ href: href({ source: '' }), label: 'All sources' },
							...sourceCounts.map(([s, n]) => ({ href: href({ source: s }), label: `${PAIN_SOURCE_LABELS[s]} · ${n}` })),
						]}
					/>
					{contexts.length > 0 && (
						<FilterSelect
							label="Context"
							active={Boolean(filters.context)}
							value={href({})}
							options={[
								{ href: href({ context: '' }), label: 'All contexts' },
								...contexts.map((c) => ({ href: href({ context: c.key }), label: `${c.label} · ${c.count}` })),
							]}
						/>
					)}
					{filters.idea && (
						<Link href={href({ idea: '' })} className={chipActive} title="Clear filter">
							{ideaById.get(filters.idea)?.title} ×
						</Link>
					)}
					{filtered && (
						<Link
							href={href({ source: '', context: '', idea: '' })}
							className="px-1 text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
						>
							Clear
						</Link>
					)}

					<div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
						<p className="m-0 text-xs text-muted tabular-nums">
							{active.length} pain{active.length === 1 ? '' : 's'}
							<span aria-hidden="true"> · </span>
							<span title="Pains with all five scores filled in">{scored} scored</span>
							<span aria-hidden="true"> · </span>
							<span title="Distinct days with a journal entry in the last 30 days">Journal {journalDays(all)}/30 days</span>
						</p>
						<div className={segmented} role="group" aria-label="Sort">
							<Link href={href({ sort: '' })} className={filters.sort ? segmentedItem : segmentedActive}>Best score</Link>
							<Link href={href({ sort: 'new' })} className={filters.sort ? segmentedActive : segmentedItem}>Newest</Link>
						</div>
					</div>
				</div>
			)}

			{visible.length ? (
				<PainTable
					rows={visible.map((pain) => {
						const linkedIds = ideaIdsByPain.get(pain.id) ?? [];
						return {
							pain,
							top: topIds.has(pain.id),
							linked: linkedIds.flatMap((id) => {
								const idea = ideaById.get(id);
								return idea ? [{ id, title: idea.title, archived: Boolean(idea.archived_at) }] : [];
							}),
							linkOptions: activeIdeas.filter((i) => !linkedIds.includes(i.id)).map(({ id, title }) => ({ id, title })),
						};
					})}
				/>
			) : (
				<div className={filtered ? 'mt-4' : 'mt-8'}>
					<Empty>{filtered ? 'No pains match these filters.' : 'No pains logged yet. Start with what annoyed you today.'}</Empty>
				</div>
			)}

			<PainhunterGuide counts={sourceTotals} />
		</section>
	);
}
