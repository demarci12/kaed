export { requireOwner } from './auth';

export type StudySourceType = 'blog' | 'youtube' | 'x' | 'website';
export type StudyStatus = 'pending' | 'summarized' | 'failed';
export type TakeawayCategory = 'delivery' | 'marketing' | 'sales' | 'market_research' | 'other';

export const STUDY_SOURCE_LABELS: Record<StudySourceType, string> = {
	blog: 'Blog post',
	youtube: 'YouTube',
	x: 'X / Twitter',
	website: 'Website',
};

export const STUDY_STATUS_LABELS: Record<StudyStatus, string> = {
	pending: 'Pending',
	summarized: 'Summarized',
	failed: 'Failed',
};

export const TAKEAWAY_CATEGORY_LABELS: Record<TakeawayCategory, string> = {
	delivery: 'Delivery',
	marketing: 'Marketing',
	sales: 'Sales',
	market_research: 'Market research',
	other: 'Other',
};

export const TAKEAWAY_CATEGORIES = Object.keys(TAKEAWAY_CATEGORY_LABELS) as TakeawayCategory[];

export interface Study {
	id: string;
	user_id: string;
	url: string;
	title: string | null;
	source_type: StudySourceType;
	status: StudyStatus;
	error: string | null;
	fetched_at: string | null;
	created_at: string;
}

export interface StudyTakeaway {
	id: string;
	study_id: string;
	user_id: string;
	category: TakeawayCategory;
	takeaway: string;
	created_at: string;
}

export interface StudyComment {
	id: string;
	study_id: string;
	user_id: string;
	comment: string;
	created_at: string;
}

/**
 * Fetches a URL and reduces its HTML to plain-ish text. Deliberately not a
 * full readability library (no jsdom/@mozilla-readability dependency) --
 * good enough for a blog post, which is the only source type actually wired
 * up yet. YouTube/X pages are JS-rendered and won't extract cleanly through
 * a plain fetch; that's the known gap until real scraping is built later.
 */
async function extractPageText(url: string): Promise<string> {
	const response = await fetch(url, {
		headers: { 'User-Agent': 'Mozilla/5.0 (compatible; kead-study-collector/1.0)' },
		redirect: 'follow',
	});
	if (!response.ok) {
		throw new Error(`Fetching the URL returned ${response.status}.`);
	}
	const html = await response.text();

	const withoutNoise = html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
		.replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
		.replace(/<header[\s\S]*?<\/header>/gi, ' ');

	const text = withoutNoise
		.replace(/<\/(p|div|h[1-6]|li|br)>/gi, '\n')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

	if (text.length < 200) {
		throw new Error('Could not find enough readable text on that page (it may need JavaScript to render).');
	}

	// Caps cost and latency on long pages; a summary doesn't need the whole
	// article, and Claude's context is better spent on the first ~15k chars
	// (title/intro/body) than a long tail of comments or related-posts cruft.
	return text.slice(0, 15000);
}

export interface SummarizeResult {
	title: string | null;
	takeaways: { category: TakeawayCategory; takeaway: string }[];
}

const SUMMARY_PROMPT = `You are extracting startup-building takeaways from an article for a founder's personal knowledge base.

Read the article content below and extract 3-8 concise, actionable takeaways -- only ones genuinely relevant to building a startup successfully: delivery/shipping product, marketing, sales, market research, or another important startup-building lesson (fundraising, hiring, pricing, positioning, etc). Skip generic filler, skip anything not actually actionable or insightful. Each takeaway should be one or two sentences, standing on its own without needing the source article for context.

Also extract the article's title if you can determine one.

Respond with ONLY a JSON object, no other text, no markdown code fence, in exactly this shape:
{"title": "the article's title or null", "takeaways": [{"category": "delivery|marketing|sales|market_research|other", "takeaway": "the takeaway text"}]}

Article content:
`;

/**
 * Calls the Anthropic Messages API directly (no SDK dependency for one call
 * site). ANTHROPIC_API_KEY is read via process.env, not import.meta.env/
 * inlined -- same reasoning as CMC_API_KEY: keeps the key rotatable without
 * a redeploy and out of the client bundle entirely.
 */
async function callClaude(content: string): Promise<SummarizeResult> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');

	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: 'claude-sonnet-5',
			max_tokens: 2048,
			messages: [{ role: 'user', content: SUMMARY_PROMPT + content }],
		}),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(`Claude API returned ${response.status}: ${body.slice(0, 300)}`);
	}

	const json = (await response.json()) as { content?: { type: string; text?: string }[] };
	const textBlock = json.content?.find((b) => b.type === 'text');
	const raw = textBlock?.text?.trim() ?? '';

	// Strip a markdown fence if the model added one despite instructions --
	// cheaper to handle defensively than to fail the whole summarization.
	const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');

	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonText);
	} catch {
		throw new Error('Claude did not return valid JSON.');
	}

	const obj = parsed as { title?: unknown; takeaways?: unknown };
	const takeawaysRaw = Array.isArray(obj.takeaways) ? obj.takeaways : [];

	const takeaways = takeawaysRaw
		.map((t) => {
			const item = t as { category?: unknown; takeaway?: unknown };
			const category = TAKEAWAY_CATEGORIES.includes(item.category as TakeawayCategory)
				? (item.category as TakeawayCategory)
				: 'other';
			const takeaway = typeof item.takeaway === 'string' ? item.takeaway.trim() : '';
			return { category, takeaway };
		})
		.filter((t) => t.takeaway.length > 0);

	if (!takeaways.length) {
		throw new Error('Claude returned no takeaways for this page.');
	}

	return { title: typeof obj.title === 'string' ? obj.title : null, takeaways };
}

/** Fetch the URL, extract text, summarize with Claude. Throws on any failure -- caller writes status='failed' + the message. */
export async function summarizeStudy(url: string): Promise<SummarizeResult> {
	const text = await extractPageText(url);
	return callClaude(text);
}
