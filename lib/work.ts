/**
 * Work (/work): the day-to-day task list as an open point list -- one row per
 * Jira ticket or action, edited like a spreadsheet. Shared by the page, the
 * grid, the API routes and the paste-in importer so they cannot disagree about
 * what a valid row is.
 */

export const TASK_STATUSES = ['todo', 'doing', 'blocked', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
	todo: 'To do', doing: 'In progress', blocked: 'Blocked', done: 'Done',
};

export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const PRIORITY_LABELS: Record<TaskPriority, string> = { high: 'High', medium: 'Medium', low: 'Low' };

export interface WorkTask {
	id: string;
	/** Stable running number (the OPL "No." column). */
	no: number;
	jira_key: string | null;
	title: string;
	responsible: string | null;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority;
	/** YYYY-MM-DD */
	due_on: string | null;
	done_at: string | null;
	created_at: string;
	updated_at: string;
}

/** A ticket row as the grid shows it: the task plus what its comments and time log add up to. */
export interface WorkTaskRow extends WorkTask {
	comment_count: number;
	last_comment: string | null;
	last_comment_at: string | null;
	/** Total hours logged against the ticket. */
	hours: number;
}

export type CommentSource = 'app' | 'claude' | 'import';

export interface WorkComment {
	id: string;
	task_id: string;
	body: string;
	source: CommentSource;
	created_at: string;
}

export interface WorkLog {
	id: string;
	task_id: string;
	/** YYYY-MM-DD */
	logged_on: string;
	hours: number;
	note: string | null;
	source: CommentSource;
	created_at: string;
}

export const LIMITS = { jira_key: 40, title: 300, responsible: 80, description: 20000, comment: 4000, note: 300 } as const;

/** The task fields a client may write; everything else is the server's. */
export const EDITABLE_FIELDS = ['jira_key', 'title', 'responsible', 'description', 'status', 'priority', 'due_on'] as const;

export const JIRA_KEY = /^[A-Z][A-Z0-9_]+-\d+$/;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type Cleaned = { ok: true; value: Record<string, unknown> } | { ok: false; error: string };

/**
 * Validates the writable fields present in `input` and returns the column
 * values to write. Only keys that are present are returned, so a patch never
 * clobbers a column it did not mention. Setting `status` also settles `done_at`.
 */
export function cleanTask(input: Record<string, unknown>, opts: { requireTitle: boolean }): Cleaned {
	const value: Record<string, unknown> = {};
	const text = (key: 'jira_key' | 'title' | 'responsible' | 'description', _label: string): string | null | undefined | 'invalid' => {
		if (!(key in input)) return undefined;
		const raw = input[key];
		if (raw !== null && typeof raw !== 'string') return 'invalid';
		const s = (raw ?? '').trim();
		if (s.length > LIMITS[key]) return 'invalid';
		return s || null;
	};

	const jira = text('jira_key', 'Jira key');
	if (jira === 'invalid') return { ok: false, error: `A Jira key is ${LIMITS.jira_key} characters at most.` };
	if (jira !== undefined) value.jira_key = jira ? jira.toUpperCase() : null;

	const title = text('title', 'Topic');
	if (title === 'invalid') return { ok: false, error: `A topic is ${LIMITS.title} characters at most.` };
	if (title !== undefined) {
		if (!title) return { ok: false, error: 'A row needs a topic.' };
		value.title = title;
	} else if (opts.requireTitle) {
		return { ok: false, error: 'A row needs a topic.' };
	}

	const responsible = text('responsible', 'Responsible');
	if (responsible === 'invalid') return { ok: false, error: `Responsible is ${LIMITS.responsible} characters at most.` };
	if (responsible !== undefined) value.responsible = responsible;

	const description = text('description', 'Description');
	if (description === 'invalid') return { ok: false, error: `A description is ${LIMITS.description} characters at most.` };
	if (description !== undefined) value.description = description;

	if ('status' in input) {
		if (typeof input.status !== 'string' || !(TASK_STATUSES as readonly string[]).includes(input.status)) return { ok: false, error: 'Invalid status.' };
		value.status = input.status;
		value.done_at = input.status === 'done' ? new Date().toISOString() : null;
	}
	if ('priority' in input) {
		if (typeof input.priority !== 'string' || !(TASK_PRIORITIES as readonly string[]).includes(input.priority)) return { ok: false, error: 'Invalid priority.' };
		value.priority = input.priority;
	}
	if ('due_on' in input) {
		const d = input.due_on;
		if (d === null || d === '') value.due_on = null;
		else if (typeof d === 'string' && DATE.test(d) && !Number.isNaN(Date.parse(d))) value.due_on = d;
		else return { ok: false, error: 'A due date looks like 2026-10-28.' };
	}

	return { ok: true, value };
}

/** Today as YYYY-MM-DD in Budapest, so a late-evening log lands on the right day. */
export function todayInBudapest(): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest' }).format(new Date());
}

/** Monday of the week containing `iso` (YYYY-MM-DD). */
export function weekStart(iso: string): string {
	const d = new Date(`${iso}T12:00:00Z`);
	const back = (d.getUTCDay() + 6) % 7;
	d.setUTCDate(d.getUTCDate() - back);
	return d.toISOString().slice(0, 10);
}

/**
 * Hours from what a person types: "1.5", "1,5", "90m", "1h30", "1h 30m", "1:30".
 * Null when it isn't a duration between a minute and 24 hours.
 */
export function parseHours(input: unknown): number | null {
	if (typeof input === 'number') return Number.isFinite(input) && input > 0 && input <= 24 ? Math.round(input * 100) / 100 : null;
	if (typeof input !== 'string') return null;
	const s = input.trim().toLowerCase().replace(',', '.');
	let hours: number | null = null;
	let m: RegExpMatchArray | null;
	if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)?$/))) hours = Number(m[1]);
	else if ((m = s.match(/^(\d+)\s*(?:m|min|mins|minutes?)$/))) hours = Number(m[1]) / 60;
	else if ((m = s.match(/^(\d+)\s*(?:h|:)\s*(\d{1,2})\s*(?:m|min)?$/))) hours = Number(m[1]) + Number(m[2]) / 60;
	if (hours === null || !(hours > 0) || hours > 24) return null;
	return Math.round(hours * 100) / 100;
}

export const formatHours = (h: number): string => `${Math.round(h * 100) / 100}h`;
