export type PainSource =
	| 'journal'
	| 'build-test'
	| 'interview'
	| 'money'
	| 'why-now'
	| 'boring'
	| 'funded-gap';

export type ScoreKey = 'pain' | 'frequency' | 'money' | 'access' | 'fit';

export interface PainPoint {
	id: string;
	user_id: string;
	title: string;
	details: string | null;
	who: string | null;
	workaround: string | null;
	source: PainSource;
	/** Free text: where it happens (work, home, a bank, ...). */
	context: string | null;
	noticed_on: string;
	score_pain: number | null;
	score_frequency: number | null;
	score_money: number | null;
	score_access: number | null;
	score_fit: number | null;
	archived_at: string | null;
	created_at: string;
	updated_at: string;
}

/** The seven ways of finding pain, in the order the method lists them. */
export const PAIN_SOURCE_LABELS: Record<PainSource, string> = {
	journal: 'Journal',
	'build-test': 'Would buy',
	interview: 'Interview',
	money: 'Existing spend',
	'why-now': 'Why now',
	boring: 'Boring industry',
	'funded-gap': 'Funded gap',
};

/** Longer form for dropdowns, where the short pill label would be cryptic. */
export const PAIN_SOURCE_OPTION_LABELS: Record<PainSource, string> = {
	journal: 'Frustration journal',
	'build-test': '"Why doesn\'t someone build X?"',
	interview: 'Interview',
	money: 'Money already being spent',
	'why-now': 'Why now (AI, new law, new behaviour)',
	boring: 'Boring industry',
	'funded-gap': 'Gap in what is funded',
};

export const PAIN_SOURCES = Object.keys(PAIN_SOURCE_LABELS) as PainSource[];

export const SCORES: { key: ScoreKey; label: string; hint: string }[] = [
	{ key: 'pain', label: 'Pain', hint: 'Do people complain about it without being asked?' },
	{ key: 'frequency', label: 'Freq.', hint: 'How often does it happen: daily, weekly, yearly?' },
	{ key: 'money', label: 'Money', hint: 'Does anyone already pay to solve it?' },
	{ key: 'access', label: 'Access', hint: 'Can you reach 20 people who have this problem?' },
	{ key: 'fit', label: 'Fit', hint: 'Do you care about it, could you work on it for 5+ years?' },
];

export const SCORE_FIELDS = SCORES.map((s) => `score_${s.key}`);
export const SCORE_MAX = SCORES.length * 5;

/**
 * Total of the five scores, or null until all five are filled in -- a half
 * scored pain must not outrank a fully scored one just because of what's
 * missing (same "null, not NaN" stance as positionMetrics in investments).
 */
export function painScore(p: PainPoint): number | null {
	const parts = [p.score_pain, p.score_frequency, p.score_money, p.score_access, p.score_fit];
	return parts.every((n): n is number => n != null) ? parts.reduce((a, b) => a + b, 0) : null;
}

/** Fully scored first (highest total wins), then the rest, newest first. */
export function compareByScore(a: PainPoint, b: PainPoint): number {
	const sa = painScore(a);
	const sb = painScore(b);
	if (sa != null && sb != null && sa !== sb) return sb - sa;
	if ((sa != null) !== (sb != null)) return sa != null ? -1 : 1;
	return compareByNewest(a, b);
}

export function compareByNewest(a: PainPoint, b: PainPoint): number {
	return b.noticed_on.localeCompare(a.noticed_on) || b.created_at.localeCompare(a.created_at);
}

/** Today as YYYY-MM-DD in Budapest, so a late-night entry lands on the right day. */
export function todayInBudapest(): string {
	return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Budapest' });
}

/** Number of distinct days in the last `days` that have a journal entry. */
export function journalDays(pains: PainPoint[], days = 30): number {
	const today = new Date(`${todayInBudapest()}T00:00:00Z`);
	today.setUTCDate(today.getUTCDate() - (days - 1));
	const since = today.toISOString().slice(0, 10);
	return new Set(pains.filter((p) => p.source === 'journal' && p.noticed_on >= since).map((p) => p.noticed_on)).size;
}

export function isPainSource(v: string): v is PainSource {
	return (PAIN_SOURCES as string[]).includes(v);
}

/** Case-insensitive identity of a free-text context ("Work" and "work " are one). */
export function contextKey(context: string | null): string {
	return (context ?? '').trim().toLowerCase();
}

/** Distinct contexts in use, most common first; the first spelling seen labels the group. */
export function contextGroups(pains: PainPoint[]): { key: string; label: string; count: number }[] {
	const groups = new Map<string, { key: string; label: string; count: number }>();
	for (const p of pains) {
		const key = contextKey(p.context);
		if (!key) continue;
		const g = groups.get(key);
		if (g) g.count++;
		else groups.set(key, { key, label: p.context!.trim(), count: 1 });
	}
	return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
