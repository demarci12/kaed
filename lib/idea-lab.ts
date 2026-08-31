// No `export { requireOwner } from './auth'` here on purpose: this module is
// also imported by StepEditor.tsx, a client component, for its pure types
// and functions. auth.ts pulls in lib/supabase.ts, which imports
// next/headers -- re-exporting it here would drag that whole server-only
// chain into the client bundle's module graph and fail the build. Pages and
// routes import requireOwner/getOwnerSession from '@/lib/auth' directly.

export type IdeaDecision = 'testing' | 'go' | 'no_go';

export const IDEA_DECISION_LABELS: Record<IdeaDecision, string> = {
	testing: 'Testing',
	go: 'Go',
	no_go: 'No go',
};

export const IDEA_DECISIONS = Object.keys(IDEA_DECISION_LABELS) as IdeaDecision[];

/**
 * One candidate run through the 11-step "find a startup idea" process.
 * Steps 1, 2 and 4-10 store a JSON-encoded StepAnswer in their text column
 * (see below) rather than freeform prose -- each is a guided worksheet with
 * its own sub-fields, not a single textarea. Step 3 (market-demand evidence)
 * is a repeating log in idea_lab_evidence instead, since the process
 * explicitly asks you to log every finding, not summarize them into one
 * paragraph. Step 11 (decision) stays a plain enum.
 */
