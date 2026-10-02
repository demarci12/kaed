import { createMutationRoute } from '@/lib/mutation-route';
import { serviceClient } from '@/lib/cms';
import { deleteSession } from '@/lib/enable-banking';

export const dynamic = 'force-dynamic';

/** Revokes the bank session (best effort) and deletes the connection and its imported bank rows. */
export const POST = createMutationRoute({
	ownerOnly: true,
	redirectTo: '/finance/banks',
	run: async ({ session, id }) => {
		const db = serviceClient();
		const { data } = await db.from('bank_connections').select('session_id').eq('id', id).eq('user_id', session.user.id).maybeSingle();
		if (!data) return { error: 'Connection not found.' };
		if (data.session_id) await deleteSession(data.session_id as string).catch(() => {});
		const { error } = await db.from('bank_connections').delete().eq('id', id);
		return { error: error?.message };
	},
});
