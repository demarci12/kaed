import { createSupabaseServerClient } from '@/lib/supabase';
import { FUNDING_STAGE_LABELS, externalHref, type FundingStage } from '@/lib/projects';
import { Pill } from '@/components/ui';

/**
 * The one public page. It deliberately does not call requireUser/requireOwner:
 * it reads the `public_active_projects` view with an unauthenticated client so
 * a visitor with no session still sees the ongoing work.
 */
interface PublicActiveProject {
	id: string;
	title: string;
	tagline: string | null;
	description: string | null;
	website_url: string | null;
	industry: string | null;
	founded_year: number | null;
	funding_stage: FundingStage | null;
	created_at: string;
}

export default async function Home() {
	const supabase = await createSupabaseServerClient();
	const { data } = await supabase.from('public_active_projects').select('*');
	const ongoingProjects = (data ?? []) as PublicActiveProject[];

	return (
		<>
			<section>
				{/* flex-wrap-reverse puts the portrait first once the row wraps, so a
				    phone shows the face above the copy rather than below it. */}
				<div className="flex items-center gap-[clamp(24px,5vw,56px)] [flex-wrap:wrap-reverse]">
					<div className="flex-[1_1_380px] min-w-0">
						<p className="m-0 mb-5 text-[13px] tracking-[0.16em] uppercase text-muted">KAED</p>
						<h1 className="m-0 font-serif font-semibold text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.03] tracking-[-0.03em]">
							Personal projects<br />of <em className="italic">Marton Deak</em>.
						</h1>
						<p className="max-w-[54ch] mt-7 text-lg leading-relaxed text-muted">
							Notes, builds, and challenges I&apos;m working through. Occasional updates
							land here first.
						</p>
					</div>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						className="shrink-0 grow-0 basis-auto w-[clamp(150px,26vw,260px)] h-auto aspect-square object-cover rounded-full border border-line"
						src="/marton.jpg"
						alt="Marton Deak"
						width={640}
						height={640}
						loading="eager"
						decoding="async"
					/>
				</div>
			</section>

			{ongoingProjects.length > 0 && (
				<section className="mt-16 md:mt-24">
					<p className="m-0 mb-5 text-[13px] tracking-[0.16em] uppercase text-muted">Ongoing</p>
					<h2 className="m-0 font-serif font-semibold text-[clamp(1.6rem,4vw,2.4rem)] leading-[1.1] tracking-[-0.02em]">
						What I&apos;m building right now.
					</h2>
					<div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
						{ongoingProjects.map((project) => {
							const href = externalHref(project.website_url);
							return (
								<article key={project.id} className="p-6 bg-paper border border-line rounded-2xl">
									<div className="flex items-start justify-between gap-3">
										<h3 className="m-0 font-serif text-xl font-semibold tracking-[-0.01em]">{project.title}</h3>
										{project.funding_stage && (
											<Pill value={project.funding_stage}>{FUNDING_STAGE_LABELS[project.funding_stage]}</Pill>
										)}
									</div>
									{project.tagline && <p className="mt-2 mb-0 text-muted">{project.tagline}</p>}
									{project.description && <p className="mt-3 mb-0 text-[15px] leading-relaxed">{project.description}</p>}
									<div className="mt-4 flex items-center gap-3 text-[13px] text-muted flex-wrap">
										{project.industry && <span>{project.industry}</span>}
										{project.founded_year && <span>Since {project.founded_year}</span>}
										{href && (
											<a
												className="text-ink no-underline border-b border-line hover:border-ink"
												href={href}
												target="_blank"
												rel="noopener noreferrer"
											>
												Visit →
											</a>
										)}
									</div>
								</article>
							);
						})}
					</div>
				</section>
			)}
		</>
	);
}
