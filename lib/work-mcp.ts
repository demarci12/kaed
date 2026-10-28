import type { SupabaseClient } from '@supabase/supabase-js';
import { jiraAddComment, jiraConfig, jiraGetIssue, jiraLogWork, jiraMyself, jiraPush, jiraTransition, type JiraPush } from './jira';
import {
	cleanTask, formatHours, LIMITS, parseHours, STATUS_LABELS, TASK_STATUSES, todayInBudapest, type TaskStatus, type WorkTask,
} from './work';

// Work (/work) tools for the remote MCP endpoint (app/api/mcp/route.ts): lets a
// chat or a scheduled Claude run read the ticket list, comment, log hours and
// move tickets along -- in particular `work_daily_update`, which applies a whole
// day's notes (typically parsed from a plain text file) in one call. Server-only;
// the local stdio server only gets raw table access to the work_* tables.

const ticketProp = {
	type: 'string',
	description: 'The ticket: its Jira key (e.g. "KB-123", case-insensitive) or its row number in the list ("12" or "#12").',
};
const jiraProp = {
	type: 'boolean',
	description: 'Also write this to the ticket in Jira (needs the Jira connection and a Jira key on the row). Default false: Jira is only touched when you ask.',
};
const fieldProps = {
	title: { type: 'string', description: 'The topic / Jira summary.' },
	jira_key: { type: 'string', description: 'Jira key, e.g. KB-123. Empty string clears it.' },
	description: { type: 'string', description: 'Full description (plain text / Markdown). Replaces the old one.' },
	responsible: { type: 'string' },
	status: { type: 'string', enum: [...TASK_STATUSES], description: 'todo, doing (in progress), blocked or done.' },
	priority: { type: 'string', enum: ['high', 'medium', 'low'] },
	due_on: { type: 'string', description: 'YYYY-MM-DD. Empty string clears it.' },
};

export const WORK_TOOLS = [
	{
		name: 'work_list_tasks',
		description: 'List the user\'s Knorr-Bremse work tickets (the OPL table on kaed.hu/work): row number, Jira key, topic, responsible, status, priority, due date, hours logged and the latest comment. Default is everything not done.',
		inputSchema: {
			type: 'object',
			properties: {
				status: { type: 'string', enum: ['open', 'all', ...TASK_STATUSES], description: '"open" (default) = not done.' },
				query: { type: 'string', description: 'Only tickets whose key, topic or responsible contains this text.' },
				limit: { type: 'number', default: 100 },
			},
		},
	},
	{
		name: 'work_get_task',
		description: 'One ticket in full: description, every comment (newest first) and the whole time log.',
		inputSchema: { type: 'object', properties: { ticket: ticketProp }, required: ['ticket'] },
	},
	{
		name: 'work_create_task',
		description: 'Add a ticket row. Give the Jira key when there is one, so later updates and pastes from Jira line up with it.',
		inputSchema: { type: 'object', properties: fieldProps, required: ['title'] },
	},
	{
		name: 'work_update_task',
		description: 'Edit a ticket: any of topic, Jira key, description, responsible, status, priority, due date. Only the fields you pass change. With jira=true and a status, the Jira ticket is moved to the matching status too.',
		inputSchema: { type: 'object', properties: { ticket: ticketProp, ...fieldProps, jira: jiraProp }, required: ['ticket'] },
	},
	{
		name: 'work_add_comment',
		description: 'Add a comment to a ticket (a status update, a decision, what you are waiting for). Comments are a dated history; they are never edited, only added.',
		inputSchema: { type: 'object', properties: { ticket: ticketProp, body: { type: 'string' }, jira: jiraProp }, required: ['ticket', 'body'] },
	},
	{
		name: 'work_log_time',
		description: 'Log time against a ticket. `hours` may be a number or text like "1.5", "90m", "1h30". `date` is YYYY-MM-DD, default today (Budapest).',
		inputSchema: {
			type: 'object',
			properties: { ticket: ticketProp, hours: { type: ['number', 'string'] }, date: { type: 'string' }, note: { type: 'string', description: 'What the time was spent on.' }, jira: jiraProp },
			required: ['ticket', 'hours'],
		},
	},
	{
		name: 'work_daily_update',
		description: 'Apply a whole day\'s notes in one call -- the tool for "log my day from this text file". Each entry names a ticket and may carry hours, a comment, a new status and a new description. Safe to run twice: an identical comment or time entry already logged for that ticket that day is skipped, not doubled. Returns one result per entry.',
		inputSchema: {
			type: 'object',
			properties: {
				date: { type: 'string', description: 'The day the notes are about, YYYY-MM-DD. Default today (Budapest).' },
				jira: jiraProp,
				entries: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							ticket: ticketProp,
							hours: { type: ['number', 'string'], description: 'Time to log for this ticket on that day.' },
							note: { type: 'string', description: 'What the logged time was spent on (short).' },
							comment: { type: 'string', description: 'Status comment to add to the ticket.' },
							status: fieldProps.status,
							description: fieldProps.description,
						},
						required: ['ticket'],
					},
				},
			},
			required: ['entries'],
		},
	},
	{
		name: 'work_pull_from_jira',
		description: 'READ from Jira: fetch a ticket\'s title and description and store them on its Work row (the row is created if the Jira key is not on the list yet). Needs the Jira connection.',
		inputSchema: { type: 'object', properties: { ticket: { ...ticketProp, description: 'The Jira key (e.g. "KB-123"), or the row number of a row that already has a key.' } }, required: ['ticket'] },
	},
	{
		name: 'work_jira_test',
		description: 'Check the Jira connection: whether it is set up, whether the server can reach it, and whose token it is.',
		inputSchema: { type: 'object', properties: {} },
	},
];

