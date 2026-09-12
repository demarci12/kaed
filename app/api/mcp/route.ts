import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

// Service-role key bypasses RLS, so operations are restricted to this known
// table set rather than allowing arbitrary/system table access.
const TABLES = [
	'projects',
	'project_logs',
	'open_points',
	'goals',
	'investments',
	'knowledge_cards',
	'clients',
	'client_notes',
	'business_ideas',
	'system_actors',
	'system_goals',
	'system_use_cases',
	'system_requirements',
	'finance_categories',
	'finance_transactions',
	'finance_budgets',
	'finance_limits',
	'think_pad_entries',
];

function assertTable(table: string) {
	if (!TABLES.includes(table)) {
		throw new Error(`Unknown table "${table}". Known tables: ${TABLES.join(', ')}`);
	}
}

const TOOLS = [
	{
		name: 'list_tables',
		description: 'List the tables available in the kead Supabase database.',
		inputSchema: { type: 'object', properties: {} },
	},
	{
		name: 'select_rows',
		description: 'Select rows from a kead table, with optional equality filters, ordering, and limit.',
		inputSchema: {
			type: 'object',
			properties: {
				table: { type: 'string', enum: TABLES },
				columns: { type: 'string', description: "Comma-separated columns, default '*'" },
				filters: { type: 'object', description: 'Column: value pairs matched with equality' },
				order_by: { type: 'string' },
				ascending: { type: 'boolean', default: true },
				limit: { type: 'number', default: 50 },
			},
			required: ['table'],
		},
	},
	{
		name: 'insert_row',
		description: 'Insert one row into a kead table. Returns the inserted row.',
		inputSchema: {
			type: 'object',
			properties: { table: { type: 'string', enum: TABLES }, values: { type: 'object' } },
			required: ['table', 'values'],
		},
	},
	{
		name: 'update_rows',
		description:
			'Update rows in a kead table matching equality filters. Filters are required to avoid accidental full-table updates.',
		inputSchema: {
			type: 'object',
			properties: {
				table: { type: 'string', enum: TABLES },
				filters: { type: 'object' },
				values: { type: 'object' },
			},
			required: ['table', 'filters', 'values'],
		},
	},
	{
		name: 'delete_rows',
		description:
			'Delete rows from a kead table matching equality filters. Filters are required to avoid accidental full-table deletes.',
		inputSchema: {
			type: 'object',
			properties: { table: { type: 'string', enum: TABLES }, filters: { type: 'object' } },
			required: ['table', 'filters'],
		},
	},
	{
		name: 'save_thought',
		description:
			"Save a thought, note, idea, or reflection to the user's Think Pad -- a running personal journal shown newest-first at kaed.hu/think-pad. Call this whenever the user asks you to save, jot down, log, or remember something as a thought/note, or wraps up a reflective conversation they want captured. Pass their words in `body`, close to verbatim -- don't summarize unless asked to. Add `title` only if a short one is natural; most thoughts don't need one.",
		inputSchema: {
			type: 'object',
			properties: {
				body: { type: 'string', description: 'The thought itself.' },
				title: { type: 'string', description: 'Optional short title.' },
			},
			required: ['body'],
		},
	},
];

