import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import {
	compareByNewest, compareByScore, isPainContext, isPainSource, journalDays, painScore,
	PAIN_CONTEXT_LABELS, PAIN_CONTEXTS, PAIN_SOURCE_LABELS, PAIN_SOURCES, type PainPoint,
} from '@/lib/painhunter';
import { CardList } from '@/components/CardList';
import {
	btn, btnGhost, cardGrid, cardLabel, chip, chipActive, chipMuted, cx, Empty, FormError, input, PageHead,
} from '@/components/ui';
import { NewPainPopup } from './NewPainPopup';
import { PainCard } from './PainCard';

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
		context: sp.context && isPainContext(sp.context) ? sp.context : '',
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
		.filter((p) => !filters.context || p.context === filters.context)
		.filter((p) => !filters.idea || painIdsByIdea.get(filters.idea)?.has(p.id))
		.sort(filters.sort === 'new' ? compareByNewest : compareByScore);

	const topIds = new Set(
		!filtered && !filters.sort ? visible.filter((p) => painScore(p) != null).slice(0, 3).map((p) => p.id) : [],
	);

	const sourceCounts = PAIN_SOURCES.map((s) => [s, active.filter((p) => p.source === s).length] as const).filter(([, n]) => n);
	const contextCounts = PAIN_CONTEXTS.map((c) => [c, active.filter((p) => p.context === c).length] as const).filter(([, n]) => n);
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

			<form method="post" action="/api/painhunter/create" className="mt-8 flex gap-2.5 flex-wrap">
				<input type="hidden" name="source" value="journal" />
				<input
					className={cx(input, 'flex-[1_1_18rem] min-w-0 w-auto')}
					name="title"
					type="text"
					required
					maxLength={200}
					aria-label="Today's frustration"
					placeholder="What was slow, manual, annoying or expensive today?"
				/>
				<select className={cx(input, 'sm:w-auto')} name="context" aria-label="Context" defaultValue="">
					<option value="">Context</option>
					{PAIN_CONTEXTS.map((c) => <option key={c} value={c}>{PAIN_CONTEXT_LABELS[c]}</option>)}
				</select>
				<button type="submit" className={btn}>Add to journal</button>
			</form>

			<div className="mt-4 flex flex-wrap items-center gap-1.5">
				<span className={chipMuted}>{active.length} pain{active.length === 1 ? '' : 's'}</span>
				<span className={chipMuted} title="Distinct days with a journal entry in the last 30 days">Journal {journalDays(all)}/30 days</span>
				<span className={chipMuted} title="Pains with all five scores filled in">{scored} scored</span>
			</div>

			{active.length > 0 && (
				<div className="mt-6 flex flex-col gap-2.5">
					<FilterRow label="Source">
						<Link href={href({ source: '' })} className={filters.source ? chip : chipActive}>All</Link>
						{sourceCounts.map(([s, n]) => (
							<Link key={s} href={href({ source: s })} className={filters.source === s ? chipActive : chip}>
								{PAIN_SOURCE_LABELS[s]} · {n}
							</Link>
						))}
					</FilterRow>
					{contextCounts.length > 0 && (
						<FilterRow label="Context">
							<Link href={href({ context: '' })} className={filters.context ? chip : chipActive}>All</Link>
							{contextCounts.map(([c, n]) => (
								<Link key={c} href={href({ context: c })} className={filters.context === c ? chipActive : chip}>
									{PAIN_CONTEXT_LABELS[c]} · {n}
								</Link>
							))}
						</FilterRow>
					)}
					<FilterRow label="Sort">
						<Link href={href({ sort: '' })} className={filters.sort ? chip : chipActive}>Best score</Link>
						<Link href={href({ sort: 'new' })} className={filters.sort ? chipActive : chip}>Newest</Link>
					</FilterRow>
					{filters.idea && (
						<FilterRow label="Idea">
							<Link href={href({ idea: '' })} className={chipActive} title="Clear filter">
								{ideaById.get(filters.idea)?.title} ×
							</Link>
						</FilterRow>
					)}
				</div>
			)}

			<CardList className={cardGrid}>
				{visible.length ? (
					visible.map((pain) => {
						const linkedIds = ideaIdsByPain.get(pain.id) ?? [];
						return (
							<PainCard
								key={pain.id}
								pain={pain}
								top={topIds.has(pain.id)}
								linked={linkedIds.flatMap((id) => {
									const idea = ideaById.get(id);
									return idea ? [{ id, title: idea.title, archived: Boolean(idea.archived_at) }] : [];
								})}
								linkOptions={activeIdeas.filter((i) => !linkedIds.includes(i.id)).map(({ id, title }) => ({ id, title }))}
							/>
						);
					})
				) : (
					<Empty>{filtered ? 'No pains match these filters.' : 'No pains logged yet. Start with what annoyed you today.'}</Empty>
				)}
			</CardList>
		</section>
	);
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<span className={cx(cardLabel, 'w-16 shrink-0')}>{label}</span>
			{children}
		</div>
	);
}
