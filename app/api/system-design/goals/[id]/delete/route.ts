import { createMutationRoute } from '@/lib/mutation-route';

export const POST = createMutationRoute({
	ownerOnly: true,
	redirectTo: '/system-design',
	run: async ({ session, id }) => {
		const { supabase } = session;
		const { data: row } = await supabase.from('system_goals').select('project_id').eq('id', id).maybeSingle();
		const { error } = await supabase.from('system_goals').delete().eq('id', id);
		return {
			error: error?.message,
			redirectTo: row?.project_id ? `/system-design/${row.project_id}` : '/system-design',
		};
	},
});