export const WORK_TOOL_NAMES = WORK_TOOLS.map((t) => t.name);

export interface WorkToolArgs {
	ticket?: string;
	title?: string;
	jira_key?: string;
	description?: string;
	responsible?: string;
	status?: string;
	priority?: string;
	due_on?: string;
	query?: string;
	limit?: number;
	body?: string;
	hours?: number | string;
	date?: string;
	note?: string;
	jira?: boolean;
	entries?: { ticket?: string; hours?: number | string; note?: string; comment?: string; status?: string; description?: string }[];
}

type Db = SupabaseClient;

async function ownerId(db: Db): Promise<string> {
	const { data, error } = await db.auth.admin.listUsers();
	if (error) throw new Error(error.message);
	const owner = data.users.find((u) => u.user_metadata?.role !== 'member');
	if (!owner) throw new Error('No owner account found.');
	return owner.id;
}

async function findTask(db: Db, ticket: string | undefined): Promise<WorkTask> {
	const t = (ticket ?? '').trim();
	if (!t) throw new Error('ticket is required (a Jira key like KB-123, or a row number).');
	const q = db.from('work_tasks').select('*');
	const { data, error } = /^#?\d+$/.test(t) ? await q.eq('no', Number(t.replace('#', ''))).maybeSingle() : await q.eq('jira_key', t.toUpperCase()).maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) throw new Error(`No ticket "${t}". Use work_list_tasks to see the keys and row numbers.`);
	return data as WorkTask;
}

const view = (t: WorkTask, extra: Record<string, unknown> = {}) => ({
	no: t.no, jira_key: t.jira_key, title: t.title, responsible: t.responsible, status: t.status, priority: t.priority, due_on: t.due_on, ...extra,
});

const jiraNote = (r: JiraPush) => (r.ok ? { jira: 'ok', detail: r.note } : { jira: r.skipped ? 'skipped' : 'failed', detail: r.error });

async function moveInJira(task: WorkTask, status: TaskStatus): Promise<JiraPush> {
	return jiraPush(task.jira_key, async (cfg, key) => {
		const move = await jiraTransition(cfg, key, status);
		return move.changed ? `${key} moved ${move.from} → ${move.to}` : `${key} is already ${STATUS_LABELS[status]} in Jira`;
	});
}

