import { createMutationRoute } from '@/lib/mutation-route';

/** Hides an idea from /business-ideas without deleting it -- fields and any linked project stay intact. */
export const POST = createMutationRoute({
	ownerOnly: true,
	redirectTo: '/business-ideas',
	run: async ({ session, id }) => {
		const { error } = await session.supabase
			.from('business_ideas')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', id);
		return { error: error?.message };
	},
});
