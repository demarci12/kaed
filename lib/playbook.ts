/**
 * The Think Pad playbook: a 13-phase business starter (the YC Startup Library
 * boiled down to ~115 steps). The steps live here, in code -- the database
 * only stores the answers (status + note per step, per run), so editing the
 * wording never needs a migration.
 *
 * Two kinds of run: the personal "You" run (phases 0-2: mindset, setup,
 * finding problems) and one run per business idea (the rest, from validating
 * the problem to scaling). Step numbers are global so a reference like "#27"
 * means the same thing everywhere.
 */

export type Scope = 'you' | 'idea';

/** Steps whose answer later steps build on; shown on the canvas and quoted where used. */
export type Anchor =
	| 'window' | 'floor' | 'advantages' | 'network' | 'team'
	| 'model' | 'customer' | 'problem' | 'why' | 'pitch' | 'outcome' | 'price' | 'channel' | 'metric';

/** todo/doing/done/skip for ordinary steps; go/pivot/kill answer a decision step. */
export type Status = 'todo' | 'doing' | 'done' | 'skip' | 'go' | 'pivot' | 'kill';
export const STATUSES: readonly Status[] = ['todo', 'doing', 'done', 'skip', 'go', 'pivot', 'kill'];
export const DECISIONS: readonly Status[] = ['go', 'pivot', 'kill'];

export interface Step {
	n: number;
	/** Short imperative title: the row. */
	t: string;
	/** The advice behind it: shown when the row is open. */
	h?: string;
	scope: Scope;
	/** `scores`: four 1-10 scores (step 24). `decision`: go / pivot / kill. */
	kind?: 'scores' | 'decision';
	/** This step's note is the anchor's answer. */
	anchor?: Anchor;
	/** Anchors this step builds on; their answers are quoted under it. */
	uses?: Anchor[];
	/** A part of the app that helps with this step. */
	link?: { href: string; label: string };
}

export interface Phase {
	id: number;
	title: string;
	goal: string;
	steps: Step[];
}

type Opts = Partial<Pick<Step, 'kind' | 'anchor' | 'uses' | 'link'>>;
const you = (n: number, t: string, h?: string, o: Opts = {}): Step => ({ n, t, h, scope: 'you', ...o });
const idea = (n: number, t: string, h?: string, o: Opts = {}): Step => ({ n, t, h, scope: 'idea', ...o });

const PAINHUNTER = { href: '/painhunter', label: 'Painhunter' };
const IDEAS = { href: '/business-ideas', label: 'Business ideas' };
const CRM = { href: '/clients', label: 'Clients' };

/** The four 1-10 scores of step 24 (Jared Friedman's method). */
export const SCORE_AXES: { key: string; label: string }[] = [
	{ key: 'market', label: 'Market size' },
	{ key: 'fit', label: 'Fit with you' },
	{ key: 'real', label: 'Problem is real' },
	{ key: 'insight', label: 'Your insight' },
];

/** Step 201 is the gate after validation; it has no number in the source list. */
export const GATE_VALIDATED = 201;

