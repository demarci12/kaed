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
 * One candidate run through the idea-finding process. `domains` is unused by
 * the UI (the domain-gated step it backed was removed) but stays in the
 * schema rather than being dropped -- no data loss risk for a column that
 * costs nothing sitting empty. Step 2 (market-demand evidence) is a
 * repeating log in idea_lab_evidence instead of a field here, since the
 * process explicitly asks you to log every finding, not summarize them into
 * one paragraph. The last step (decision) is a plain enum.
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

/** One step of the process: the field it edits (or 'evidence' for the market-demand log) and the condensed guidance shown above the field. */
export interface IdeaLabStep {
	n: number;
	title: string;
	field: keyof IdeaCandidate | 'evidence';
	guidance: string;
}

export const IDEA_LAB_STEPS: IdeaLabStep[] = [
	{
		n: 1,
		title: 'Mine your personal pain',
		field: 'personal_pain',
		guidance:
			'Money already spent fixing an annoyance, workarounds you built, things you Google repeatedly, complaints you make out loud, "why doesn\'t this exist" moments. Write each as: "[Who] struggles with [specific problem] when [specific situation]."',
	},
	{
		n: 2,
		title: 'Find domain-specific market demand',
		field: 'evidence',
		guidance:
			'Search relevant subreddits for frustration phrases ("wish there was", "alternative to X", "hate X"), not topic names. Read the comments, not just the post. Log every finding below. 20+ mentions across subreddits is a decent signal; 50+ across platforms is strong.',
	},
	{
		n: 3,
		title: 'Confirm money is already moving',
		field: 'money_evidence',
		guidance:
			'Existing paid tools, job postings referencing the problem, agencies/freelancers paid to solve it manually, rough ad spend in the space. A market where nobody spends money is a red flag, however painful it feels.',
	},
	{
		n: 4,
		title: 'Look for a secret',
		field: 'secret',
		guidance:
			"What valuable thing is nobody building? A field nobody's rigorously studied, or something forbidden/taboo/unsaid in this domain. The best place to look is wherever no one else is looking.",
	},
	{
		n: 5,
		title: 'Narrow to one specific, nameable buyer',
		field: 'buyer',
		guidance:
			'Not "small businesses" -- "freelance wedding photographers who lose bookings to slow reply times." A crowded market for that buyer is a good sign, not a disqualifier.',
	},
	{
		n: 6,
		title: 'Stress-test the idea',
		field: 'stress_test',
		guidance:
			'What if you had to ship in two weeks? What if you could only charge 10x more? What if you could serve only one customer, ever?',
	},
	{
		n: 7,
		title: 'Check against the idea traps',
		field: 'trap_check',
		guidance:
			"Solution in search of a problem, tar pit (looks easy, quietly defeats founders for years), the schlep filter (avoiding tedious-but-necessary work), the unsexy filter (avoiding boring spaces that are actually underserved).",
	},
	{
		n: 8,
		title: 'Score against the 10 questions',
		field: 'score_notes',
		guidance:
			'Founder-market fit, market size, problem acuteness, competition (good sign), personal want, timing, proxies in adjacent markets, long-term interest, scalability, idea-space hit rate. Hard-to-start, boring, and "competitors who all missed the same thing" are good signs that feel bad.',
	},
	{
		n: 9,
		title: 'Validate with a pitch and real money',
		field: 'validation',
		guidance:
			'One-paragraph pitch + landing-page headline, taken to 15-20 people matching your Step 5 buyer. Ask about past behavior and spend, never "would you buy this?" Push for a waitlist deposit, presale, or pledge -- dollars in hand is the only reliable signal.',
	},
	{
		n: 10,
		title: 'Decide and move',
		field: 'decision',
		guidance:
			"If it passed Steps 1-9, commit to a small scoped build and get it in front of real users fast. If it stalled at Step 9, that's data, not a dead end -- return to Step 2 or 5 with what you learned.",
	},
];
