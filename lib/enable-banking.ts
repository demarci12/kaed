import { createSign } from 'node:crypto';

/**
 * Minimal Enable Banking client (https://enablebanking.com/docs/api/reference/).
 * No SDK: the API is plain REST and the only auth is an RS256 JWT, which Node's
 * built-in crypto can sign. Server-only -- the private key must never reach the
 * client bundle, so none of these env vars are NEXT_PUBLIC_.
 */
const BASE_URL = 'https://api.enablebanking.com';

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

/** A fresh JWT per call. The API accepts up to 24h; a few minutes is plenty. */
function signJwt(): string {
	const appId = process.env.ENABLE_BANKING_APP_ID;
	const keyB64 = process.env.ENABLE_BANKING_PRIVATE_KEY;
	if (!appId || !keyB64) throw new Error('ENABLE_BANKING_APP_ID / ENABLE_BANKING_PRIVATE_KEY are not set');

	const now = Math.floor(Date.now() / 1000);
	const header = { typ: 'JWT', alg: 'RS256', kid: appId };
	const payload = { iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 300 };
	const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

	const signature = createSign('RSA-SHA256').update(signingInput).sign(Buffer.from(keyB64, 'base64').toString('utf8'));
	return `${signingInput}.${b64url(signature)}`;
}

export class EnableBankingError extends Error {
	status: number;
	body: unknown;
	constructor(status: number, body: unknown) {
		super(`Enable Banking ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
		this.status = status;
		this.body = body;
	}
}

export async function ebFetch<T>(path: string, init: { method?: 'GET' | 'POST' | 'DELETE'; query?: Record<string, string | undefined>; body?: unknown } = {}): Promise<T> {
	const url = new URL(path, BASE_URL);
	for (const [k, v] of Object.entries(init.query ?? {})) if (v != null) url.searchParams.set(k, v);

	const res = await fetch(url, {
		method: init.method ?? 'GET',
		headers: {
			Authorization: `Bearer ${signJwt()}`,
			...(init.body ? { 'Content-Type': 'application/json' } : {}),
		},
		body: init.body ? JSON.stringify(init.body) : undefined,
		cache: 'no-store',
	});
	const text = await res.text();
	const data = text ? safeJson(text) : null;
	if (!res.ok) throw new EnableBankingError(res.status, data);
	return data as T;
}

function safeJson(text: string): unknown {
	try { return JSON.parse(text); } catch { return text; }
}

export interface EbApplication {
	name: string;
	description?: string;
	kid: string;
	environment: string;
	redirect_urls: string[];
	active: boolean;
	countries?: string[];
	services?: string[];
}

export interface EbAspsp { name: string; country: string; psu_types?: string[]; maximum_consent_validity?: number }

export const getApplication = () => ebFetch<EbApplication>('/application');
export const listBanks = (country: string) => ebFetch<{ aspsps: EbAspsp[] }>('/aspsps', { query: { country } });

// ── Authorisation + data ────────────────────────────────────────────────────

export interface EbAccount {
	uid: string;
	identification_hash: string;
	account_id?: { iban?: string; other?: { identification?: string } } | null;
	name?: string | null;
	currency?: string | null;
}

export interface EbSession {
	session_id: string;
	accounts: EbAccount[];
	access: { valid_until: string };
}

export interface EbTransaction {
	entry_reference?: string | null;
	transaction_id?: string | null;
	transaction_amount: { amount: string; currency: string };
	/** CRDT = money in, DBIT = money out. */
	credit_debit_indicator: 'CRDT' | 'DBIT' | string;
	status?: string;
	booking_date?: string | null;
	value_date?: string | null;
	transaction_date?: string | null;
	creditor?: { name?: string | null } | null;
	debtor?: { name?: string | null } | null;
	remittance_information?: string[] | null;
	note?: string | null;
	merchant_category_code?: string | null;
}

/** Starts consent. `state` comes back on the redirect, so we use it to find our row. */
export const startAuth = (input: { bank: string; country: string; state: string; redirectUrl: string; validUntil: Date }) =>
	ebFetch<{ url: string; authorization_id: string }>('/auth', {
		method: 'POST',
		body: {
			access: { valid_until: input.validUntil.toISOString() },
			aspsp: { name: input.bank, country: input.country },
			state: input.state,
			redirect_url: input.redirectUrl,
			psu_type: 'personal',
		},
	});

export const createSession = (code: string) => ebFetch<EbSession>('/sessions', { method: 'POST', body: { code } });
export const deleteSession = (sessionId: string) => ebFetch<unknown>(`/sessions/${sessionId}`, { method: 'DELETE' });

/** Booked transactions only, following continuation_key until the bank runs out. */
export async function fetchTransactions(accountUid: string, dateFrom: string): Promise<EbTransaction[]> {
	const out: EbTransaction[] = [];
	let key: string | undefined;
	// Hard cap so a misbehaving bank that keeps returning a key can't loop forever.
	for (let page = 0; page < 20; page++) {
		const res = await ebFetch<{ transactions: EbTransaction[]; continuation_key?: string | null }>(
			`/accounts/${accountUid}/transactions`,
			{ query: { date_from: dateFrom, transaction_status: 'BOOK', continuation_key: key } },
		);
		out.push(...(res.transactions ?? []));
		if (!res.continuation_key) break;
		key = res.continuation_key;
	}
	return out;
}
