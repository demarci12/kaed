import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import type { Project } from '@/lib/projects';
import { InlineEdit } from '@/components/InlineEdit';
import { NewProjectPopup } from './NewProjectPopup';
import {
	card, cardActions, cardDate, cardFoot, cardGrid, cardHead, cardLabel, cardTitle, cardValue,
	deleteBtn, iconBtn, Empty, FormError, PageHead, Pill,
} from '@/components/ui';

const STATUS_LABELS: Record<string, string> = {
	not_started: 'Not started',
	active: 'Active',
	done: 'Done',
};

const STATUS_OPTIONS: [string, string][] = [
	['not_started', 'Not started'],
	['active', 'Active'],
	['done', 'Done'],
];

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const { data: projects } = await supabase
		.from('projects')
		.select('*')
		.order('created_at', { ascending: false });

	const typedProjects = (projects ?? []) as Project[];

	return (
		<section className="max-w-[1040px]">
			<PageHead
				eyebrow="Personal"
				title="Projects."
				lede="Things you've set out to accomplish, and the trail of proof behind them."
				actions={<NewProjectPopup />}
			/>

			{error && <FormError>{error}</FormError>}

			<div className={cardGrid}>
				{typedProjects.length ? (
					typedProjects.map((project) => (
						<article key={project.id} className={card}>
							<div className={cardHead}>
								<InlineEdit
									value={project.title}
									field="title"
									id={project.id}
									endpoint="/api/projects"
									className={cardTitle}
								/>
								<div className={cardActions}>
									<Link
										className={iconBtn}
										href={`/projects/${project.id}`}
										aria-label={`Open ${project.title}`}
										title="Open"
									>↗</Link>
									<form method="post" action={`/api/projects/${project.id}/delete`} className="m-0">
										<button type="submit" className={deleteBtn} aria-label="Delete project">×</button>
									</form>
								</div>
							</div>

							<div className="min-w-0">
								<span className={cardLabel}>Description</span>
								<InlineEdit
									value={project.description ?? ''}
									field="description"
									id={project.id}
									endpoint="/api/projects"
									kind="textarea"
									className={`block ${cardValue}`}
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="min-w-0">
									<span className={cardLabel}>Start</span>
									<InlineEdit
										value={project.start_date ?? ''}
										field="start_date"
										id={project.id}
										endpoint="/api/projects"
										kind="date"
										className={`block tabular-nums ${cardValue}`}
									/>
								</div>
								<div className="min-w-0">
									<span className={cardLabel}>Target end</span>
									<InlineEdit
										value={project.target_end_date ?? ''}
										field="target_end_date"
										id={project.id}
										endpoint="/api/projects"
										kind="date"
										className={`block tabular-nums ${cardValue}`}
									/>
								</div>
							</div>

							<div className={cardFoot}>
								<InlineEdit
									value={project.status}
									field="status"
									id={project.id}
									endpoint="/api/projects"
									kind="select"
									options={STATUS_OPTIONS}
									className="cursor-pointer"
									display={<Pill value={project.status}>{STATUS_LABELS[project.status]}</Pill>}
								/>
								<span className={cardDate}>{new Date(project.created_at).toLocaleDateString()}</span>
							</div>
						</article>
					))
				) : (
					<Empty>No projects yet. Create your first one.</Empty>
				)}
			</div>
		</section>
	);
}
