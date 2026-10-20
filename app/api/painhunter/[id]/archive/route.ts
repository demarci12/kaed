import { createMutationRoute } from '@/lib/mutation-route';

/** Hides a pain from /painhunter without deleting it -- scores and idea links stay intact. */
export const POST = createMutationRoute({
	ownerOnly: true,
	redirectTo: '/painhunter',
	run: async ({ session, id }) => {
		const { error } = await session.supabase
			.from('pain_points')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', id);
		return { error: error?.message };
	},
});