export interface IdeaCandidate {
	id: string;
	user_id: string;
	title: string;
	domains: string | null;
	personal_pain: string | null;
	money_evidence: string | null;
	secret: string | null;
	buyer: string | null;
	stress_test: string | null;
	trap_check: string | null;
	score_notes: string | null;
	validation: string | null;
	decision: IdeaDecision;
	rank: number;
	business_idea_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface IdeaLabEvidence {
	id: string;
	idea_candidate_id: string;
	user_id: string;
	problem: string;
	source: string | null;
	permalink: string | null;
	engagement: string | null;
	quote: string | null;
	found_on: string | null;
	created_at: string;
}

export interface StudyStepField {
	key: string;
	label: string;
	kind: 'textarea' | 'text';
	placeholder?: string;
}

/** A single-entry "who / problem / situation"-style sentence builder (step 6's one buyer). */
export interface SentenceSpec {
	parts: StudyStepField[];
	render: (values: Record<string, string>) => string;
}

/** A repeating list of sentence entries, up to `max` (step 2's ranked pain sentences). */
export interface RankedSpec {
	parts: StudyStepField[];
	render: (values: Record<string, string>) => string;
	max: number;
}

/** One step of the process. `field` is the DB column it reads/writes (or 'evidence' for the step-3 log). */
export interface IdeaLabStep {
	n: number;
	title: string;
	field: keyof IdeaCandidate | 'evidence';
	guidance: string;
	/** Suggested time-box, shown as a countdown timer above the step. Only set where the framework itself specifies one. */
	timerMinutes?: number;
	/** Plain multi-field worksheet (most steps). */
	fields?: StudyStepField[];
	/** Single sentence-builder instead of/alongside fields (step 6). */
	sentence?: SentenceSpec;
	/** Repeating sentence-builder instead of/alongside fields (step 2). */
	ranked?: RankedSpec;
	/** Yes/no "good signal" checkboxes (step 9's three signals that feel bad but are good). */
	checks?: { key: string; label: string }[];
}

export const IDEA_LAB_STEPS: IdeaLabStep[] = [
	{
		n: 1,
		title: 'Identify your domains',
		field: 'domains',
		guidance:
			'Every world you already have real time in. You have an unfair advantage in each one, because you can see friction outsiders can\'t.',
		fields: [
			{ key: 'jobs', label: 'Jobs (all of them, not just current)', kind: 'textarea', placeholder: 'Every job or internship, and one sentence per job on what you know that most outsiders don’t.' },
			{ key: 'hobbies', label: 'Hobbies / skills you’re genuinely deep in', kind: 'textarea', placeholder: 'Not casual interests -- things you spend real hours on.' },
			{ key: 'communities', label: 'Communities you’re active in', kind: 'textarea', placeholder: 'A subreddit, Discord, local group, professional association, volunteer role.' },
			{ key: 'lifeStages', label: 'Life stages / transitions', kind: 'textarea', placeholder: 'New parent, new homeowner, recent graduate, caregiver, freelancer, etc.' },
		],
	},
	{
		n: 2,
		title: 'Mine personal pain within each domain',
		field: 'personal_pain',
		guidance:
			'For your top 2-3 domains, force it in writing -- don’t trust memory. Then rank what you find by how personally acute it is, not how big the market sounds.',
		timerMinutes: 75,
		fields: [
			{ key: 'moneySpent', label: 'Money you’ve already spent fixing an annoyance', kind: 'textarea', placeholder: 'Scroll bank/card statements 6-12 months back. Every purchase driven by frustration is proof someone will pay to solve it.' },
			{ key: 'workarounds', label: 'Workarounds you’ve built', kind: 'textarea', placeholder: 'A spreadsheet, script, template, or ad-hoc system you cobbled together.' },
			{ key: 'repeatSearches', label: 'Things you Google repeatedly', kind: 'textarea', placeholder: 'Recurring searches mean a recurring, still-unsolved problem.' },
			{ key: 'complaints', label: 'Complaints you make out loud', kind: 'textarea', placeholder: 'What did you rant about to a coworker, partner, or group chat more than once last month?' },
			{ key: 'doesntExist', label: '“Why doesn’t this exist” moments', kind: 'textarea', placeholder: 'Times you assumed a solution existed, then found nothing, or found something bad or overpriced.' },
		],
		ranked: {
			max: 5,
			parts: [
				{ key: 'who', label: 'Who', kind: 'text', placeholder: 'Freelance wedding photographers' },
				{ key: 'problem', label: 'Struggles with (specific problem)', kind: 'text', placeholder: 'losing track of unpaid deposits' },
				{ key: 'situation', label: 'When (specific situation)', kind: 'text', placeholder: 'juggling bookings across email and text' },
			],
			render: (v) =>
				`${v.who || '[Who]'} struggles with ${v.problem || '[specific problem]'}${v.situation ? ` when ${v.situation}` : ''}.`,
		},
	},
	{
		n: 3,
		title: 'Find domain-specific market demand',
		field: 'evidence',
		guidance:
			'Search relevant subreddits for frustration phrases ("wish there was", "alternative to X", "hate X"), not topic names. Read the comments, not just the post. Log every finding below. 20+ mentions across subreddits is a decent signal; 50+ across platforms is strong.',
	},
	{
		n: 4,
		title: 'Confirm money is already moving',
		field: 'money_evidence',
		guidance:
			'A market where nobody spends money is a red flag, however painful it feels. Competitors and paid tools are a good sign -- they prove the money is real.',
		fields: [
			{ key: 'paidTools', label: 'Existing paid tools or services', kind: 'textarea' },
			{ key: 'jobPostings', label: 'Job postings referencing this problem', kind: 'textarea' },
			{ key: 'agencies', label: 'Agencies / freelancers paid to solve it manually', kind: 'textarea' },
			{ key: 'adSpend', label: 'Rough ad spend or sponsored content in the space', kind: 'textarea' },
		],
	},
	{
		n: 5,
		title: 'Look for a secret',
		field: 'secret',
		guidance:
			'What valuable company is nobody building? Every correct answer is, by definition, a secret -- something true and important most people haven’t recognized yet.',
		fields: [
			{ key: 'naturalSecret', label: 'Natural secret', kind: 'textarea', placeholder: 'A category everyone assumes is "solved" that actually isn’t.' },
			{ key: 'peopleSecret', label: 'Secret about people', kind: 'textarea', placeholder: 'What’s forbidden or unsaid in this domain? What do people know about themselves but hide from others?' },
		],
	},
	{
		n: 6,
		title: 'Narrow to one specific, nameable buyer',
		field: 'buyer',
		guidance:
			'Not "small businesses" -- a single person you can picture. A crowded market for that buyer is a good sign, not a disqualifier.',
		sentence: {
			parts: [
				{ key: 'who', label: 'Who, specifically', kind: 'text', placeholder: 'Freelance wedding photographers' },
				{ key: 'problem', label: 'Who struggles with', kind: 'text', placeholder: 'losing bookings to slow reply times' },
			],
			render: (v) => `${v.who || '[specific buyer]'} who ${v.problem || '[specific problem]'}.`,
		},
	},
	{
		n: 7,
		title: 'Stress-test the idea',
		field: 'stress_test',
		guidance: 'Push it to its edges. These constraints cut through incremental thinking.',
		fields: [
			{ key: 'twoWeeks', label: 'What if you had to ship in two weeks?', kind: 'textarea' },
			{ key: 'tenX', label: 'What if you could only charge 10x more?', kind: 'textarea' },
			{ key: 'oneCustomer', label: 'What if you could serve only one customer, ever?', kind: 'textarea' },
		],
	},
	{
		n: 8,
		title: 'Check against the idea traps',
		field: 'trap_check',
		guidance: 'Four known failure patterns. Be honest about whether any apply.',
		fields: [
			{ key: 'cisp', label: 'Solution in search of a problem?', kind: 'textarea', placeholder: 'Did this start from a felt problem, or from a technology/idea you liked?' },
			{ key: 'tarPit', label: 'Tar pit idea?', kind: 'textarea', placeholder: 'Has this been tried repeatedly and never worked? If so, why?' },
			{ key: 'schlepFilter', label: 'Schlep filter?', kind: 'textarea', placeholder: 'Are you avoiding this because the work sounds tedious, not because it’s a bad idea?' },
			{ key: 'unsexyFilter', label: 'Unsexy filter?', kind: 'textarea', placeholder: 'Are you avoiding this because it sounds boring?' },
		],
	},
	{
		n: 9,
		title: 'Score against the 10 questions',
		field: 'score_notes',
		guidance: 'Short answers are fine -- the point is forcing yourself to actually answer each one.',
		fields: [
			{ key: 'founderFit', label: '1. Founder-market fit', kind: 'text' },
			{ key: 'marketSize', label: '2. Market size (big now, or small + fast-growing?)', kind: 'text' },
			{ key: 'problemAcuteness', label: '3. Problem acuteness (alternative = literally nothing?)', kind: 'text' },
			{ key: 'competition', label: '4. Competition (exists? good sign)', kind: 'text' },
			{ key: 'personalWant', label: '5. Do you and people you know personally want this?', kind: 'text' },
			{ key: 'timing', label: '6. Timing -- what changed that makes this possible now?', kind: 'text' },
			{ key: 'proxies', label: '7. Proxies in an adjacent market/geography?', kind: 'text' },
			{ key: 'longTermInterest', label: '8. Still want this in years, once excitement fades?', kind: 'text' },
			{ key: 'scalability', label: '9. Scales without your hours scaling with revenue?', kind: 'text' },
			{ key: 'ideaSpace', label: '10. Is the surrounding category a fertile one?', kind: 'text' },
		],
		checks: [
			{ key: 'hardToStart', label: 'Hard to get started (real barrier, scares off casual competitors)' },
			{ key: 'boringSpace', label: 'A boring space (lower competition, higher hit rate)' },
			{ key: 'competitorsAllMissed', label: 'Existing competitors who all seem to have missed the same thing' },
		],
	},
	{
		n: 10,
		title: 'Validate with a pitch and real money',
		field: 'validation',
		guidance: 'Dollars in hand is the only somewhat reliable signal. Never ask "would you buy this?"',
		fields: [
			{ key: 'pitch', label: 'One-paragraph pitch', kind: 'textarea' },
			{ key: 'headline', label: 'Landing-page headline', kind: 'text' },
			{ key: 'peopleTalkedTo', label: 'Who you talked to (15-20 matching your Step 6 buyer)', kind: 'textarea' },
			{ key: 'results', label: 'What actually happened -- deposits, presales, firm yeses, silence', kind: 'textarea' },
		],
	},
	{
		n: 11,
		title: 'Decide and move',
		field: 'decision',
		guidance:
			"If it passed Steps 1-10, commit to a small scoped build and get it in front of real users fast. If it stalled at Step 10, that's data, not a dead end -- return to Step 3 or 6 with what you learned.",
	},
];

// ---- Structured answer storage -----------------------------------------
//
// Steps with `fields`/`sentence`/`ranked`/`checks` store a JSON-encoded
// StepAnswer in their DB column instead of prose. This keeps the schema
// unchanged (still one `text` column per step) while giving each step a
// real guided-worksheet UI instead of a single textarea.

export interface StepAnswer {
	fields?: Record<string, string>;
	sentence?: Record<string, string>;
	ranked?: Record<string, string>[];
	checks?: Record<string, boolean>;
	/** Anything unparseable found in the column when structure was introduced -- never silently discarded. */
	legacy?: string;
}

export function parseStepAnswer(raw: string | null | undefined): StepAnswer {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as StepAnswer;
	} catch {
		// fall through
	}
	return { legacy: raw };
}

