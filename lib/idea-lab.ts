// No `export { requireOwner } from './auth'` here on purpose: auth.ts pulls
// in lib/supabase.ts, which imports next/headers -- a server-only chain that
// broke the build once already when this module got imported somewhere it
// didn't belong. Pages and routes import requireOwner/getOwnerSession from
// '@/lib/auth' directly.

/**
 * The single, permanent Idea Lab row -- one per user. `thinking` is the
 * free-form thinking space shown above the playbook. The old 11-step columns
 * (background, personal_pain, money_evidence, ...) still exist in the table
 * but nothing reads or writes them any more; their text was folded into
 * `thinking` when the steps were retired. idea_lab_evidence / idea_candidates
 * are likewise dormant.
 */
export interface IdeaLabWorksheet {
	id: string;
	user_id: string;
	thinking: string | null;
	created_at: string;
	updated_at: string;
}
