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