export const PHASES: Phase[] = [
	{
		id: 0, title: 'Mindset and ground rules', goal: "Starting a business means solving someone's problem in exchange for money. Everything else supports that.",
		steps: [
			you(1, 'The job: solve a problem for money', "Starting a business means solving someone's problem in exchange for money. Everything else supports that."),
			you(2, 'Expect hard and slow', 'Assume 1–2 years. YC partners say most founders quit because reality is worse than they expected, not because it is impossible.'),
			you(3, 'Do the unglamorous work yourself', 'Customer support, sales calls, deliveries. That is the job early on.'),
			you(4, 'Act in weeks, not months', 'Speed is the main advantage a small business has.'),
			you(5, 'Be honest with yourself', "Polite interest is not demand. If you have to ask whether you have product-market fit (people clearly wanting and paying for what you sell), you don't have it yet."),
			you(6, 'Spend as little as possible until something works', 'A long runway lets you try more ideas.'),
			you(7, 'Pick a commitment window', 'For example 10–15 hours a week for 90 days, with a clear decision point at the end. Write the window and the decision date.', { anchor: 'window' }),
		],
	},
	{
		id: 1, title: 'Personal setup', goal: 'Know your limits, your advantages and the people around you.',
		steps: [
			you(8, 'Check your employment contract', "Non-compete, IP ownership (who owns what you build) and side-work clauses. Don't use your employer's time, laptop or data."),
			you(9, 'Know your financial floor', 'How much you can lose, and how many months you can run without income if you go full-time.', { anchor: 'floor' }),
			you(10, 'List your unfair advantages', 'Skills, industry knowledge, network, language, location, credentials (security, privacy and automotive compliance, for example).', { anchor: 'advantages' }),
			you(11, 'List the people you know', 'Former colleagues, classmates, clients, communities. Your first customers are probably on this list.', { anchor: 'network' }),
			you(12, 'Solo or co-founder?', 'YC strongly prefers co-founders. Pick someone you have worked with and trust, and agree early on equity, roles and what happens if one of you leaves. Co-founder fights are a top killer of companies.', { anchor: 'team' }),
			you(13, 'Set up a simple workspace', 'A notes doc for ideas, a spreadsheet as your CRM (everyone you contact and where each conversation stands), and a weekly review slot in your calendar.', { link: CRM }),
		],
	},
	{
		id: 2, title: 'Finding problems', goal: 'Start from problems, not solutions. End with three ideas to test.',
		steps: [
			you(14, 'Start from problems, not solutions', 'Avoid "Uber for X", which YC calls a "solution in search of a problem".', { link: PAINHUNTER }),
			you(15, 'Keep a daily problem journal', 'Write down every annoyance, workaround and "why is this so hard?" moment, at work and in life.', { link: PAINHUNTER }),
			you(16, 'Mine your job', 'What is broken, what gets done by hand in Excel or email, what did your company build internally that others might pay for?'),
			you(17, 'Ask what you would pay for', '"What would I pay for right now?" and "What do I wish someone would build for me?"'),
			you(18, 'Look for recent changes', 'New regulations (in your field: the EU Cyber Resilience Act, NIS2, the AI Act), new technology (AI), new platforms, new behaviour.'),
			you(19, 'Copy what already works elsewhere', "Successful businesses in other countries or industries that haven't reached your market yet."),
			you(20, 'Read complaints', 'Reddit, Facebook groups, 1–3 star reviews of competitors, industry forums.'),
			you(21, 'Ask people about their pain', 'Especially people in specialist industries and other founders.'),
			you(22, 'Turn off the bad filters', "Don't dismiss ideas because they are boring, messy, sound too ambitious or already have competitors. Competition proves demand."),
			you(23, 'Prefer a few who want it badly', 'A few people who want it badly beat many who want it mildly.'),
			idea(24, 'Score this idea 1–10 on four things', "Jared Friedman's method: market size, how well it fits your skills and background, how sure you are the problem is real, and whether you have an insight others don't. Take the average.", { kind: 'scores' }),
			idea(25, 'Pick a business model early', "YC's guide lists nine common ones, including SaaS, transactional, marketplace, usage-based, hardware, ads, consulting/services and e-commerce. Each has a different key number to watch.", { anchor: 'model' }),
			you(26, 'Shortlist 3 ideas, then test them', "Don't fall in love with one.", { link: IDEAS }),
		],
	},
	{
		id: 3, title: 'Validate the problem', goal: 'Before building anything: talk to 20–50 target customers without pitching.',
		steps: [
			idea(27, 'Define one specific target customer', "Role, industry, company size, location, the exact situation they're in.", { anchor: 'customer' }),
			idea(28, 'Find 20–50 of them', 'Start with your network, then second-degree LinkedIn connections, communities and events.', { uses: ['customer', 'network'] }),
			idea(29, 'Book short calls or in-person chats', 'Video or face-to-face beats surveys by a wide margin.', { link: CRM }),
			idea(30, "Don't mention your idea", 'Not until the end, or at all.'),
			idea(31, 'Ask what they actually do today', '"Tell me how you handle X today." "What is the hardest part, and why?" "How often does it happen?" "What does it cost you in time or money?" "What have you tried? What do you pay for now?" "Can you show me?" Watching them do it beats hearing about it.', { uses: ['customer'] }),
			idea(32, 'Avoid bad questions', '"Would you use this?", "Which features do you want?", yes/no questions, and two questions at once.'),
			idea(33, 'Dig deeper', '"Tell me more", "Why does that matter?", "What happened last time?"'),
			idea(34, 'Take notes, find the repeating problem', 'Notes on every call, grouped by problem. Which problem comes up again and again? Write it in one sentence.', { anchor: 'problem' }),
			idea(35, 'Watch for strong signals', 'They already pay for a bad solution, they hacked together their own fix, they get emotional, or they ask "when can I have it?"'),
			idea(36, 'Watch for weak signals', '"Cool idea", "keep me posted", "my friend might need this".'),
			idea(37, 'Check if money is already spent here', 'Are people paying consultants or tools for this problem? If yes, good.', { uses: ['problem'] }),
			idea(38, 'Check how hard they are to sell to', 'Startups and tech people try new things fast. Trades, government and large enterprises are slow.', { uses: ['customer'] }),
			idea(39, 'Ask "Why me?"', 'Why are you the right person to solve this?', { anchor: 'why', uses: ['advantages', 'customer'] }),
			idea(GATE_VALIDATED, 'Gate: is the problem real?', 'Strong signals, a repeating problem, money already spent. Go on to the offer, pivot the customer or the problem, or kill it.', { kind: 'decision', uses: ['problem', 'customer'] }),
		],
	},
	{
		id: 4, title: 'The offer and pricing', goal: 'One plain sentence, an outcome, and a price you charge from day one.',
		steps: [
			idea(40, 'Write a one-sentence pitch', '"We help [who] do [what] without [pain]." Plain words, no buzzwords.', { anchor: 'pitch', uses: ['customer', 'problem'] }),
			idea(41, 'Define the outcome, not features', 'Time saved, money made, risk removed, an audit passed.', { anchor: 'outcome', uses: ['problem'] }),
			idea(42, 'Price on value, not on your costs', "Segment's founder said they underpriced for years. Kevin Hale's Startup pricing 101 covers the basics. Write the price.", { anchor: 'price', uses: ['outcome', 'customer'] }),
			idea(43, 'Charge from day one', "Free users aren't customers. For business customers, offer a money-back guarantee instead of a free trial.", { uses: ['price'] }),
			idea(44, 'Raise prices until some complain', 'Until some customers complain but most still pay.', { uses: ['price'] }),
			idea(45, 'Consider 2–3 tiers', 'Basic / standard / premium. Most people pick the middle one.', { uses: ['price'] }),
			idea(46, 'Check your unit economics', 'The money made or lost on each customer: cost of getting a customer < lifetime profit per customer. Know your gross margin.', { uses: ['price', 'model'] }),
			idea(47, 'Remove risk for the buyer', 'Guarantees, pilots, monthly instead of annual terms, case studies, your personal reputation.'),
		],
	},
	{
		id: 5, title: 'Pre-sell', goal: 'Proof before building: try to get paid for something that does not exist yet.',
		steps: [
			idea(48, 'Build a one-page landing page', 'The problem, the offer, the price and a call to action.', { uses: ['pitch', 'outcome', 'price'] }),
			idea(49, 'Ask for money or a firm commitment', 'Pre-orders, deposits, a signed letter of intent, a paid pilot.', { uses: ['price', 'customer'] }),
			idea(50, 'Smoke test if you cannot pre-sell', 'A sign-up page or waitlist. Dropbox validated with a demo video.'),
			idea(51, 'Try to sell before you build', "Paul Buchheit's advice: even if the idea is bad, selling it often reveals the real idea."),
			idea(52, 'Decide after about 20 real pitches', 'If nobody pays: change the customer, change the offer, or kill the idea.', { kind: 'decision', uses: ['pitch', 'price'] }),
		],
	},
	{
		id: 6, title: 'Build the first version', goal: 'The minimum viable product: small, remarkable at one thing, shipped in weeks.',
		steps: [
			idea(53, 'Aim for a minimum remarkable product', 'Small, but excellent at one thing for one customer.', { uses: ['outcome', 'customer'] }),
			idea(54, 'Do it by hand first', 'You can be the software or the service, then automate the parts you repeat.'),
			idea(55, 'Use no-code and cheap tools', 'Forms, spreadsheets, Notion, Stripe payment links, Shopify, WhatsApp.'),
			idea(56, 'Set a deadline and ship', 'Two to six weeks. Ship even if it is embarrassing.'),
			idea(57, 'Track your 5–7 key customer actions', "From day one (Suhail Doshi of Mixpanel). Missing data can't be recovered later."),
			idea(58, 'No big redesigns', 'Fix one thing at a time.'),
			idea(59, 'Build only what customers ask for', 'Writing code without customers is "the wrong order of operations" (Segment).'),
		],
	},
	{
		id: 7, title: 'Get your first customers', goal: 'Customers 1–3 from people you know, 4–10 from things that do not scale.',
		steps: [
			idea(60, 'Customers 1–3 come from people you know', "In YC's founder survey there were basically no exceptions.", { uses: ['network'] }),
			idea(61, 'Customers 4–10: do things that do not scale', 'Show up in person (offices, shops, small industry conferences). Host small dinners for 6–10 potential customers. Message people who complained online. Offer free help, an audit or a review before you pitch. Ask potential buyers for advice, but only if you genuinely want it.', { uses: ['customer'] }),
			idea(62, 'Work out where your customer spends time', "Cold email doesn't reach truck dispatchers. Trade shows might. Write the one place to start.", { anchor: 'channel', uses: ['customer'] }),
			idea(63, 'Follow the cold outreach rules', "Under 75 words, plain text, no jargon. Say you're the founder, plus one piece of credibility. One clear ask (a 15-minute call?). Read it out loud; if it sounds like AI wrote it, rewrite it. Follow up 3–4 times over about 2 weeks.", { uses: ['pitch', 'customer', 'channel'] }),
			idea(64, 'Run sales as a funnel', 'List → contact → reply → meeting/demo → price → close → onboard.', { link: CRM }),
			idea(65, 'Work backwards from your goal', `If 500 messages lead to about 2 customers, 100 messages leads to 0. Don't conclude "sales doesn't work" too early.`),
			idea(66, 'Go for the easiest customers first', 'Drop slow, hesitant prospects politely.'),
			idea(67, 'Look for early adopters', "Most people ignore new products, so you need volume to find the ones who don't."),
			idea(68, 'Do the selling yourself', 'Until you know exactly what works. Only then hire salespeople.'),
			idea(69, 'Onboard personally', 'So customers actually use what they bought. Skipping this causes cancellations.'),
			idea(70, 'Launch again and again', 'A single big launch rarely matters. Launch every new feature or update (Kat Mañalac, How to launch again and again).'),
		],
	},
	{
		id: 8, title: 'Make customers love it', goal: 'Retention: are they still here a month later?',
		steps: [
			idea(71, 'Give customers your phone and email', 'No "do not reply" addresses.'),
			idea(72, 'Respond fast, fix problems the same day'),
			idea(73, 'Do things that surprise people', 'Handwritten thank-you notes, extra help.'),
			idea(74, 'Turn angry users into fans', 'Solving their problem well often makes them your most loyal customers.'),
			idea(75, 'Create a customer group', 'WhatsApp or Slack, so early users feel like insiders.'),
			idea(76, 'Ask for referrals and testimonials', 'Once a customer is happy.'),
			idea(77, 'Measure retention by cohort', 'Group customers by the week they joined: are they still using or buying a month later? This is the most important number. Without it, growth burns out.', { uses: ['metric'] }),
			idea(78, 'Track spending per customer over time', "In one study Adam D'Angelo cites, customers spending more over time was the strongest predictor of company valuation."),
		],
	},
	{
		id: 9, title: 'Measure and iterate', goal: 'One metric, checked weekly; change one thing at a time; kill fast.',
		steps: [
			idea(79, 'Choose one main metric', 'Revenue, active customers or transactions.', { anchor: 'metric' }),
			idea(80, 'Check numbers weekly, graph the growth', 'Weekly, not daily. 5–10% a week is excellent early on.', { uses: ['metric'] }),
			idea(81, 'Explain every change', '"We are up 20% because…"'),
			idea(82, 'Change one thing at a time', 'Price, target customer, channel, message or offer.'),
			idea(83, 'Know what you are changing', "The product or the customer. Don't change both at once without noticing."),
			idea(84, 'Keep a decision log', 'What you tried, what happened and what you learned.'),
			idea(85, 'Kill ideas quickly', "Codecademy's founders tried about 12 ideas in 7 weeks before one worked. Stop when you are out of ideas for making it work, not when you are tired.", { kind: 'decision', uses: ['metric'] }),
			idea(86, 'Recognise real product-market fit', 'Demand overwhelms you, customers ask for things before they exist, and it grows even though the product is broken in places.'),
		],
	},
	{
		id: 10, title: 'Legal, finance and admin', goal: 'When money starts coming in.',
		steps: [
			idea(87, 'Register once customers pay', 'In Hungary, ask an accountant (könyvelő) whether a sole proprietorship (egyéni vállalkozó) or a limited company (Kft.) fits better.'),
			idea(88, 'Open a separate business bank account', 'Never mix personal and business money.'),
			idea(89, 'Set up invoicing, set aside tax', 'Set aside tax from every payment.'),
			idea(90, 'Use simple contracts and terms', 'Service agreements, privacy policy, GDPR compliance (your strength).'),
			idea(91, 'Protect your IP', 'Your domain name, trademark if relevant, and code or content ownership.'),
			idea(92, 'Get insurance if you need it', 'If you do physical work or handle sensitive data.'),
			idea(93, 'Track the monthly basics', 'Revenue, costs, profit and cash in the bank.'),
		],
	},
	{
		id: 11, title: 'Growth and scaling', goal: 'Double down on what works; scale only what already converts.',
		steps: [
			idea(94, 'Double down on the one channel that works', 'Before adding a second.', { uses: ['channel'] }),
			idea(95, 'Turn on scalable channels', 'SEO, content, ads, partnerships, referral programs, outbound tools (Apollo, Clay), after manual sales work. Scaling a channel before you have a message that converts just burns money.', { uses: ['pitch', 'channel'] }),
			idea(96, 'Build things that compound', 'Word of mouth, referrals, content, community. Growth from existing customers bringing new ones is the strongest kind.'),
			idea(97, 'Build a personal brand', 'Share what you learn publicly. It builds trust and brings customers to you.'),
			idea(98, 'Write down and automate repeated work', 'Then delegate it.'),
			idea(99, 'Hire slowly, fire fast', 'Your first hires should take on your own repetitive work.'),
			idea(100, 'Expand into neighbouring problems', "Happy customers will tell you what else they'd pay for."),
			idea(101, 'Build defensibility', 'Things that are hard to copy: relationships, proprietary data, workflow lock-in, trust, compliance credentials, network effects.', { uses: ['advantages'] }),
			idea(102, 'Raise outside money only to speed up what works', 'Many side businesses never need investors.', { uses: ['metric'] }),
		],
	},
	{
		id: 12, title: 'Avoid the classic killers', goal: 'Paul Graham’s mistakes that kill startups. Mark each done once you have honestly checked it is not happening to you.',
		steps: [
			idea(103, 'Building something nobody wants', 'The #1 killer. Did customers pay or commit before you built?'),
			idea(104, 'A market too small or too obscure to grow'),
			idea(105, 'Co-founder conflicts'),
			idea(106, 'Copying a business that was already a bad idea'),
			idea(107, 'Not launching, or launching too late'),
			idea(108, 'No specific customer in mind', undefined, { uses: ['customer'] }),
			idea(109, 'Raising or spending too much too early'),
			idea(110, 'Hiring badly or too early'),
			idea(111, 'Being too stubborn, or giving up too easily'),
			idea(112, 'Avoiding sales and customer conversations'),
			idea(113, 'Working on it only half-heartedly', undefined, { uses: ['window'] }),
			idea(114, 'Burnout', 'Protect sleep, health and relationships: motivation is about three quarters of the game.'),
		],
	},
];

