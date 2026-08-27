import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import type { Project } from '@/lib/projects';
import { card, cardFoot, cardGrid, cardHead, cardTitle, cardValue, chip, cx, Empty, PageHead } from '@/components/ui';

export default async function SystemDesignPage() {
	const { supabase } = await requireOwner();

	const { data: projects } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
	const typedProjects = (projects ?? []) as Project[];

	const projectIds = typedProjects.map((project) => project.id);
	const counts = new Map<string, number>();

	if (projectIds.length) {
		const [{ data: actors }, { data: goals }, { data: useCases }, { data: requirements }] = await Promise.all([
			supabase.from('system_actors').select('project_id').in('project_id', projectIds),
			supabase.from('system_goals').select('project_id').in('project_id', projectIds),
			supabase.from('system_use_cases').select('project_id').in('project_id', projectIds),
			supabase.from('system_requirements').select('project_id').in('project_id', projectIds),
		]);

		for (const rows of [actors, goals, useCases, requirements]) {
			for (const row of rows ?? []) {
				counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
			}
		}
	}

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Delivery"
				title="System design."
				lede="Pick a project to work through its actors, use cases, system goals, and requirements."
			/>

			<div className={cardGrid}>
				{typedProjects.length ? (
					typedProjects.map((project) => (
						<Link
							key={project.id}
							className={cx(card, 'no-underline text-inherit transition-colors hover:border-ink')}
							href={`/system-design/${project.id}`}
						>
							<div className={cardHead}>
								<span className={cardTitle}>{project.title}</span>
							</div>
							<p className={cardValue}>{project.description || 'No description.'}</p>
							<div className={cx(cardFoot, 'justify-end')}>
								<span className={chip}>{counts.get(project.id) ?? 0} item{counts.get(project.id) === 1 ? '' : 's'}</span>
							</div>
						</Link>
					))
				) : (
					<Empty>No projects yet. <Link href="/projects" className="text-ink">Create one first</Link>, then design its system here.</Empty>
				)}
			</div>
		</section>
	);
}
