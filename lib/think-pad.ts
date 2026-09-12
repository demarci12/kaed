/** Where a line came from -- typed in the app, or appended by Claude via the
 *  remote MCP endpoint's `save_thought` tool. */
export type ThinkPadSource = 'app' | 'mcp';

export interface ThinkPadPage {
	id: string;
	user_id: string;
	title: string;
	search_text: string;
	created_at: string;
	updated_at: string;
}

/** One line/block of a page's document. `position` is a float used for
 *  midpoint insertion -- see supabase/schema.sql. */
export interface ThinkPadEntry {
	id: string;
	page_id: string;
	user_id: string;
	body: string;
	position: number;
	source: ThinkPadSource;
	created_at: string;
	updated_at: string;
}

export type ThinkPadColumnType = 'text' | 'number' | 'date' | 'select';

export interface ThinkPadColumn {
	name: string;
	type: ThinkPadColumnType;
	options?: string[];
}

export interface ThinkPadTable {
	id: string;
	page_id: string;
	name: string;
	columns: ThinkPadColumn[];
}

export interface ThinkPadTableRow {
	id: string;
	table_id: string;
	position: number;
	data: Record<string, string>;
}
