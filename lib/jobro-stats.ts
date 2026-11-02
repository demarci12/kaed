import type { JobroAuthUser, JobroReader } from './jobro';

/**
 * Who uses Jobro and how much -- derived from Jobro's own tables, no tracking
 * added on their side.
 *
 * Two signals, and they differ in quality:
 *  - business records (jobs, quotes, invoices, AI calls created): reliable.
 *  - last sign-in (Supabase `last_sign_in_at`): only moves on an actual login,
 *    not on a refreshed session, so someone who stays logged in for weeks looks
 *    idle. It undercounts users; treat "active users" as a floor.
 * A company's "last activity" is the latest of all of them.
 *
 * `buildOverview` is pure (rows in, numbers out) so it can be checked without a
 * database; `loadJobroOverview` is the thin fetch around it.
 */

export const ACTIVE_DAYS = 7;
export const SLIPPING_DAYS = 30;
const DAY = 86_400_000;

export type Segment = 'active' | 'slipping' | 'dormant';
export const SEGMENTS: { id: Segment; label: string; hint: string }[] = [
	{ id: 'active', label: 'Active', hint: `activity in the last ${ACTIVE_DAYS} days` },
	{ id: 'slipping', label: 'Slipping', hint: `last activity ${ACTIVE_DAYS}–${SLIPPING_DAYS} days ago` },
	{ id: 'dormant', label: 'Dormant', hint: `nothing in ${SLIPPING_DAYS}+ days` },
];

export interface RawCompany { id: string; name: string; email: string | null; plan: string; created_at: string }
export interface RawSubscription {
	company_id: string; plan_slug: string; status: string; trial_ends_at: string | null;
	current_period_end: string | null; cancel_at_period_end: boolean;
}
export interface RawMember { company_id: string; user_id: string; role: string; is_active: boolean }
export interface RawEvent { company_id: string; created_at: string }
export interface RawAiUse { company_id: string; created_at: string; credits: number }

export interface JobroRaw {
	companies: RawCompany[];
	subscriptions: RawSubscription[];
	members: RawMember[];
	authUsers: JobroAuthUser[];
	jobs: RawEvent[];
	quotes: RawEvent[];
	invoices: RawEvent[];
	ai: RawAiUse[];
}

export interface CompanyRow {
	id: string;
	name: string;
	ownerEmail: string | null;
	createdAt: string;
	plan: string;
	/** Subscription status, null when the company has no subscription row. */
	status: string | null;
	trialEndsAt: string | null;
	trialExpired: boolean;
	periodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	users: number;
	activeUsers7d: number;
	activeUsers30d: number;
	lastSignInAt: string | null;
	lastActivityAt: string | null;
	jobs30: number;
	quotes30: number;
	invoices30: number;
	aiCredits30: number;
	segment: Segment;
}

export interface Overview {
	generatedAt: string;
	totals: {
		companies: number;
		users: number;
		newCompanies7d: number;
		newCompanies30d: number;
		activeCompanies7d: number;
		activeCompanies30d: number;
		activeUsers7d: number;
		activeUsers30d: number;
		trialsEndingSoon: number;
		trialsExpired: number;
		byStatus: Record<string, number>;
		bySegment: Record<Segment, number>;
	};
	companies: CompanyRow[];
}

const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);
const latest = (...isos: (string | null | undefined)[]) => {
	let best: string | null = null;
	for (const i of isos) if (i && (best === null || ms(i) > ms(best))) best = i;
	return best;
};

function bucket<T extends { company_id: string }>(rows: T[]): Map<string, T[]> {
	const m = new Map<string, T[]>();
	for (const r of rows) {
		const list = m.get(r.company_id);
		if (list) list.push(r); else m.set(r.company_id, [r]);
	}
	return m;
}

export function segmentFor(lastActivityAt: string | null, now: number): Segment {
	const t = ms(lastActivityAt);
	if (Number.isNaN(t)) return 'dormant';
	const age = now - t;
	if (age <= ACTIVE_DAYS * DAY) return 'active';
	if (age <= SLIPPING_DAYS * DAY) return 'slipping';
	return 'dormant';
}

