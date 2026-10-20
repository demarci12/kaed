import type { PainSource } from './painhunter';

/**
 * The "where to look" guide shown on /painhunter. Wording is verbatim from the
 * source note -- edit the text here, not in the component. The seven methods
 * line up one-to-one with the pain `source` values, so each can show how many
 * pains were found that way.
 */
export interface GuideMethod {
	n: number;
	source: PainSource;
	title: string;
	lead: string;
	bullets?: string[];
	tail?: string;
}

export const GUIDE_LEDE = `YC's advice still holds: notice problems, don't brainstorm ideas.`;

export const GUIDE_METHODS: GuideMethod[] = [
	{
		n: 1,
		source: 'journal',
		title: `Keep a "frustration journal" for 30 days`,
		lead: `Every day, write down anything that is slow, manual, annoying, expensive or done in Excel. Write it at work, at home, at university, when dealing with government offices, banks or doctors. Write problems, not solutions. Paul Graham recommends exactly this in How to Get Startup Ideas: note the "gaps and anomalies" you see each day. After a month you'll have 50–100 entries, and patterns will show up.`,
	},
	{
		n: 2,
		source: 'build-test',
		title: `Use the "Why doesn't someone build X?" test`,
		lead: `Think back over your whole career and studies. When did you or your colleagues say, "If someone made this, we'd buy it tomorrow"? Every such moment is a sign of real demand. Write each one down.`,
	},
	{
		n: 3,
		source: 'interview',
		title: `Interview people outside your own field`,
		lead: `Pick 10 people you know in different jobs: a factory manager, an accountant, a doctor, a logistics coordinator, a lawyer, a small-business owner. Ask them:`,
		bullets: [
			`"What's the most tedious part of your week?"`,
			`"What do you still do in Excel, on paper, or by email?"`,
			`"What do you pay consultants or agencies to do that feels like it should be automated?"`,
		],
		tail: `Don't pitch anything; just listen. Gustaf's talk How to talk to users has the exact questions to ask.`,
	},
	{
		n: 4,
		source: 'money',
		title: `Follow the money already being spent`,
		lead: `The best ideas usually replace an existing expense. Look for:`,
		bullets: [
			`Work done by consultants or agencies that is repetitive. AI can now do much of this kind of work.`,
			`Back-office jobs where whole teams copy data between systems.`,
			`Excel-heavy processes: every complicated spreadsheet is a possible product.`,
		],
	},
	{
		n: 5,
		source: 'why-now',
		title: `Ask "why now?"`,
		lead: `Good ideas usually come from a recent change. For each one, ask what new possibilities it opens:`,
		bullets: [
			`AI and LLMs: what work that used to need people can now be automated? Examples: reading documents, filling in forms, phone calls, checking compliance. See Startup Ideas You Can Now Build With AI.`,
			`New laws: the EU has passed many new rules recently, including the AI Act, ESG reporting, e-invoicing mandates, the Accessibility Act, digital product passports and new payment rules. Every new rule creates compliance work someone has to do.`,
			`Changing behavior: for example, aging populations, remote work and the shortage of skilled trades workers.`,
		],
	},
	{
		n: 6,
		source: 'boring',
		title: `Look in "boring" industries`,
		lead: `Graham says to deliberately look at unsexy, messy problems that other founders avoid. Good places to look:`,
		bullets: [
			`Logistics and freight`,
			`Manufacturing operations`,
			`Construction`,
			`Accounting and tax`,
			`Insurance claims`,
			`Healthcare administration`,
			`Public sector suppliers`,
			`Agriculture`,
		],
		tail: `Central Europe has many traditional mid-sized companies in these industries that still run on paper and Excel.`,
	},
	{
		n: 7,
		source: 'funded-gap',
		title: `Study what's being funded and look at the gaps`,
		lead: `Browse recent batches in YC's Requests for Startups and the company directory. Don't copy them. Ask instead: is this solved for Europe or for Central and Eastern Europe? Has anyone done it for a specific industry?`,
	},
];

export const GUIDE_AVOID = {
	title: `What to avoid`,
	bullets: [
		`"Tarpit" ideas: ideas many people come up with, that everyone likes, but that keep failing. Examples: apps for planning events with friends, restaurant discovery apps, social networks for a hobby. See Tarpit Ideas: The Sequel.`,
		`Solutions without a problem, like "Copilot for X," unless you have actually seen the pain.`,
		`Ideas that need everyone to change behavior at once.`,
	],
};

export const GUIDE_FILTER = {
	title: `How to filter the list`,
	lead: `Score each problem from 1 to 5 on:`,
	criteria: [
		{ term: `Pain`, text: `do people complain about it without being asked?` },
		{ term: `Frequency`, text: `how often does it happen: daily, weekly, yearly?` },
		{ term: `Money`, text: `does anyone already pay to solve it?` },
		{ term: `Access`, text: `can you reach 20 people who have this problem?` },
		{ term: `Fit`, text: `do you care about it, and could you work on it for 5+ years?` },
	],
	tail: `Keep the top 3 and run 10 interviews on each. Pick the one where people say "I need this now."`,
};

export interface GuideStep { text: string; children?: string[] }

export const GUIDE_WEEKS = {
	title: `Your first two weeks`,
	steps: [
		{ text: `Days 1–3: list every frustration you can remember from your jobs, studies and daily life. Aim for 30+.` },
		{
			text: `Days 4–10:`,
			children: [
				`Talk to 10 people in different jobs and add their problems to the list.`,
				`Keep the journal going every day.`,
			],
		},
		{
			text: `Days 11–14:`,
			children: [
				`Score the list and pick your top 3.`,
				`Watch Jared Friedman's How to get startup ideas and Jon Xu's How To Pick A Startup Idea.`,
			],
		},
	] as GuideStep[],
};