function dayOf(date: string | undefined): string {
	const d = (date ?? '').trim() || todayInBudapest();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) throw new Error('date looks like 2026-10-28.');
	return d;
}

/** When a comment for `day` counts as written: now for today, noon UTC for any other day. */
const commentTime = (day: string) => (day === todayInBudapest() ? new Date() : new Date(`${day}T12:00:00Z`));

async function addComment(db: Db, userId: string, task: WorkTask, text: string, day: string): Promise<'added' | 'duplicate'> {
	const body = text.trim();
	if (!body) throw new Error('The comment is empty.');
	if (body.length > LIMITS.comment) throw new Error(`A comment is ${LIMITS.comment} characters at most.`);
	const at = commentTime(day);
	const lo = new Date(at.getTime() - 18 * 3600_000).toISOString();
	const hi = new Date(at.getTime() + 18 * 3600_000).toISOString();
	const { data: same } = await db.from('work_comments').select('id').eq('task_id', task.id).eq('source', 'claude').eq('body', body).gte('created_at', lo).lte('created_at', hi).limit(1);
	if (same?.length) return 'duplicate';
	const { error } = await db.from('work_comments').insert({ user_id: userId, task_id: task.id, body, source: 'claude', created_at: at.toISOString() });
	if (error) throw new Error(error.message);
	return 'added';
}

async function logTime(db: Db, userId: string, task: WorkTask, hoursIn: number | string, day: string, noteIn?: string): Promise<'logged' | 'duplicate'> {
	const hours = parseHours(hoursIn);
	if (hours === null) throw new Error(`"${hoursIn}" is not a duration (try 1.5, 90m or 1h30; up to 24h).`);
	const note = (noteIn ?? '').trim().slice(0, LIMITS.note) || null;
	let q = db.from('work_logs').select('id').eq('task_id', task.id).eq('source', 'claude').eq('logged_on', day).eq('hours', hours);
	q = note ? q.eq('note', note) : q.is('note', null);
	const { data: same } = await q.limit(1);
	if (same?.length) return 'duplicate';
	const { error } = await db.from('work_logs').insert({ user_id: userId, task_id: task.id, logged_on: day, hours, note, source: 'claude' });
	if (error) throw new Error(error.message);
	return 'logged';
}

async function patchTask(db: Db, task: WorkTask, fields: Record<string, unknown>): Promise<string[]> {
	const cleaned = cleanTask(fields, { requireTitle: false });
	if (!cleaned.ok) throw new Error(cleaned.error);
	const keys = Object.keys(cleaned.value).filter((k) => k !== 'done_at');
	if (!keys.length) return [];
	const { error } = await db.from('work_tasks').update({ ...cleaned.value, updated_at: new Date().toISOString() }).eq('id', task.id);
	if (error) throw new Error(error.code === '23505' ? 'That Jira key is already on another row.' : error.message);
	return keys;
}

