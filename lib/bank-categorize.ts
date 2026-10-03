import type { BankTransaction } from './banking';
import type { FinanceCategory } from './finance';

/**
 * Claude suggests a finance category for inbox rows. It only ever *suggests*:
 * the suggestion pre-fills the category picker and the owner still clicks File,
 * so a wrong guess costs a glance, not a miscounted budget. Same raw-fetch
 * style as lib/cms-generate.ts.
 */

// Classification, not writing: the small model is plenty and ~10x cheaper than Sonnet.
const MODEL = 'claude-haiku-4-5-20251001';
export const BATCH_SIZE = 40;

export type Confidence = 'high' | 'medium' | 'low';
export interface Suggestion { categoryId: string; confidence: Confidence }

type Category = Pick<FinanceCategory, 'id' | 'name' | 'type'>;
export interface Example { counterparty: string; category: string }

const TOOL = {
	name: 'save_categories',
	description: 'Record the best category for each bank transaction.',
	input_schema: {
		type: 'object',
		properties: {
			results: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						tx: { type: 'integer', description: 'The transaction number from the list.' },
						category_id: { type: ['string', 'null'], description: 'Exact id of the best category, or null if none fits or you are unsure.' },
						confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
					},
					required: ['tx', 'category_id', 'confidence'],
				},
			},
		},
		required: ['results'],
	},
} as const;

const SYSTEM = [
	'You categorise personal bank transactions (Hungarian household, mostly HUF, some EUR/USD) into the owner\'s own budget categories.',
	'Use only the category ids you are given. Money out normally maps to an expense or saving category; money in to an income category.',
	'Prefer the owner\'s past choices (examples) when the counterparty matches or is clearly the same merchant.',
	'If nothing fits well, or the transaction is a transfer between the owner\'s own accounts, return category_id null. Never guess wildly: low confidence beats a wrong confident answer.',
].join('\n');

/** One batch (<= BATCH_SIZE rows). Returns suggestions keyed by bank_transactions.id; unsure rows are omitted. */
export async function suggestBatch(txs: BankTransaction[], categories: Category[], examples: Example[]): Promise<Record<string, Suggestion>> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');
	if (!txs.length || !categories.length) return {};

	const valid = new Set(categories.map((c) => c.id));
	const user = [
		`Categories (id | type | name):\n${categories.map((c) => `${c.id} | ${c.type} | ${c.name}`).join('\n')}`,
		examples.length ? `The owner's past choices (counterparty -> category):\n${examples.map((e) => `${e.counterparty} -> ${e.category}`).join('\n')}` : '',
		`Transactions to categorise (number | direction | amount | counterparty | reference):\n${txs
			.map((t, i) => `${i} | ${t.direction === 'in' ? 'IN' : 'OUT'} | ${t.amount} ${t.currency} | ${t.counterparty ?? '-'} | ${(t.remittance ?? '-').slice(0, 120)}`)
			.join('\n')}`,
		`Deliver the answer by calling ${TOOL.name} with one result per transaction number.`,
	].filter(Boolean).join('\n\n');

	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: MODEL,
			max_tokens: 4000,
			system: SYSTEM,
			tools: [TOOL],
			tool_choice: { type: 'tool', name: TOOL.name },
			messages: [{ role: 'user', content: user }],
		}),
	});
	if (!res.ok) throw new Error(`Claude API returned ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);

	const json = (await res.json()) as { content?: { type: string; input?: { results?: { tx?: number; category_id?: string | null; confidence?: string }[] } }[] };
	const results = json.content?.find((b) => b.type === 'tool_use')?.input?.results ?? [];

	const out: Record<string, Suggestion> = {};
	for (const r of results) {
		const tx = typeof r.tx === 'number' ? txs[r.tx] : undefined;
		// The model may only pick ids it was given; anything else is dropped rather than trusted.
		if (!tx || !r.category_id || !valid.has(r.category_id)) continue;
		const confidence: Confidence = r.confidence === 'high' || r.confidence === 'medium' ? r.confidence : 'low';
		out[tx.id] = { categoryId: r.category_id, confidence };
	}
	return out;
}
