import type { CmsSite } from './cms';

/** What the model returns for one article (the `save_post` tool's input). */
export interface GeneratedPost {
	title: string;
	slug: string;
	description: string;
	excerpt: string;
	keywords: string[];
	body_md: string;
	cover_alt: string;
}

const MODEL = 'claude-sonnet-5-5';

const TOOL = {
	name: 'save_post',
	description: 'Save the finished blog article.',
	input_schema: {
		type: 'object',
		properties: {
			title: { type: 'string', description: 'SEO title, at most 60 characters, primary keyword near the start.' },
			slug: { type: 'string', description: 'Lowercase ASCII URL slug, words separated by hyphens.' },
			description: { type: 'string', description: 'Meta description, 140-160 characters, ends with a soft call to action.' },
			excerpt: { type: 'string', description: 'Two-sentence teaser for a blog index card.' },
			keywords: { type: 'array', items: { type: 'string' }, description: '4-8 target keywords/phrases.' },
			body_md: { type: 'string', description: 'The full article in Markdown. Start at ## headings (no # title). Do not repeat the title.' },
			cover_alt: { type: 'string', description: 'A one-sentence description of a fitting cover photo, used as its alt text.' },
		},
		required: ['title', 'slug', 'description', 'excerpt', 'keywords', 'body_md', 'cover_alt'],
	},
} as const;

const LANGUAGE_NAMES: Record<string, string> = { hu: 'Hungarian', en: 'English', de: 'German' };

function systemPrompt(site: CmsSite) {
	const language = LANGUAGE_NAMES[site.language] ?? site.language;
	return [
		`You are the senior SEO content writer for ${site.name}${site.domain ? ` (${site.domain})` : ''}.`,
		`Write in ${language}, natively and naturally — never translated-sounding, no filler, no "as an AI".`,
		site.brand_context?.trim()
			? `About the business, its audience, services, tone and rules:\n${site.brand_context.trim()}`
			: 'No business brief was provided; write helpful, practical, consumer-facing guidance.',
		[
			'Article requirements:',
			'- 1100-1600 words, genuinely useful: answer the reader\'s question fully and concretely.',
			'- Markdown body starting at "##" headings: a short intro paragraph, 4-7 sections with descriptive headings, lists or a table where they help, and a final "## Gyakori kérdések"-style FAQ (translated to the article language) with 3-4 questions.',
			'- Use the primary keyword naturally in the title, first paragraph and one heading; no keyword stuffing.',
			'- Never invent statistics, prices, legal intervals, certifications, awards, testimonials or claims about the business. Where a number or regulation matters, stay general and tell the reader to check the current rules or ask a professional.',
			'- End with a brief, low-pressure call to action pointing to the business (no fake urgency).',
			'- Do not include the title as an H1 in the body.',
			'- If the brief contains source material (a manual excerpt, a table of codes or facts, a draft with front matter), treat it as authoritative: build the article from those facts only, keep every code/value/step accurate, and never add codes, specifications or procedures that are not in it. Reuse its title, slug and description if present (tightened to the length limits).',
		].join('\n'),
	].join('\n\n');
}

/** Turns one idea into a finished article via Claude, returned through a tool call so the output is structured. */
export async function generatePost(site: CmsSite, idea: string, existingTitles: string[]): Promise<GeneratedPost> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');

	const userMessage = [
		`Idea / brief for the next article:\n${idea.trim()}`,
		existingTitles.length
			? `Articles that already exist on the site — do not duplicate their angle:\n${existingTitles.map((t) => `- ${t}`).join('\n')}`
			: '',
		`Write the article now and deliver it by calling the ${TOOL.name} tool. Do not reply with plain text.`,
	].filter(Boolean).join('\n\n');

	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: MODEL,
			max_tokens: 8000,
			system: systemPrompt(site),
			tools: [TOOL],
			messages: [{ role: 'user', content: userMessage }],
		}),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(`Claude API returned ${response.status}: ${body.slice(0, 300)}`);
	}

	const json = (await response.json()) as { content?: { type: string; input?: Record<string, unknown> }[] };
	const input = json.content?.find((b) => b.type === 'tool_use')?.input;
	if (!input) throw new Error('Claude did not return an article.');

	const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
	const post: GeneratedPost = {
		title: str(input.title),
		slug: str(input.slug),
		description: str(input.description),
		excerpt: str(input.excerpt),
		keywords: Array.isArray(input.keywords) ? input.keywords.map(str).filter(Boolean).slice(0, 10) : [],
		body_md: str(input.body_md),
		cover_alt: str(input.cover_alt),
	};
	if (!post.title || post.body_md.length < 500) throw new Error('Claude returned an incomplete article.');
	return post;
}