export const ALL_STEPS: Step[] = PHASES.flatMap((p) => p.steps);
const STEP_BY_N = new Map(ALL_STEPS.map((s) => [s.n, s]));

export const stepByNumber = (n: number): Step | undefined => STEP_BY_N.get(n);

/** Where an anchor's answer lives: which step, and which run it is in. */
export const ANCHORS: Record<Anchor, { label: string; step: number }> = {
	window: { label: 'Commitment window', step: 7 },
	floor: { label: 'Financial floor', step: 9 },
	advantages: { label: 'Unfair advantages', step: 10 },
	network: { label: 'People I know', step: 11 },
	team: { label: 'Solo or co-founder', step: 12 },
	model: { label: 'Business model', step: 25 },
	customer: { label: 'Target customer', step: 27 },
	problem: { label: 'The problem', step: 34 },
	why: { label: 'Why me', step: 39 },
	pitch: { label: 'One-line pitch', step: 40 },
	outcome: { label: 'Outcome delivered', step: 41 },
	price: { label: 'Price', step: 42 },
	channel: { label: 'Where they are', step: 62 },
	metric: { label: 'Main metric', step: 79 },
};

export const anchorScope = (a: Anchor): Scope => stepByNumber(ANCHORS[a].step)?.scope ?? 'idea';

