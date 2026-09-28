import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { fireDeployHook, type CmsSite } from '@/lib/cms';

/**
 * Moves a post between draft / scheduled / published (form POST, 303 back to
 * the editor). Publishing or unpublishing something that is live fires the
 * site's deploy hook so the change reaches the static site.
 *   action=publish   → live now
 *   action=schedule  → publish_at (ISO, from the datetime input) becomes the go-live time
 *   action=draft     → back to draft (and off the site if it was live)
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase } = session;
	const { id } = await params;

	const form = await request.formData();
	const action = String(form.get('action') ?? '');
	const publishAtRaw = String(form.get('publish_at') ?? '');

	const { data: post } = await supabase.from('cms_posts').select('id, site_id, status, title, body_md').eq('id', id).maybeSingle();
	const back = (query = '') =>
		NextResponse.redirect(new URL(`/cms/${post?.site_id ?? ''}/posts/${id}${query}`, request.url), { status: 303 });
	if (!post) return NextResponse.redirect(new URL('/cms', request.url), { status: 303 });

	const now = new Date();
	const update: Record<string, unknown> = { updated_at: now.toISOString() };
	if (action === 'publish') {
		if (!post.body_md?.trim()) return back('?error=Write some text before publishing.');
		Object.assign(update, { status: 'published', published_at: now.toISOString(), publish_at: now.toISOString() });
	} else if (action === 'schedule') {
		const when = new Date(publishAtRaw);
		if (!publishAtRaw || Number.isNaN(when.getTime())) return back('?error=Pick a date and time to schedule.');
		if (!post.body_md?.trim()) return back('?error=Write some text before scheduling.');
		Object.assign(update, { status: 'scheduled', publish_at: when.toISOString(), published_at: null });
	} else if (action === 'draft') {
		Object.assign(update, { status: 'draft', published_at: null });
	} else {
		return back('?error=Unknown action.');
	}

	const { error } = await supabase.from('cms_posts').update(update).eq('id', id);
	if (error) return back(`?error=${encodeURIComponent(error.message)}`);

	// Something went live or came down: tell the site to rebuild.
	if (action === 'publish' || (action === 'draft' && post.status === 'published')) {
		const { data: site } = await supabase.from('cms_sites').select('deploy_hook_url').eq('id', post.site_id).maybeSingle();
		if (site) {
			const hook = await fireDeployHook(site as Pick<CmsSite, 'deploy_hook_url'>);
			if (!hook.ok) return back(`?error=${encodeURIComponent(`Saved, but the site was not rebuilt: ${hook.error}`)}`);
		}
	}
	return back();
}
