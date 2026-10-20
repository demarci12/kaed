import { createMutationRoute } from '@/lib/mutation-route';

/** Brings an archived pain back onto /painhunter. */
export const POST = createMutationRoute({
	ownerOnly: true,
	redirectTo: '/painhunter',
	run: async ({ session, id }) => {
		const { error } = await session.supabase.from('pain_points').update({ archived_at: null }).eq('id', id);
		return { error: error?.message };
	},
});
