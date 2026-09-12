/** Where an entry came from -- written in the app, or dictated to Claude via
 *  the remote MCP endpoint's `save_thought` tool. */
export type ThinkPadSource = 'app' | 'mcp';

export interface ThinkPadEntry {
	id: string;
	user_id: string;
	title: string | null;
	body: string;
	source: ThinkPadSource;
	created_at: string;
	updated_at: string;
}
