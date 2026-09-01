// No `export { requireOwner } from './auth'` here on purpose: auth.ts pulls
// in lib/supabase.ts, which imports next/headers -- a server-only chain that
// broke the build once already when this module got imported somewhere it
// didn't belong. Pages and routes import requireOwner/getOwnerSession from
// '@/lib/auth' directly.

export type IdeaDecision = 'testing' | 'go' | 'no_go';

export const IDEA_DECISION_LABELS: Record<IdeaDecision, string> = {
	testing: 'Testing',
	go: 'Go',
	no_go: 'No go',
};

export const IDEA_DECISIONS = Object.keys(IDEA_DECISION_LABELS) as IdeaDecision[];

/**
 * The single, permanent Idea Lab worksheet -- one row per user, never one per
 * idea. The framework is a search, not a filing system: you run it to *find*
 * ideas, so the steps can't live on an idea you had to name before you were
 * allowed to start. Steps 3 and 6 are repeating logs (idea_lab_evidence,
 * idea_candidates), not columns here.
 */
export interface IdeaLabWorksheet {
	id: string;
	user_id: string;
	background: string | null;
	personal_pain: string | null;
	money_evidence: string | null;
	secret: string | null;
	buyer: string | null;
	stress_test: string | null;
	trap_check: string | null;
	score_notes: string | null;
	validation: string | null;
	created_at: string;
	updated_at: string;
}

/** One idea that came out of the process. An output, not the container for it. */
export interface IdeaCandidate {
	id: string;
	user_id: string;
	idea_lab_id: string;
	title: string;
	note: string | null;
	decision: IdeaDecision;
	rank: number;
	business_idea_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface IdeaLabEvidence {
	id: string;
	idea_lab_id: string;
	user_id: string;
	problem: string;
	source: string | null;
	permalink: string | null;
	engagement: string | null;
	quote: string | null;
	found_on: string | null;
	created_at: string;
}

/** The worksheet columns that are plain prose steps, i.e. inline-editable. */
export type IdeaLabProseField = Exclude<
	keyof IdeaLabWorksheet,
	'id' | 'user_id' | 'created_at' | 'updated_at'
>;

/**
 * One step of the process: the worksheet field it edits, or one of the two
 * repeating logs ('evidence' for Step 3's market-demand findings, 'candidates'
 * for the ideas that surface at Step 6).
 */
export interface IdeaLabStep {
	n: number;
	title: string;
	field: IdeaLabProseField | 'evidence' | 'candidates';
	/** Steps 1-5 gather raw material; 6 is where ideas appear; 7-11 sharpen them. */
	phase: 'gather' | 'surface' | 'sharpen';
	guidance: string;
}

export const IDEA_LAB_STEPS: IdeaLabStep[] = [
	{
		n: 1,
		title: 'Audit your own background',
		field: 'background',
		phase: 'gather',
		guidance:
			'Before hunting for problems, inventory what you can see that others cannot: industries you have worked inside, unusual expertise, expensive lessons, people you can call. The best ideas come from an unfair vantage point, not from brainstorming in the abstract.',
	},
	{
		n: 2,
		title: 'Mine your personal pain',
		field: 'personal_pain',
		phase: 'gather',
		guidance:
			'Money already spent fixing an annoyance, workarounds you built, things you Google repeatedly, complaints you make out loud, "why doesn\'t this exist" moments. Write each as: "[Who] struggles with [specific problem] when [specific situation]."',
	},
	{
		n: 3,
		title: 'Find market demand in the wild',
		field: 'evidence',
		phase: 'gather',
		guidance:
			'Search relevant subreddits for frustration phrases ("wish there was", "alternative to X", "hate X"), not topic names. Read the comments, not just the post. Log every finding below. 20+ mentions across subreddits is a decent signal; 50+ across platforms is strong.',
	},
	{
		n: 4,
		title: 'Confirm money is already moving',
		field: 'money_evidence',
		phase: 'gather',
		guidance:
			'Existing paid tools, job postings referencing the problem, agencies/freelancers paid to solve it manually, rough ad spend in the space. A market where nobody spends money is a red flag, however painful it feels.',
	},
	{
		n: 5,
		title: 'Look for a secret',
		field: 'secret',
		phase: 'gather',
		guidance:
			"What valuable thing is nobody building? A field nobody's rigorously studied, or something forbidden/taboo/unsaid in this domain. The best place to look is wherever no one else is looking.",
	},
	{
		n: 6,
		title: 'Name the ideas that surfaced',
		field: 'candidates',
		phase: 'surface',
		guidance:
			'Now -- and only now -- write down the ideas Steps 1-5 actually produced. Name as many as you have; this is a list to generate from, not a shortlist to defend. Each one carries its own verdict, and the ones that earn it convert into the business idea register.',
	},
	{
		n: 7,
		title: 'Narrow to one specific, nameable buyer',
		field: 'buyer',
		phase: 'sharpen',
		guidance:
			'Not "small businesses" -- "freelance wedding photographers who lose bookings to slow reply times." A crowded market for that buyer is a good sign, not a disqualifier.',
	},
	{
		n: 8,
		title: 'Stress-test the ideas',
		field: 'stress_test',
		phase: 'sharpen',
		guidance:
			'What if you had to ship in two weeks? What if you could only charge 10x more? What if you could serve only one customer, ever?',
	},
	{
		n: 9,
		title: 'Check against the idea traps',
		field: 'trap_check',
		phase: 'sharpen',
		guidance:
			'Solution in search of a problem, tar pit (looks easy, quietly defeats founders for years), the schlep filter (avoiding tedious-but-necessary work), the unsexy filter (avoiding boring spaces that are actually underserved).',
	},
	{
		n: 10,
		title: 'Score against the 10 questions',
		field: 'score_notes',
		phase: 'sharpen',
		guidance:
			'Founder-market fit, market size, problem acuteness, competition (good sign), personal want, timing, proxies in adjacent markets, long-term interest, scalability, idea-space hit rate. Hard-to-start, boring, and "competitors who all missed the same thing" are good signs that feel bad.',
	},
	{
		n: 11,
		title: 'Validate with a pitch and real money',
		field: 'validation',
		phase: 'sharpen',
		guidance:
			'One-paragraph pitch + landing-page headline, taken to 15-20 people matching your Step 7 buyer. Ask about past behavior and spend, never "would you buy this?" Push for a waitlist deposit, presale, or pledge -- dollars in hand is the only reliable signal. Then set each idea\'s verdict back at Step 6 and convert the winners.',
	},
];

export const IDEA_LAB_PHASE_LABELS: Record<IdeaLabStep['phase'], string> = {
	gather: 'Raw material',
	surface: 'Ideas',
	sharpen: 'Sharpen',
};
