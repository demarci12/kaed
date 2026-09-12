/** Where a line came from -- typed in the app, or appended by Claude via the
 *  remote MCP endpoint's `save_thought` tool. */
export type ThinkPadSource = 'app' | 'mcp';

/** One line/block of the Think Pad document. `position` is a float used for
 *  midpoint insertion -- see supabase/schema.sql. */
export interface ThinkPadEntry {
	id: string;
	user_id: string;
	body: string;
	position: number;
	source: ThinkPadSource;
	created_at: string;
	updated_at: string;
}