/** The anchors shown on a run's canvas, in the order the work happens. */
export const CANVAS: Record<Scope, Anchor[]> = {
	you: ['window', 'floor', 'advantages', 'network', 'team'],
	idea: ['customer', 'problem', 'why', 'pitch', 'outcome', 'model', 'price', 'channel', 'metric'],
};

/** Phases with only the steps of one run; phases left empty are dropped. */
export function phasesFor(scope: Scope): Phase[] {
	return PHASES.map((p) => ({ ...p, steps: p.steps.filter((s) => s.scope === scope) })).filter((p) => p.steps.length > 0);
}

export interface Answer {
	status: Status;
	note: string;
	/** Only the scores step: `{ market, fit, real, insight }`, each 1-10. */
	data: Record<string, number> | null;
}

export const EMPTY_ANSWER: Answer = { status: 'todo', note: '', data: null };

/** Statuses a step can take: a decision answers go/pivot/kill, everything else the work states. */
export function allowedStatuses(step: Step): readonly Status[] {
	return step.kind === 'decision' ? ['todo', ...DECISIONS, 'skip'] : ['todo', 'doing', 'done', 'skip'];
}

/** "Finished" for progress: done, skipped or decided -- not todo or doing. */
export const isFinished = (status: Status | undefined): boolean => !!status && status !== 'todo' && status !== 'doing';

export function progress(steps: Step[], answers: Record<number, Pick<Answer, 'status'> | undefined>): { done: number; total: number } {
	return { done: steps.filter((s) => isFinished(answers[s.n]?.status)).length, total: steps.length };
}

/** Mean of the scores that are filled in, one decimal; null when none are. */
export function scoreAverage(data: Record<string, number> | null | undefined): number | null {
	const values = SCORE_AXES.map((a) => data?.[a.key]).filter((v): v is number => typeof v === 'number');
	return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
}

export const NOTE_MAX = 4000;
