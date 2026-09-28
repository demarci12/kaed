import { createMutationRoute } from '@/lib/mutation-route';

/** Brings an archived idea back onto /business-ideas, at the bottom of the ranking. */
export const POST = createMutationRoute({
	ownerOnly: true,
	redirectTo: '/business-ideas',
	run: async ({ session, id }) => {
		const { data: last } = await session.supabase
			.from('business_ideas')
			.select('rank')
			.is('archived_at', null)
			.order('rank', { ascending: false })
			.limit(1)
			.maybeSingle();
		const rank = ((last?.rank as number | undefined) ?? -1) + 1;
		const { error } = await session.supabase
			.from('business_ideas')
			.update({ archived_at: null, rank })
			.eq('id', id);
		return { error: error?.message };
	},
});
