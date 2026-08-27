import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { HEADLINE_SIGNAL_TYPES } from '@/lib/projects';
import type { BusinessIdea } from '@/lib/business-ideas';
import { IDEA_CATEGORY_PILL_LABELS } from '@/lib/idea-categories';
import { InlineEdit } from '@/components/InlineEdit';
import { NewIdeaPopup } from './NewIdeaPopup';
import { RankBadge, RankControls } from './RankControls';
import {
	card, cardActions, cardDate, cardFoot, cardGrid, cardHead, cardLabel, cardTitle, cardValue,
	chip, chipMuted, deleteBtn, iconBtn, Empty, FormError, PageHead, Pill,
} from '@/components/ui';

const CATEGORY_OPTIONS: [string, string][] = [
	['', 'Pick category'],
	...(Object.entries(IDEA_CATEGORY_PILL_LABELS) as [string, string][]),
];

export default async function BusinessIdeasPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const { data: ideas } = await supabase
		.from('business_ideas')
		.select('*')
		.order('rank', { ascending: true });

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

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Personal"
				title="Business idea register."
				lede="Ideas worth evaluating as businesses — the pain point they solve, who has it, and what's been done to validate it."
				actions={<NewIdeaPopup />}
			/>

			{error && <FormError>{error}</FormError>}

			<div className={cardGrid}>
				{typedIdeas.length ? (
					typedIdeas.map((idea, index) => {
						const linkedProject = linkedProjectByIdeaId.get(idea.id);
						const signalCount = signalCountByIdeaId.get(idea.id) ?? 0;
						return (
							<article key={idea.id} className={card}>
								<div className={cardHead}>
									<RankBadge id={idea.id} position={index + 1} />
									<InlineEdit
										value={idea.title}
										field="title"
										id={idea.id}
										endpoint="/api/business-ideas"
										className={cardTitle}
									/>
									<div className={cardActions}>
										<Link
											className={iconBtn}
											href={`/business-ideas/${idea.id}`}
											aria-label={`Open ${idea.title}`}
											title="Open"
										>↗</Link>
										<RankControls
											id={idea.id}
											position={index + 1}
											isFirst={index === 0}
											isLast={index === typedIdeas.length - 1}
										/>
										<form method="post" action={`/api/business-ideas/${idea.id}/delete`} className="m-0">
											<button type="submit" className={deleteBtn} aria-label="Delete business idea">×</button>
										</form>
									</div>
								</div>

								<div>
									<InlineEdit
										value={idea.category ?? ''}
										field="category"
										id={idea.id}
										endpoint="/api/business-ideas"
										kind="select"
										options={CATEGORY_OPTIONS}
										className="inline-block cursor-pointer"
										display={
											idea.category
												? <Pill value={idea.category}>{IDEA_CATEGORY_PILL_LABELS[idea.category]}</Pill>
												: <Pill value="">Pick category</Pill>
										}
									/>
								</div>

								<div className="min-w-0">
									<span className={cardLabel}>Pain point</span>
									<InlineEdit value={idea.pain_point ?? ''} field="pain_point" id={idea.id} endpoint="/api/business-ideas" kind="textarea" className={`block ${cardValue}`} />
								</div>

								<div className="min-w-0">
									<span className={cardLabel}>Target market</span>
									<InlineEdit value={idea.target_market ?? ''} field="target_market" id={idea.id} endpoint="/api/business-ideas" kind="textarea" className={`block ${cardValue}`} />
								</div>

								<div className="min-w-0">
									<span className={cardLabel}>Validation</span>
									<InlineEdit value={idea.validation ?? ''} field="validation" id={idea.id} endpoint="/api/business-ideas" kind="textarea" className={`block ${cardValue}`} />
								</div>

								<div className={cardFoot}>
									{linkedProject ? (
										<Link className={chip} href={`/projects/${linkedProject.id}`}>
											→ {linkedProject.title} · {signalCount} signal{signalCount === 1 ? '' : 's'}
										</Link>
									) : (
										<span className={chipMuted}>Not started as a project</span>
									)}
									<span className={cardDate}>{new Date(idea.created_at).toLocaleDateString()}</span>
								</div>
							</article>
						);
					})
				) : (
					<Empty>No business ideas registered yet.</Empty>
				)}
			</div>
		</section>
	);
}
