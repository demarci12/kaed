export { requireOwner } from './auth';

export interface Investment {
	id: string;
	user_id: string;
	symbol: string;
	cmc_slug: string | null;
	quantity: number;
	cost_basis_huf: number;
	goal_price_usd: number | null;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

/** A live quote for one holding, in both currencies. */
export interface Quote {
	priceUsd: number;
	priceHuf: number;
}

export interface PriceResult {
	quotes: Record<string, Quote>;
	/** HUF per USD, derived from the same call so the two can't drift apart. */
	usdHuf: number | null;
	fetchedAt: string;
	/** Symbols the API had no price for, surfaced instead of shown as zero. */
	missing: string[];
	error?: string;
}

/**
 * CoinMarketCap rate-limits hard on the free tier, and a page refresh must
 * not cost a credit. One shared cache per server instance; a cold start just
 * pays for one fetch.
 */
export const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; key: string; result: PriceResult } | null = null;

/**
 * Cache identity is the set of holdings, not just time. Keyed on time alone,
 * adding a coin would return the previous result for up to five minutes and
 * the new row would render as "no price returned" until the TTL lapsed.
 */
function cacheKey(holdings: { symbol: string; cmc_slug: string | null }[]): string {
	return holdings
		.map((h) => `${h.symbol.toUpperCase()}:${h.cmc_slug ?? ''}`)
		.sort()
		.join('|');
}

const CMC_BASE = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';
const CMC_FX = 'https://pro-api.coinmarketcap.com/v2/tools/price-conversion';

interface CmcEntry {
	symbol?: string;
	quote?: Record<string, { price?: number } | undefined>;
}

async function cmcFetch(params: string, apiKey: string): Promise<Record<string, unknown>> {
	const response = await fetch(`${CMC_BASE}?${params}`, {
		headers: { 'X-CMC_PRO_API_KEY': apiKey, Accept: 'application/json' },
	});
	if (!response.ok) {
		throw new Error(`CoinMarketCap returned ${response.status}`);
	}
	const json = (await response.json()) as { data?: Record<string, unknown> };
	return json.data ?? {};
}

function readUsd(entry: CmcEntry): number | null {
	const usd = entry.quote?.USD?.price;
	return typeof usd === 'number' ? usd : null;
}

/**
 * The free CoinMarketCap plan allows exactly one `convert` option per call, so
 * quotes come back in USD (the default) and the forint rate is fetched once
 * from the conversion endpoint. Every HUF figure on the page is then USD price
 * times this single rate, which keeps the displayed rate and the rate actually
 * used identical.
 */
async function fetchUsdHuf(apiKey: string): Promise<number | null> {
	const response = await fetch(`${CMC_FX}?amount=1&symbol=USD&convert=HUF`, {
		headers: { 'X-CMC_PRO_API_KEY': apiKey, Accept: 'application/json' },
	});
	if (!response.ok) return null;
	const json = (await response.json()) as { data?: unknown };
	const row = Array.isArray(json.data) ? json.data[0] : json.data;
	const price = (row as { quote?: { HUF?: { price?: number } } } | undefined)?.quote?.HUF?.price;
	return typeof price === 'number' && price > 0 ? price : null;
}

