import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import type { CmsSite } from '@/lib/cms';
import { card, cardGrid, cardHead, cardTitle, chipMuted, Empty, FormError, PageHead } from '@/components/ui';
import { NewSitePopup } from './NewSitePopup';

export default async function CmsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const [{ data: sites }, { data: posts }, { data: ideas }] = await Promise.all([
		supabase.from('cms_sites').select('*').order('created_at', { ascending: true }),
		supabase.from('cms_posts').select('site_id, status, publish_at'),
		supabase.from('cms_ideas').select('site_id, status'),
	]);
	const typedSites = (sites ?? []) as CmsSite[];

	const stats = (id: string) => {
		const p = (posts ?? []).filter((x) => x.site_id === id);
		const upcoming = p
			.filter((x) => x.status === 'scheduled' && x.publish_at)
			.map((x) => new Date(x.publish_at as string))
			.sort((a, b) => a.getTime() - b.getTime())[0];
		return {
			published: p.filter((x) => x.status === 'published').length,
			scheduled: p.filter((x) => x.status === 'scheduled').length,
			drafts: p.filter((x) => x.status === 'draft').length,
			queued: (ideas ?? []).filter((x) => x.site_id === id && x.status === 'queued').length,
			upcoming,
		};
	};

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Sales & Marketing"
				title="Blog CMS."
				lede="Feed a site ideas; Claude writes the articles, schedules them on the site's posting days, and asks the site to rebuild when they go live."
				actions={<NewSitePopup />}
			/>
			{error && <FormError>{error}</FormError>}

			<div className={cardGrid}>
				{typedSites.length ? typedSites.map((s) => {
					const st = stats(s.id);
					return (
						<Link key={s.id} href={`/cms/${s.id}`} className={`${card} no-underline text-ink hover:border-ink transition-colors`}>
							<div className={cardHead}>
								<span className={cardTitle}>{s.name}</span>
								{!s.active && <span className={chipMuted}>Paused</span>}
							</div>
							<span className="text-sm text-muted">{s.domain ?? 'No domain set'}</span>
							<div className="flex gap-1.5 flex-wrap mt-1">
								<span className={chipMuted}>{st.published} published</span>
								<span className={chipMuted}>{st.scheduled} scheduled</span>
								<span className={chipMuted}>{st.drafts} drafts</span>
								<span className={chipMuted}>{st.queued} ideas queued</span>
							</div>
							<span className="text-xs text-muted mt-auto pt-2">
								{st.upcoming ? `Next post ${st.upcoming.toLocaleString('hu-HU', { dateStyle: 'medium', timeStyle: 'short', timeZone: s.timezone })}` : s.auto_publish ? 'Nothing scheduled' : 'Review mode — posts wait as drafts'}
							</span>
						</Link>
					);
				}) : <Empty>No sites yet.</Empty>}
			</div>
		</section>
	);
}
