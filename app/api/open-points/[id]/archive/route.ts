import { createMutationRoute } from '@/lib/mutation-route';

/** Hides an item from /opl without deleting it -- notes and status history stay intact. */
export const POST = createMutationRoute({
	ownerOnly: true,
	redirectTo: '/opl',
	run: async ({ session, id }) => {
		const { error } = await session.supabase
			.from('open_points')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', id);
		return { error: error?.message };
	},
});