export async function fetchPrices(
	holdings: { symbol: string; cmc_slug: string | null }[],
	apiKey: string | undefined,
	options: { force?: boolean } = {},
): Promise<PriceResult> {
	const key = cacheKey(holdings);
	if (!options.force && cache && cache.key === key && Date.now() - cache.at < CACHE_TTL_MS) {
		return cache.result;
	}

	const empty: PriceResult = { quotes: {}, usdHuf: null, fetchedAt: new Date().toISOString(), missing: [] };

	if (!apiKey) {
		return { ...empty, missing: holdings.map((h) => h.symbol), error: 'CMC_API_KEY is not set.' };
	}
	if (!holdings.length) return empty;

	const usdPrices: Record<string, number> = {};
	const bySymbol = holdings.filter((h) => !h.cmc_slug);
	const bySlug = holdings.filter((h) => h.cmc_slug);
	let usdHuf: number | null = null;

	try {
		// One batched symbol lookup, one call per slug, and one FX lookup --
		// CoinMarketCap rejects mixing symbol and slug in a single call.
		const requests: Promise<void>[] = [];

		if (bySymbol.length) {
			const symbols = [...new Set(bySymbol.map((h) => h.symbol.toUpperCase()))].join(',');
			requests.push(
				cmcFetch(`symbol=${encodeURIComponent(symbols)}`, apiKey).then((data) => {
					for (const holding of bySymbol) {
						// A symbol query can return either a single entry or an
						// array of same-ticker coins across chains; take the first.
						const raw = data[holding.symbol.toUpperCase()];
						const entry = (Array.isArray(raw) ? raw[0] : raw) as CmcEntry | undefined;
						const usd = entry ? readUsd(entry) : null;
						if (usd != null) usdPrices[holding.symbol] = usd;
					}
				}),
			);
		}

		for (const holding of bySlug) {
			requests.push(
				cmcFetch(`slug=${encodeURIComponent(holding.cmc_slug!)}`, apiKey).then((data) => {
					// Slug queries are keyed by numeric CMC id, not by symbol.
					const first = Object.values(data)[0] as CmcEntry | undefined;
					const usd = first ? readUsd(first) : null;
					if (usd != null) usdPrices[holding.symbol] = usd;
				}),
			);
		}

		requests.push(
			fetchUsdHuf(apiKey).then((rate) => {
				usdHuf = rate;
			}),
		);

		await Promise.all(requests);
	} catch (error) {
		return {
			...empty,
			missing: holdings.map((h) => h.symbol),
			error: error instanceof Error ? error.message : 'Price lookup failed.',
		};
	}

	// Without an FX rate every forint figure would be wrong rather than
	// missing, so treat it as a hard failure instead of quietly showing zeros.
	if (usdHuf == null) {
		return { ...empty, missing: holdings.map((h) => h.symbol), error: 'Could not fetch the USD/HUF rate.' };
	}

	const rate: number = usdHuf;
	const quotes: Record<string, Quote> = {};
	for (const [symbol, priceUsd] of Object.entries(usdPrices)) {
		quotes[symbol] = { priceUsd, priceHuf: priceUsd * rate };
	}

	const result: PriceResult = {
		quotes,
		usdHuf: rate,
		fetchedAt: new Date().toISOString(),
		missing: holdings.filter((h) => !quotes[h.symbol]).map((h) => h.symbol),
	};

	cache = { at: Date.now(), key, result };
	return result;
}

export interface PositionMetrics {
	valueHuf: number;
	costHuf: number;
	changeHuf: number;
	changePct: number | null;
	goalValueHuf: number | null;
	upsidePct: number | null;
}

/** All the spreadsheet's derived columns, in one place and unit-tested. */
export function positionMetrics(inv: Investment, quote: Quote | undefined): PositionMetrics {
	const quantity = Number(inv.quantity);
	const costHuf = Number(inv.cost_basis_huf);
	const valueHuf = quote ? quantity * quote.priceHuf : 0;
	const changeHuf = valueHuf - costHuf;

	const goalPrice = inv.goal_price_usd != null ? Number(inv.goal_price_usd) : null;
	const usdHuf = quote && quote.priceUsd > 0 ? quote.priceHuf / quote.priceUsd : null;

	return {
		valueHuf,
		costHuf,
		changeHuf,
		changePct: costHuf > 0 ? (changeHuf / costHuf) * 100 : null,
		goalValueHuf: goalPrice != null && usdHuf != null ? quantity * goalPrice * usdHuf : null,
		// How much further the price has to travel, not how far it fell. A coin
		// already past its goal reads as a negative number of percent remaining.
		upsidePct: goalPrice != null && quote && quote.priceUsd > 0 ? (goalPrice / quote.priceUsd - 1) * 100 : null,
	};
}