export function composeStepAnswer(answer: StepAnswer): string {
	return JSON.stringify(answer);
}

export function isStepAnswerEmpty(step: IdeaLabStep, raw: string | null | undefined): boolean {
	const a = parseStepAnswer(raw);
	if (a.legacy?.trim()) return false;
	if (step.fields?.some((f) => a.fields?.[f.key]?.trim())) return false;
	if (step.sentence && Object.values(a.sentence ?? {}).some((v) => v?.trim())) return false;
	if (step.ranked && (a.ranked ?? []).some((e) => Object.values(e).some((v) => v?.trim()))) return false;
	if (step.checks?.some((c) => a.checks?.[c.key])) return false;
	return true;
}

/** Human-readable rollup of a step's structured answer -- used for the business-idea conversion mapping. */
export function summarizeStepAnswer(step: IdeaLabStep, raw: string | null | undefined): string {
	const a = parseStepAnswer(raw);
	const parts: string[] = [];

	if (a.legacy?.trim()) parts.push(a.legacy.trim());

	if (step.fields) {
		for (const f of step.fields) {
			const v = a.fields?.[f.key]?.trim();
			if (v) parts.push(`${f.label}: ${v}`);
		}
	}
	if (step.sentence) {
		const hasAny = Object.values(a.sentence ?? {}).some((v) => v?.trim());
		if (hasAny) parts.push(step.sentence.render(a.sentence ?? {}));
	}
	if (step.ranked) {
		for (const entry of a.ranked ?? []) {
			const hasAny = Object.values(entry).some((v) => v?.trim());
			if (hasAny) parts.push(step.ranked.render(entry));
		}
	}
	if (step.checks) {
		const present = step.checks.filter((c) => a.checks?.[c.key]).map((c) => c.label);
		if (present.length) parts.push(`Good signals present: ${present.join('; ')}`);
	}

	return parts.join('\n\n');
}
