import { createMutationRoute } from '@/lib/mutation-route';

/** Brings an archived item back onto /opl. */
export const POST = createMutationRoute({
	ownerOnly: true,
	// The archive list restores via fetch (JSON, ignores this); a plain form
	// POST only comes from the item's own page, where /opl is the right landing.
	redirectTo: '/opl',
	run: async ({ session, id }) => {
		const { error } = await session.supabase.from('open_points').update({ archived_at: null }).eq('id', id);
		return { error: error?.message };
	},
});