export async function callWorkTool(db: Db, name: string, args: WorkToolArgs) {
	switch (name) {
		case 'work_list_tasks': {
			const status = args.status ?? 'open';
			let q = db.from('work_tasks').select('*').order('no', { ascending: true });
			if (status === 'open') q = q.neq('status', 'done');
			else if (status !== 'all') q = q.eq('status', status);
			const { data, error } = await q;
			if (error) throw new Error(error.message);
			let tasks = (data ?? []) as WorkTask[];
			const needle = (args.query ?? '').trim().toLowerCase();
			if (needle) tasks = tasks.filter((t) => [t.jira_key, t.title, t.responsible].some((v) => (v ?? '').toLowerCase().includes(needle)));
			tasks = tasks.slice(0, Math.min(Math.max(args.limit ?? 100, 1), 500));
			const { data: stats } = await db.from('work_task_stats').select('*');
			const byTask = new Map((stats ?? []).map((s) => [s.task_id as string, s]));
			return tasks.map((t) => {
				const s = byTask.get(t.id);
				return view(t, { hours: Number(s?.hours ?? 0), comments: Number(s?.comment_count ?? 0), last_comment: s?.last_comment ?? null });
			});
		}

		case 'work_get_task': {
			const task = await findTask(db, args.ticket);
			const [{ data: comments }, { data: logs }] = await Promise.all([
				db.from('work_comments').select('body, source, created_at').eq('task_id', task.id).order('created_at', { ascending: false }),
				db.from('work_logs').select('logged_on, hours, note, source').eq('task_id', task.id).order('logged_on', { ascending: false }),
			]);
			const total = (logs ?? []).reduce((a, l) => a + Number(l.hours), 0);
			return { ...view(task), description: task.description, done_at: task.done_at, hours_total: Math.round(total * 100) / 100, comments: comments ?? [], time_log: (logs ?? []).map((l) => ({ ...l, hours: Number(l.hours) })) };
		}

		case 'work_create_task': {
			const cleaned = cleanTask({ ...args } as Record<string, unknown>, { requireTitle: true });
			if (!cleaned.ok) throw new Error(cleaned.error);
			const user_id = await ownerId(db);
			const { data, error } = await db.from('work_tasks').insert({ user_id, ...cleaned.value }).select('*').single();
			if (error) throw new Error(error.code === '23505' ? 'That Jira key is already on another row.' : error.message);
			return view(data as WorkTask);
		}

		case 'work_update_task': {
			const task = await findTask(db, args.ticket);
			const { ticket: _t, ...fields } = args;
			const changed = await patchTask(db, task, fields as Record<string, unknown>);
			if (!changed.length) throw new Error('Nothing to change: pass at least one field besides ticket.');
			const fresh = await findTask(db, String(task.no));
			const move = args.jira && args.status ? jiraNote(await moveInJira(fresh, args.status as TaskStatus)) : undefined;
			return { changed, ticket: view(fresh), ...(move ? { jira_result: move } : {}) };
		}

		case 'work_add_comment': {
			const task = await findTask(db, args.ticket);
			const text = args.body ?? '';
			const result = await addComment(db, await ownerId(db), task, text, todayInBudapest());
			const posted = args.jira && result === 'added'
				? jiraNote(await jiraPush(task.jira_key, async (cfg, key) => { await jiraAddComment(cfg, key, text.trim()); return `comment posted to ${key}`; }))
				: undefined;
			return { ticket: view(task), comment: result, ...(posted ? { jira_result: posted } : {}) };
		}

		case 'work_log_time': {
			const task = await findTask(db, args.ticket);
			const day = dayOf(args.date);
			const result = await logTime(db, await ownerId(db), task, args.hours ?? '', day, args.note);
			const hours = parseHours(args.hours ?? '') ?? 0;
			const posted = args.jira && result === 'logged'
				? jiraNote(await jiraPush(task.jira_key, async (cfg, key) => { await jiraLogWork(cfg, key, hours, day, args.note?.trim() || null); return `${formatHours(hours)} logged on ${key}`; }))
				: undefined;
			return { ticket: view(task), time: result, ...(posted ? { jira_result: posted } : {}) };
		}

		case 'work_daily_update': {
			if (!Array.isArray(args.entries) || !args.entries.length) throw new Error('entries is required (one per ticket worked on).');
			const day = dayOf(args.date);
			const userId = await ownerId(db);
			const results: Record<string, unknown>[] = [];
			let totalHours = 0;
			for (const entry of args.entries) {
				const label = entry.ticket ?? '(no ticket)';
				const applied: string[] = [];
				const skipped: string[] = [];
				const jiraLines: string[] = [];
				const toJira = (what: string, r: JiraPush) => jiraLines.push(r.ok ? `✓ ${r.note}` : `✗ ${what}: ${r.error}`);
				try {
					const task = await findTask(db, entry.ticket);
					const fields: Record<string, unknown> = {};
					if (entry.status !== undefined) {
						if (entry.status === task.status) skipped.push(`already ${STATUS_LABELS[task.status]}`); else fields.status = entry.status;
					}
					if (entry.description !== undefined) {
						if (entry.description.trim() === (task.description ?? '').trim()) skipped.push('description unchanged'); else fields.description = entry.description;
					}
					if (Object.keys(fields).length) {
						for (const k of await patchTask(db, task, fields)) applied.push(k === 'status' ? `status → ${STATUS_LABELS[entry.status as keyof typeof STATUS_LABELS] ?? entry.status}` : k);
					}
					if (args.jira && entry.status !== undefined) toJira('status', await moveInJira(task, entry.status as TaskStatus));
					if (entry.hours !== undefined && entry.hours !== '') {
						const r = await logTime(db, userId, task, entry.hours, day, entry.note);
						const h = parseHours(entry.hours) ?? 0;
						if (r === 'logged') {
							applied.push(`logged ${formatHours(h)}`);
							totalHours += h;
							if (args.jira) toJira('time', await jiraPush(task.jira_key, async (cfg, key) => { await jiraLogWork(cfg, key, h, day, entry.note?.trim() || null); return `${formatHours(h)} logged on ${key}`; }));
						} else skipped.push(`${formatHours(h)} already logged`);
					}
					if (entry.comment?.trim()) {
						const r = await addComment(db, userId, task, entry.comment, day);
						if (r === 'added') {
							applied.push('comment');
							if (args.jira) toJira('comment', await jiraPush(task.jira_key, async (cfg, key) => { await jiraAddComment(cfg, key, entry.comment!.trim()); return `comment posted to ${key}`; }));
						} else skipped.push('same comment already there');
					}
					results.push({ ticket: task.jira_key ?? `#${task.no}`, ok: true, applied, skipped, ...(args.jira ? { jira: jiraLines } : {}) });
				} catch (e) {
					results.push({ ticket: label, ok: false, error: e instanceof Error ? e.message : String(e), applied, skipped, ...(jiraLines.length ? { jira: jiraLines } : {}) });
				}
			}
			return { date: day, hours_logged: Math.round(totalHours * 100) / 100, results };
		}

		case 'work_pull_from_jira': {
			const cfg = jiraConfig();
			if (!cfg) throw new Error('Jira is not connected yet (the JIRA_* settings are missing).');
			const ref = (args.ticket ?? '').trim();
			let existing: WorkTask | null = null;
			let key: string;
			if (/^#?\d+$/.test(ref)) {
				existing = await findTask(db, ref);
				if (!existing.jira_key) throw new Error(`Row ${ref} has no Jira key to read from.`);
				key = existing.jira_key;
			} else {
				key = ref.toUpperCase();
				const { data } = await db.from('work_tasks').select('*').eq('jira_key', key).maybeSingle();
				existing = (data as WorkTask | null) ?? null;
			}
			const issue = await jiraGetIssue(cfg, key);
			const title = issue.title.slice(0, LIMITS.title);
			const description = issue.description.slice(0, LIMITS.description) || null;
			if (existing) {
				const { error } = await db.from('work_tasks').update({ ...(title ? { title } : {}), description, updated_at: new Date().toISOString() }).eq('id', existing.id);
				if (error) throw new Error(error.message);
				return { created: false, ticket: view({ ...existing, title: title || existing.title }), jira_status: issue.status, description };
			}
			const { data, error } = await db.from('work_tasks').insert({ user_id: await ownerId(db), jira_key: issue.key, title: title || issue.key, description }).select('*').single();
			if (error) throw new Error(error.message);
			return { created: true, ticket: view(data as WorkTask), jira_status: issue.status, description };
		}

		case 'work_jira_test': {
			const cfg = jiraConfig();
			if (!cfg) return { configured: false, hint: 'Set JIRA_BASE_URL plus JIRA_EMAIL + JIRA_API_TOKEN (Cloud) or JIRA_PAT (company-hosted) on the server.' };
			try {
				return { configured: true, reachable: true, host: cfg.host, user: (await jiraMyself(cfg)).name };
			} catch (e) {
				return { configured: true, reachable: false, host: cfg.host, error: e instanceof Error ? e.message : String(e) };
			}
		}

		default:
			throw new Error(`Unknown tool: ${name}`);
	}
}
