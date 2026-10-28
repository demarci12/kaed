import { JIRA_KEY, STATUS_LABELS, todayInBudapest, type TaskStatus } from './work';
import { mapStatus } from './work-import';

/**
 * A small Jira client for the Work page: read a ticket's title and description,
 * and write a worklog, a comment and a status change. Server-only.
 *
 * It talks REST API v2 on purpose: v2 exists on Jira Cloud and on Data Center /
 * Server, and takes plain text for comments and descriptions (v3 wants
 * Atlassian's JSON document format), so one code path serves both.
 *
 * Settings (Vercel env vars, or .env.local):
 *   JIRA_BASE_URL   https://yourcompany.atlassian.net  (or the company Jira URL, incl. any /jira context path)
 *   Jira Cloud:     JIRA_EMAIL + JIRA_API_TOKEN  (token from id.atlassian.com/manage/api-tokens)
 *   Data Center:    JIRA_PAT                     (personal access token, sent as a Bearer token)
 */

export class JiraError extends Error {
	constructor(message: string, readonly status?: number) {
		super(message);
	}
}

export interface JiraConfig {
	baseUrl: string;
	auth: string;
	kind: 'cloud' | 'pat';
	host: string;
}

export function jiraConfig(): JiraConfig | null {
	const raw = (process.env.JIRA_BASE_URL ?? '').trim().replace(/\/+$/, '');
	if (!raw) return null;
	let url: URL;
	try { url = new URL(raw); } catch { return null; }
	// Credentials only ever go over https (plain http only for a local test server).
	if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) return null;
	const email = process.env.JIRA_EMAIL?.trim();
	const token = process.env.JIRA_API_TOKEN?.trim();
	const pat = process.env.JIRA_PAT?.trim();
	if (email && token) return { baseUrl: raw, auth: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`, kind: 'cloud', host: url.host };
	if (pat) return { baseUrl: raw, auth: `Bearer ${pat}`, kind: 'pat', host: url.host };
	return null;
}

async function request<T>(cfg: JiraConfig, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
	const ctl = new AbortController();
	const timer = setTimeout(() => ctl.abort(), 15_000);
	let res: Response;
	try {
		res = await fetch(`${cfg.baseUrl}/rest/api/2${path}`, {
			method,
			headers: { Authorization: cfg.auth, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
			body: body ? JSON.stringify(body) : undefined,
			signal: ctl.signal,
			cache: 'no-store',
		});
	} catch {
		throw new JiraError(`Could not reach Jira at ${cfg.host}. If it is only open on the company network, kaed.hu on Vercel cannot get to it.`);
	} finally {
		clearTimeout(timer);
	}

	if (res.status === 401 || res.status === 403) {
		throw new JiraError(`Jira refused the login (HTTP ${res.status}). Check ${cfg.kind === 'cloud' ? 'JIRA_EMAIL and JIRA_API_TOKEN' : 'JIRA_PAT'}, and that your account may do this.`, res.status);
	}
	if (res.status === 404) throw new JiraError('Jira does not know that ticket, or you cannot see it.', 404);
	if (!res.ok) {
		const payload = (await res.json().catch(() => null)) as { errorMessages?: string[]; errors?: Record<string, string> } | null;
		const detail = [...(payload?.errorMessages ?? []), ...Object.values(payload?.errors ?? {})].join(' ');
		throw new JiraError(detail || `Jira answered HTTP ${res.status}.`, res.status);
	}
	return (res.status === 204 ? undefined : await res.json()) as T;
}

function keyOf(key: string): string {
	const k = key.trim().toUpperCase();
	if (!JIRA_KEY.test(k)) throw new JiraError(`"${key}" is not a Jira key (like KB-123).`);
	return encodeURIComponent(k);
}

/** Plain text out of an Atlassian-document-format description, in case a site hands one back. */
function adfText(node: unknown): string {
	if (!node || typeof node !== 'object') return '';
	const n = node as { type?: string; text?: string; content?: unknown[] };
	if (n.type === 'text') return n.text ?? '';
	const inner = (n.content ?? []).map(adfText).join(n.type === 'doc' || n.type === 'bulletList' || n.type === 'orderedList' ? '\n' : '');
	return n.type === 'paragraph' || n.type === 'heading' || n.type === 'listItem' ? `${inner}\n` : inner;
}

export interface JiraIssue {
	key: string;
	title: string;
	description: string;
	/** The ticket's status in Jira's own words, e.g. "In Progress". */
	status: string;
}

/** Who the token belongs to; the "test connection" call. */
export async function jiraMyself(cfg: JiraConfig): Promise<{ name: string }> {
	const me = await request<{ displayName?: string; name?: string; emailAddress?: string }>(cfg, 'GET', '/myself');
	return { name: me.displayName || me.name || me.emailAddress || 'unknown user' };
}

/** READ: a ticket's title (summary) and description. */
export async function jiraGetIssue(cfg: JiraConfig, key: string): Promise<JiraIssue> {
	const k = keyOf(key);
	const issue = await request<{ key: string; fields: { summary?: string; description?: unknown; status?: { name?: string } } }>(
		cfg, 'GET', `/issue/${k}?fields=summary,description,status`,
	);
	const d = issue.fields.description;
	return {
		key: issue.key,
		title: (issue.fields.summary ?? '').trim(),
		description: (typeof d === 'string' ? d : adfText(d)).trim(),
		status: issue.fields.status?.name ?? '',
	};
}

/** WRITE: a comment on the ticket. */
export async function jiraAddComment(cfg: JiraConfig, key: string, text: string): Promise<void> {
	await request(cfg, 'POST', `/issue/${keyOf(key)}/comment`, { body: text });
}

const BUDAPEST = 'Europe/Budapest';

/** Jira's `started` format for a moment in Budapest time: 2026-10-28T09:00:00.000+0100. */
function budapestStamp(at: Date): string {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-CA', { timeZone: BUDAPEST, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
			.formatToParts(at).map((p) => [p.type, p.value]),
	);
	const offset = (new Intl.DateTimeFormat('en-US', { timeZone: BUDAPEST, timeZoneName: 'longOffset' }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+01:00')
		.replace('GMT', '').replace(':', '') || '+0000';
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.000${offset}`;
}