export function buildOverview(raw: JobroRaw, now = Date.now()): Overview {
	const since30 = now - SLIPPING_DAYS * DAY;
	const since7 = now - ACTIVE_DAYS * DAY;
	const authById = new Map(raw.authUsers.map((u) => [u.id, u]));
	const subByCompany = new Map(raw.subscriptions.map((s) => [s.company_id, s]));
	const membersBy = bucket(raw.members);
	const jobsBy = bucket(raw.jobs);
	const quotesBy = bucket(raw.quotes);
	const invoicesBy = bucket(raw.invoices);
	const aiBy = bucket(raw.ai);

	// The "30 days" counts are only as wide as what the loader fetched; filter
	// again here so a caller handing in a wider set still gets a 30-day number.
	const within30 = <T extends { created_at: string }>(rows: T[] = []) => rows.filter((r) => ms(r.created_at) >= since30);

	const companies: CompanyRow[] = raw.companies.map((c) => {
		const sub = subByCompany.get(c.id) ?? null;
		const members = (membersBy.get(c.id) ?? []).filter((m) => m.is_active);
		const people = members.map((m) => authById.get(m.user_id)).filter((u): u is JobroAuthUser => Boolean(u));
		const owner = members.find((m) => m.role === 'owner');
		const lastSignInAt = latest(...people.map((u) => u.last_sign_in_at));

		const jobs = within30(jobsBy.get(c.id));
		const quotes = within30(quotesBy.get(c.id));
		const invoices = within30(invoicesBy.get(c.id));
		const ai = within30(aiBy.get(c.id));

		const lastActivityAt = latest(
			lastSignInAt,
			...jobs.map((r) => r.created_at),
			...quotes.map((r) => r.created_at),
			...invoices.map((r) => r.created_at),
			...ai.map((r) => r.created_at),
		);

		const trialEndsAt = sub?.trial_ends_at ?? null;
		return {
			id: c.id,
			name: c.name,
			ownerEmail: owner ? authById.get(owner.user_id)?.email ?? null : null,
			createdAt: c.created_at,
			plan: sub?.plan_slug ?? c.plan,
			status: sub?.status ?? null,
			trialEndsAt,
			trialExpired: sub?.status === 'trialing' && trialEndsAt !== null && ms(trialEndsAt) < now,
			periodEnd: sub?.current_period_end ?? null,
			cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
			users: members.length,
			activeUsers7d: people.filter((u) => ms(u.last_sign_in_at) >= since7).length,
			activeUsers30d: people.filter((u) => ms(u.last_sign_in_at) >= since30).length,
			lastSignInAt,
			lastActivityAt,
			jobs30: jobs.length,
			quotes30: quotes.length,
			invoices30: invoices.length,
			aiCredits30: ai.reduce((sum, r) => sum + (r.credits || 0), 0),
			segment: segmentFor(lastActivityAt, now),
		};
	});

	// Most recently active first; never-active companies sink to the bottom.
	companies.sort((a, b) => (ms(b.lastActivityAt) || 0) - (ms(a.lastActivityAt) || 0));

	const byStatus: Record<string, number> = {};
	const bySegment: Record<Segment, number> = { active: 0, slipping: 0, dormant: 0 };
	for (const c of companies) {
		const key = c.status ?? 'no subscription';
		byStatus[key] = (byStatus[key] ?? 0) + 1;
		bySegment[c.segment]++;
	}

	const inWeek = now + 7 * DAY;
	return {
		generatedAt: new Date(now).toISOString(),
		totals: {
			companies: companies.length,
			users: companies.reduce((n, c) => n + c.users, 0),
			newCompanies7d: companies.filter((c) => ms(c.createdAt) >= since7).length,
			newCompanies30d: companies.filter((c) => ms(c.createdAt) >= since30).length,
			activeCompanies7d: bySegment.active,
			activeCompanies30d: bySegment.active + bySegment.slipping,
			activeUsers7d: companies.reduce((n, c) => n + c.activeUsers7d, 0),
			activeUsers30d: companies.reduce((n, c) => n + c.activeUsers30d, 0),
			trialsEndingSoon: companies.filter((c) => c.status === 'trialing' && !c.trialExpired && c.trialEndsAt !== null && ms(c.trialEndsAt) <= inWeek).length,
			trialsExpired: companies.filter((c) => c.trialExpired).length,
			byStatus,
			bySegment,
		},
		companies,
	};
}

export async function loadJobroOverview(reader: JobroReader, now = Date.now()): Promise<Overview> {
	const since = new Date(now - SLIPPING_DAYS * DAY).toISOString();
	// Independent reads: run them together, not one round trip after another.
	const [companies, subscriptions, members, authUsers, jobs, quotes, invoices, ai] = await Promise.all([
		reader.rows<RawCompany>('companies', 'id, name, email, plan, created_at'),
		reader.rows<RawSubscription>('subscriptions', 'company_id, plan_slug, status, trial_ends_at, current_period_end, cancel_at_period_end'),
		reader.rows<RawMember>('company_users', 'company_id, user_id, role, is_active'),
		reader.authUsers(),
		reader.rows<RawEvent>('jobs', 'company_id, created_at', (q) => q.is('deleted_at', null).gte('created_at', since)),
		reader.rows<RawEvent>('quotes', 'company_id, created_at', (q) => q.gte('created_at', since)),
		reader.rows<RawEvent>('invoices', 'company_id, created_at', (q) => q.gte('created_at', since)),
		reader.rows<RawAiUse>('ai_usage', 'company_id, created_at, credits', (q) => q.gte('created_at', since)),
	]);
	return buildOverview({ companies, subscriptions, members, authUsers, jobs, quotes, invoices, ai }, now);
}
