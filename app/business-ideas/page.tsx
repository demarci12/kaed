import { requireOwner } from '@/lib/auth';
import { HEADLINE_SIGNAL_TYPES } from '@/lib/projects';
import type { BusinessIdea } from '@/lib/business-ideas';
import { NewIdeaPopup } from './NewIdeaPopup';
import { IdeaList, type IdeaListItem } from './IdeaList';
import Link from 'next/link';
import { chipMuted, FormError, PageHead } from '@/components/ui';

export default async function BusinessIdeasPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const [{ data: ideas }, { count: archivedCount }] = await Promise.all([
		supabase.from('business_ideas').select('*').is('archived_at', null).order('rank', { ascending: true }),
		supabase.from('business_ideas').select('id', { count: 'exact', head: true }).not('archived_at', 'is', null),
	]);

	const typedIdeas = (ideas ?? []) as BusinessIdea[];

	const ideaIds = typedIdeas.map((idea) => idea.id);
	const signalCountByIdeaId = new Map<string, number>();
	const linkedProjectByIdeaId = new Map<string, { id: string; title: string }>();

	if (ideaIds.length) {
		const { data: linkedProjects } = await supabase
			.from('projects')
			.select('id, title, business_idea_id')
			.in('business_idea_id', ideaIds);

		const projectIdToIdeaId = new Map<string, string>();
		for (const p of linkedProjects ?? []) {
			const ideaId = p.business_idea_id as string;
			linkedProjectByIdeaId.set(ideaId, { id: p.id, title: p.title });
			projectIdToIdeaId.set(p.id, ideaId);
		}

		if (projectIdToIdeaId.size) {
			const { data: logs } = await supabase
				.from('project_logs')
				.select('project_id, signal_type')
				.in('project_id', [...projectIdToIdeaId.keys()])
				.in('signal_type', HEADLINE_SIGNAL_TYPES);

			for (const log of logs ?? []) {
				const ideaId = projectIdToIdeaId.get(log.project_id);
				if (!ideaId) continue;
				signalCountByIdeaId.set(ideaId, (signalCountByIdeaId.get(ideaId) ?? 0) + 1);
			}
		}
	}

	const items: IdeaListItem[] = typedIdeas.map((idea) => ({
		idea,
		linkedProject: linkedProjectByIdeaId.get(idea.id) ?? null,
		signalCount: signalCountByIdeaId.get(idea.id) ?? 0,
	}));

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Personal"
				title="Business idea register."
				lede="Ideas worth evaluating as businesses — the pain point they solve, who has it, and what's been done to validate it."
				actions={<NewIdeaPopup />}
			/>

			{error && <FormError>{error}</FormError>}

			{!!archivedCount && (
				<Link href="/business-ideas/archive" className={chipMuted}>Archived ({archivedCount})</Link>
			)}

			<IdeaList items={items} />
		</section>
	);
}