/** Started time for a worklog on `day`: now if it is today (Jira can refuse the future), else 09:00 Budapest. */
export function worklogStarted(day: string, now = new Date()): string {
	if (day === todayInBudapest()) return budapestStamp(now);
	// Noon UTC on that day is the same calendar day in Budapest and tells us that day's UTC offset (summer/winter time).
	const offset = budapestStamp(new Date(`${day}T12:00:00Z`)).slice(-5);
	return `${day}T09:00:00.000${offset}`;
}

/** WRITE: time spent on the ticket on `day`. */
export async function jiraLogWork(cfg: JiraConfig, key: string, hours: number, day: string, comment?: string | null): Promise<void> {
	await request(cfg, 'POST', `/issue/${keyOf(key)}/worklog`, {
		timeSpentSeconds: Math.max(60, Math.round(hours * 3600)),
		started: worklogStarted(day),
		...(comment ? { comment } : {}),
	});
}

interface Transition { id: string; name: string; to?: { name?: string } }

/** Names to try first when several transitions lead to the same kind of status. */
const PREFERRED: Record<TaskStatus, string[]> = {
	todo: ['to do', 'open', 'backlog', 'reopened'],
	doing: ['in progress', 'in development', 'doing', 'in review'],
	blocked: ['blocked', 'on hold', 'impediment', 'waiting'],
	done: ['done', 'closed', 'resolved', 'complete', 'completed'],
};

export type JiraMove = { changed: false; status: string } | { changed: true; from: string; to: string };

/**
 * WRITE: move the ticket to `want` -- one of our four statuses (matched to
 * whatever the ticket's workflow calls it) or, for a custom workflow, the exact
 * Jira status name. A workflow only offers some moves from the current status;
 * if none fits, the error lists what is on offer.
 */
export async function jiraTransition(cfg: JiraConfig, key: string, want: TaskStatus | string): Promise<JiraMove> {
	const k = keyOf(key);
	const current = (await request<{ fields: { status?: { name?: string } } }>(cfg, 'GET', `/issue/${k}?fields=status`)).fields.status?.name ?? '';
	const kind = (TASK_STATUS_NAMES as readonly string[]).includes(want) ? (want as TaskStatus) : undefined;
	const label = kind ? STATUS_LABELS[kind] : want;

	const same = kind ? mapStatus(current) === kind : current.toLowerCase() === want.toLowerCase();
	if (same) return { changed: false, status: current };

	const { transitions } = await request<{ transitions: Transition[] }>(cfg, 'GET', `/issue/${k}/transitions`);
	const target = (t: Transition) => t.to?.name ?? t.name;
	let fits = transitions.filter((t) => (kind ? mapStatus(target(t)) === kind : target(t).toLowerCase() === want.toLowerCase() || t.name.toLowerCase() === want.toLowerCase()));
	if (kind && fits.length > 1) {
		const rank = (t: Transition) => { const i = PREFERRED[kind].indexOf(target(t).toLowerCase()); return i < 0 ? 99 : i; };
		fits = [...fits].sort((a, b) => rank(a) - rank(b));
	}
	if (!fits.length) {
		const offered = transitions.map(target).join(', ') || 'none';
		throw new JiraError(`Jira has no move from "${current}" to "${label}". It offers: ${offered}.`);
	}
	await request(cfg, 'POST', `/issue/${k}/transitions`, { transition: { id: fits[0].id } });
	return { changed: true, from: current, to: target(fits[0]) };
}

const TASK_STATUS_NAMES = ['todo', 'doing', 'blocked', 'done'] as const;

export type JiraPush = { ok: true; note: string } | { ok: false; error: string; skipped?: boolean };

/**
 * Runs one Jira write for a Work row, folding the reasons it might not happen
 * (Jira not connected, no key on the row, Jira said no) into a result the caller
 * can show -- the local change has already been saved either way.
 */
export async function jiraPush(jiraKey: string | null | undefined, run: (cfg: JiraConfig, key: string) => Promise<string>): Promise<JiraPush> {
	const cfg = jiraConfig();
	if (!cfg) return { ok: false, skipped: true, error: 'Jira is not connected yet (the JIRA_* settings are missing).' };
	if (!jiraKey) return { ok: false, skipped: true, error: 'this row has no Jira key' };
	try {
		return { ok: true, note: await run(cfg, jiraKey) };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : 'Jira did not accept it.' };
	}
}