function toolResult(data: unknown) {
	return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function toolError(message: string) {
	return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

interface ToolArgs {
	table?: string;
	columns?: string;
	filters?: Record<string, unknown>;
	values?: Record<string, unknown>;
	order_by?: string;
	ascending?: boolean;
	limit?: number;
	body?: string;
	title?: string;
}

/**
 * There's exactly one real owner account (the shared `member` role is
 * finance-only, same check as `isMember` in lib/auth.ts) -- looking it up here
 * means tools like `save_thought` never need the chat session to know or pass
 * a user id.
 */
async function getOwnerUserId(supabase: SupabaseClient): Promise<string> {
	const { data, error } = await supabase.auth.admin.listUsers();
	if (error) throw new Error(error.message);
	const owner = data.users.find((u) => u.user_metadata?.role !== 'member');
	if (!owner) throw new Error('No owner account found.');
	return owner.id;
}

async function callTool(name: string, args: ToolArgs) {
	const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

	try {
		switch (name) {
			case 'list_tables':
				return toolResult(TABLES);

			case 'select_rows': {
				assertTable(args.table!);
				let q = supabase.from(args.table!).select(args.columns || '*');
				if (args.filters) q = q.match(args.filters);
				if (args.order_by) q = q.order(args.order_by, { ascending: args.ascending ?? true });
				q = q.limit(args.limit ?? 50);
				const { data, error } = await q;
				if (error) return toolError(error.message);
				return toolResult(data);
			}

			case 'insert_row': {
				assertTable(args.table!);
				const { data, error } = await supabase.from(args.table!).insert(args.values ?? {}).select();
				if (error) return toolError(error.message);
				return toolResult(data);
			}

			case 'update_rows': {
				assertTable(args.table!);
				if (!args.filters || Object.keys(args.filters).length === 0)
					return toolError('filters must be a non-empty object');
				const { data, error } = await supabase.from(args.table!).update(args.values ?? {}).match(args.filters).select();
				if (error) return toolError(error.message);
				return toolResult(data);
			}

			case 'delete_rows': {
				assertTable(args.table!);
				if (!args.filters || Object.keys(args.filters).length === 0)
					return toolError('filters must be a non-empty object');
				const { data, error } = await supabase.from(args.table!).delete().match(args.filters).select();
				if (error) return toolError(error.message);
				return toolResult(data);
			}

			case 'save_thought': {
				const body = (args.body ?? '').trim();
				if (!body) return toolError('body is required.');
				const user_id = await getOwnerUserId(supabase);
				const { data, error } = await supabase
					.from('think_pad_entries')
					.insert({ user_id, body, title: args.title?.trim() || null, source: 'mcp' })
					.select();
				if (error) return toolError(error.message);
				return toolResult(data);
			}

			default:
				return toolError(`Unknown tool: ${name}`);
		}
	} catch (err) {
		return toolError(err instanceof Error ? err.message : String(err));
	}
}

function jsonRpcResult(id: unknown, result: unknown) {
	return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id: unknown, code: number, message: string) {
	return { jsonrpc: '2.0', id, error: { code, message } };
}

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

interface JsonRpcRequest {
	id?: unknown;
	method?: string;
	params?: { name?: string; arguments?: ToolArgs };
}

export async function POST(request: Request) {
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
		return json({ error: 'Supabase is not configured.' }, 500);
	}
	if (!MCP_AUTH_TOKEN) {
		return json({ error: 'MCP_AUTH_TOKEN is not configured.' }, 500);
	}

	const authHeader = request.headers.get('Authorization') ?? '';
	const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
	const queryToken = new URL(request.url).searchParams.get('token') ?? '';
	const token = headerToken || queryToken;
	if (token !== MCP_AUTH_TOKEN) {
		return json({ error: 'Unauthorized' }, 401);
	}

	let body: JsonRpcRequest;
	try {
		body = (await request.json()) as JsonRpcRequest;
	} catch {
		return json(jsonRpcError(null, -32700, 'Parse error'), 400);
	}

	const { id, method, params } = body ?? {};

	switch (method) {
		case 'initialize':
			return json(
				jsonRpcResult(id, {
					protocolVersion: '2024-11-05',
					capabilities: { tools: {} },
					serverInfo: { name: 'kead-mcp', version: '0.0.1' },
				}),
			);

		case 'notifications/initialized':
			return new Response(null, { status: 202 });

		case 'tools/list':
			return json(jsonRpcResult(id, { tools: TOOLS }));

		case 'tools/call': {
			const result = await callTool(params?.name ?? '', params?.arguments ?? {});
			return json(jsonRpcResult(id, result));
		}

		case 'ping':
			return json(jsonRpcResult(id, {}));

		default:
			return json(jsonRpcError(id, -32601, `Method not found: ${method}`), 404);
	}
}
