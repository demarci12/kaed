import { createMutationRoute } from '@/lib/mutation-route';
import { fireDeployHook, type CmsSite } from '@/lib/cms';

/** Deletes a post; if it was live, the site is asked to rebuild so it disappears. */
export const POST = createMutationRoute({
	ownerOnly: true,
	redirectTo: '/cms',
	run: async ({ session, id }) => {
		const { data: post } = await session.supabase.from('cms_posts').select('site_id, status').eq('id', id).maybeSingle();
		const { error } = await session.supabase.from('cms_posts').delete().eq('id', id);
		if (error) return { error: error.message };
		if (post?.status === 'published') {
			const { data: site } = await session.supabase.from('cms_sites').select('deploy_hook_url').eq('id', post.site_id).maybeSingle();
			if (site) await fireDeployHook(site as Pick<CmsSite, 'deploy_hook_url'>);
		}
		return { redirectTo: post ? `/cms/${post.site_id}` : '/cms' };
	},
});
