import { JIRA_KEY, type TaskPriority, type TaskStatus } from './work';

/**
 * Reads rows pasted from Jira (the issue list, or an exported CSV) or from
 * Excel into task rows. Tab-separated text (what copying a table gives you) and
 * comma/semicolon CSV both work, with or without a header row; Jira's own
 * column names and statuses are mapped onto ours.
 */
export interface ImportRow {
	jira_key?: string;
	title: string;
	responsible?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	due_on?: string;
	description?: string;
	/** Becomes a comment on a newly created ticket. */
	comment?: string;
}

type Field = 'jira_key' | 'title' | 'responsible' | 'status' | 'priority' | 'due_on' | 'description' | 'comment';

const HEADERS: Record<Field, string[]> = {
	jira_key: ['key', 'issuekey', 'jira', 'jirakey', 'id', 'issue', 'ticket'],
	title: ['summary', 'title', 'topic', 'task', 'name', 'issuesummary', 'action'],
	responsible: ['assignee', 'responsible', 'owner', 'person', 'assignedto'],
	status: ['status'],
	priority: ['priority', 'prio'],
	due_on: ['due', 'duedate', 'deadline', 'dueon', 'target'],
	description: ['description', 'details'],
	comment: ['comment', 'comments', 'note', 'notes', 'remark', 'remarks'],
};

/** Without a header row: columns in this order, after an optional leading Jira key. */
const POSITIONAL: Field[] = ['title', 'responsible', 'status', 'priority', 'due_on', 'comment'];

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function splitRecords(text: string, delimiter: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
			else if (c === '"') quoted = false;
			else cell += c;
		} else if (c === '"' && cell === '') {
			quoted = true;
		} else if (c === delimiter) {
			row.push(cell); cell = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && text[i + 1] === '\n') i++;
			row.push(cell); cell = '';
			if (row.some((x) => x.trim())) rows.push(row);
			row = [];
		} else {
			cell += c;
		}
	}
	row.push(cell);
	if (row.some((x) => x.trim())) rows.push(row);
	return rows;
}

function detectDelimiter(text: string): string {
	const first = text.split(/\r?\n/).find((l) => l.trim()) ?? '';
	if (first.includes('\t')) return '\t';
	const counts = [',', ';'].map((d) => [d, first.split(d).length - 1] as const);
	counts.sort((a, b) => b[1] - a[1]);
	return counts[0][1] > 0 ? counts[0][0] : '\t';
}

export function mapStatus(raw: string): TaskStatus | undefined {
	const s = raw.trim().toLowerCase();
	if (!s) return undefined;
	if (/block|impedi|hold|wait/.test(s)) return 'blocked';
	if (/done|closed|resolved|complete|finish|released/.test(s)) return 'done';
	if (/progress|review|doing|develop|test|active|started/.test(s)) return 'doing';
	return 'todo';
}

export function mapPriority(raw: string): TaskPriority | undefined {
	const s = raw.trim().toLowerCase();
	if (!s) return undefined;
	if (/highest|high|blocker|critical|major|urgent/.test(s)) return 'high';
	if (/lowest|low|minor|trivial/.test(s)) return 'low';
	return 'medium';
}

/** YYYY-MM-DD from ISO, 28.10.2026, 28/10/2026, "2026. 10. 28." or Jira's 28/Oct/26. */
export function mapDate(raw: string): string | undefined {
	const s = raw.trim();
	if (!s) return undefined;
	const pad = (n: number | string) => String(n).padStart(2, '0');
	const valid = (y: number, m: number, d: number) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : undefined);
	let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (m) return valid(+m[1], +m[2], +m[3]);
	m = s.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?/);
	if (m) return valid(+m[1], +m[2], +m[3]);
	m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
	if (m) return valid(+m[3], +m[2], +m[1]);
	m = s.match(/^(\d{1,2})[/\- ]([A-Za-z]{3})[A-Za-z]*[/\- ](\d{2,4})/);
	if (m) {
		const month = MONTHS.indexOf(m[2].toLowerCase()) + 1;
		const year = +m[3] < 100 ? 2000 + +m[3] : +m[3];
		return month ? valid(year, month, +m[1]) : undefined;
	}
	return undefined;
}

export function parseTasks(text: string): { rows: ImportRow[]; skipped: number; header: boolean } {
	const records = splitRecords(text.trim(), detectDelimiter(text));
	if (!records.length) return { rows: [], skipped: 0, header: false };

	const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
	const columnOf: Partial<Record<Field, number>> = {};
	records[0].forEach((cell, i) => {
		const n = norm(cell);
		for (const field of Object.keys(HEADERS) as Field[]) {
			if (columnOf[field] === undefined && HEADERS[field].includes(n)) columnOf[field] = i;
		}
	});
	const header = columnOf.title !== undefined;

	let body = records;
	if (header) {
		body = records.slice(1);
	} else {
		const hasKey = JIRA_KEY.test((records[0][0] ?? '').trim().toUpperCase());
		const order: Field[] = hasKey ? ['jira_key', ...POSITIONAL] : POSITIONAL;
		order.forEach((field, i) => { columnOf[field] = i; });
	}

	const rows: ImportRow[] = [];
	let skipped = 0;
	for (const rec of body) {
		const get = (f: Field) => (columnOf[f] === undefined ? '' : (rec[columnOf[f] as number] ?? '').trim());
		const title = get('title');
		if (!title) { skipped++; continue; }
		const row: ImportRow = { title };
		const key = get('jira_key').toUpperCase();
		if (key) row.jira_key = key;
		if (get('responsible')) row.responsible = get('responsible');
		const status = mapStatus(get('status'));
		if (status) row.status = status;
		const priority = mapPriority(get('priority'));
		if (priority) row.priority = priority;
		const due = mapDate(get('due_on'));
		if (due) row.due_on = due;
		if (get('description')) row.description = get('description');
		if (get('comment')) row.comment = get('comment');
		rows.push(row);
	}
	return { rows, skipped, header };
}
