import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { POST_STATUS_LABELS, type CmsPost, type CmsSite } from '@/lib/cms';
import { btnGhost, FormError, PageHead, Pill } from '@/components/ui';
import { RemoveDraftButton } from './RemovePost';
import { PostEditor } from './PostEditor';
import { ScheduleForm, StatusButton } from './ScheduleForm';

export default async function CmsPostPage({
	params, searchParams,
}: { params: Promise<{ id: string; postId: string }>; searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const [{ id, postId }, { error }] = await Promise.all([params, searchParams]);

	const [{ data: post }, { data: site }] = await Promise.all([
		supabase.from('cms_posts').select('*').eq('id', postId).eq('site_id', id).maybeSingle(),
		supabase.from('cms_sites').select('*').eq('id', id).maybeSingle(),
	]);
	if (!post || !site) notFound();
	const p = post as CmsPost;
	const s = site as CmsSite;

	const liveUrl = s.domain && p.status === 'published' ? `https://${s.domain}/blog/${p.slug}` : null;

	return (
		<section className="max-w-[860px]">
			<PageHead
				eyebrow={s.name}
				title={p.title}
				lede={
					<span className="inline-flex items-center gap-2.5 flex-wrap">
						<Pill value={p.status === 'published' ? 'done' : p.status === 'scheduled' ? 'in_progress' : 'not_started'}>{POST_STATUS_LABELS[p.status]}</Pill>
						{p.status === 'scheduled' && p.publish_at && <span>goes live {new Date(p.publish_at).toLocaleString('hu-HU', { dateStyle: 'medium', timeStyle: 'short', timeZone: s.timezone })}</span>}
						{p.status === 'published' && p.published_at && <span>live since {new Date(p.published_at).toLocaleDateString('hu-HU', { timeZone: s.timezone })}</span>}
						{liveUrl && <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-ink">{liveUrl} ↗</a>}
					</span>
				}
				actions={<Link href={`/cms/${s.id}#posts`} className={btnGhost}>← {s.name}</Link>}
			/>
			{error && <FormError>{error}</FormError>}

			<div className="mt-8 p-4 border border-line rounded-[14px] bg-paper flex items-center gap-3 flex-wrap">
				{p.status !== 'published' && <StatusButton postId={p.id} action="publish">Publish now</StatusButton>}
				<ScheduleForm postId={p.id} publishAt={p.publish_at} />
				{p.status !== 'draft' && (
					<StatusButton postId={p.id} action="draft" confirmText={p.status === 'published' ? 'Take this post off the live site? The site will be rebuilt.' : undefined}>
						{p.status === 'published' ? 'Unpublish' : 'Back to draft'}
					</StatusButton>
				)}
				<span className="ml-auto"><RemoveDraftButton postId={p.id} siteId={s.id} live={p.status === 'published'} /></span>
			</div>

			<div className="mt-10">
				<PostEditor post={{
					id: p.id, site_id: p.site_id, title: p.title, slug: p.slug, description: p.description, excerpt: p.excerpt,
					body_md: p.body_md, cover_image_url: p.cover_image_url, cover_alt: p.cover_alt, keywords: p.keywords,
				}} />
			</div>
		</section>
	);
}
