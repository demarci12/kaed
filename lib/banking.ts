import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchTransactions, type EbAccount, type EbTransaction } from './enable-banking';
import type { FinanceCategory, FinanceType } from './finance';

/**
 * Bank sync, on top of Enable Banking. Everything here runs with the
 * service-role client (the bank_* tables have RLS on and no policies), so every
 * caller must have passed getOwnerSession()/requireOwner() first.
 */

export interface BankAccountRef {
	uid: string;
	hash: string;
	iban: string | null;
	name: string | null;
	currency: string | null;
}

export interface BankConnection {
	id: string;
	user_id: string;
	bank_name: string;
	country: string;
	status: 'pending' | 'active' | 'expired' | 'error';
	session_id: string | null;
	accounts: BankAccountRef[];
	valid_until: string | null;
	last_synced_at: string | null;
	last_error: string | null;
	created_at: string;
}

export interface BankTransaction {
	id: string;
	connection_id: string;
	account_hash: string;
	account_label: string | null;
	dedupe_key: string;
	booked_on: string;
	amount: number;
	direction: 'in' | 'out';
	currency: string;
	counterparty: string | null;
	counterparty_key: string | null;
	remittance: string | null;
	status: 'inbox' | 'imported' | 'ignored';
	finance_transaction_id: string | null;
	created_at: string;
}

export interface BankRule {
	id: string;
	user_id: string;
	counterparty_key: string;
	category_id: string | null;
	ignore: boolean;
}

/** finance_* amounts are all HUF; anything else needs converting on the way in. */
export const HOME_CURRENCY = 'HUF';

export const accountRefs = (accounts: EbAccount[]): BankAccountRef[] =>
	accounts.map((a) => ({
		uid: a.uid,
		hash: a.identification_hash,
		iban: a.account_id?.iban ?? a.account_id?.other?.identification ?? null,
		name: a.name ?? null,
		currency: a.currency ?? null,
	}));

/**
 * "TESCO 4412 BUDAPEST" and "Tesco 8810 Budapest" must hit the same rule, so
 * digits (terminal ids, dates, card tails) and punctuation are dropped. Returns
 * null when nothing is left -- a rule on an empty key would match everything.
 */
export function counterpartyKey(name: string | null | undefined): string | null {
	const key = (name ?? '')
		.toLowerCase()
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.replace(/[^a-z\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return key.length >= 2 ? key : null;
}

/** Credit = money in. Docs say CRDT/DBTR, real banks send DBIT; anything not CRDT is out. */
const directionOf = (tx: EbTransaction): 'in' | 'out' => (tx.credit_debit_indicator === 'CRDT' ? 'in' : 'out');

function toRow(tx: EbTransaction, conn: BankConnection, acc: BankAccountRef) {
	const direction = directionOf(tx);
	const counterparty =
		(direction === 'out' ? tx.creditor?.name : tx.debtor?.name)?.trim() ||
		tx.remittance_information?.[0]?.trim() ||
		tx.note?.trim() ||
		null;
	const remittance = tx.remittance_information?.join(' ').trim() || tx.note?.trim() || null;
	const booked = tx.booking_date ?? tx.transaction_date ?? tx.value_date ?? new Date().toISOString().slice(0, 10);
	const amount = Math.abs(Number(tx.transaction_amount.amount));

	// Some banks send neither id; fall back to a hash of the identifying fields.
	const dedupe_key =
		tx.entry_reference?.trim() ||
		tx.transaction_id?.trim() ||
		createHash('sha1')
			.update([booked, amount, direction, tx.transaction_amount.currency, counterparty, remittance].join('|'))
			.digest('hex');

	return {
		connection_id: conn.id,
		account_hash: acc.hash,
		account_label: acc.name ?? acc.iban,
		dedupe_key,
		booked_on: booked,
		amount,
		direction,
		currency: tx.transaction_amount.currency,
		counterparty,
		counterparty_key: counterpartyKey(counterparty),
		remittance,
		status: 'inbox' as const,
	};
}

// ── Currency ────────────────────────────────────────────────────────────────

/**
 * Amount in HUF on the booking date, from the ECB rates published by
 * frankfurter.dev (free, no key). Returns null if the rate can't be had --
 * callers leave the row in the inbox for a manual amount rather than guess.
 */
export async function toHuf(amount: number, currency: string, date: string): Promise<number | null> {
	if (currency === HOME_CURRENCY) return amount;
	try {
		const res = await fetch(`https://api.frankfurter.dev/v1/${date}?base=${encodeURIComponent(currency)}&symbols=${HOME_CURRENCY}`, {
			next: { revalidate: 60 * 60 * 24 },
		});
		if (!res.ok) return null;
		const rate = ((await res.json()) as { rates?: Record<string, number> }).rates?.[HOME_CURRENCY];
		return rate ? Math.round(amount * rate * 100) / 100 : null;
	} catch {
		return null;
	}
}

// ── Inbox -> finance ────────────────────────────────────────────────────────

/** A bank row becomes a finance_transactions row; the category decides saving vs income/expense. */
export async function importToFinance(
	db: SupabaseClient,
	args: { userId: string; tx: BankTransaction; category: Pick<FinanceCategory, 'id' | 'type'>; hufAmount: number },
): Promise<string | null> {
	const { tx, category, hufAmount, userId } = args;
	const type: FinanceType = category.type === 'saving' ? 'saving' : tx.direction === 'in' ? 'income' : 'expense';

	const { data, error } = await db
		.from('finance_transactions')
		.insert({
			user_id: userId,
			category_id: category.id,
			type,
			amount: hufAmount,
			note: tx.counterparty ?? tx.remittance,
			occurred_on: tx.booked_on,
		})
		.select('id')
		.single();
	if (error || !data) return error?.message ?? 'Could not create the transaction.';

	const { error: linkError } = await db
		.from('bank_transactions')
		.update({ status: 'imported', finance_transaction_id: data.id })
		.eq('id', tx.id);
	return linkError?.message ?? null;
}

// ── Sync ────────────────────────────────────────────────────────────────────

export interface SyncResult { fetched: number; added: number; filed: number; error?: string }

/** First sync reaches back this far; later ones overlap the last sync by a week to catch late bookings. */
const FIRST_SYNC_DAYS = 90;
const OVERLAP_DAYS = 7;

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

export async function syncConnection(db: SupabaseClient, conn: BankConnection): Promise<SyncResult> {
	if (conn.status !== 'active' || !conn.session_id) return { fetched: 0, added: 0, filed: 0, error: 'Connection is not active.' };

	const dateFrom = conn.last_synced_at
		? isoDaysAgo(OVERLAP_DAYS + Math.ceil((Date.now() - new Date(conn.last_synced_at).getTime()) / 86_400_000))
		: isoDaysAgo(FIRST_SYNC_DAYS);

	let fetched = 0;
	const inserted: BankTransaction[] = [];

	try {
		for (const acc of conn.accounts) {
			const txs = await fetchTransactions(acc.uid, dateFrom);
			fetched += txs.length;
			if (!txs.length) continue;

			const rows = txs.filter((t) => Number.isFinite(Number(t.transaction_amount.amount))).map((t) => toRow(t, conn, acc));
			// Same key twice in one batch would fail the whole upsert.
			const unique = [...new Map(rows.map((r) => [`${r.account_hash}|${r.dedupe_key}`, r])).values()];
			const { data, error } = await db
				.from('bank_transactions')
				.upsert(unique, { onConflict: 'account_hash,dedupe_key', ignoreDuplicates: true })
				.select('*');
			if (error) throw new Error(error.message);
			inserted.push(...((data ?? []) as BankTransaction[]));
		}
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Sync failed.';
		const expired = conn.valid_until != null && new Date(conn.valid_until) < new Date();
		await db.from('bank_connections').update({ last_error: message, ...(expired ? { status: 'expired' } : {}) }).eq('id', conn.id);
		return { fetched, added: inserted.length, filed: 0, error: message };
	}

	const filed = await applyRules(db, conn.user_id, inserted);
	await db.from('bank_connections').update({ last_synced_at: new Date().toISOString(), last_error: null }).eq('id', conn.id);
	return { fetched, added: inserted.length, filed };
}

/** Files brand-new rows that match a saved rule. Rows with no rule, or no usable rate, wait in the inbox. */
async function applyRules(db: SupabaseClient, userId: string, fresh: BankTransaction[]): Promise<number> {
	if (!fresh.length) return 0;
	const [{ data: rules }, { data: categories }] = await Promise.all([
		db.from('bank_rules').select('*'),
		db.from('finance_categories').select('id, type'),
	]);
	const ruleByKey = new Map(((rules ?? []) as BankRule[]).map((r) => [r.counterparty_key, r]));
	const categoryById = new Map(((categories ?? []) as Pick<FinanceCategory, 'id' | 'type'>[]).map((c) => [c.id, c]));

	let filed = 0;
	for (const tx of fresh) {
		const rule = tx.counterparty_key ? ruleByKey.get(tx.counterparty_key) : undefined;
		if (!rule) continue;
		if (rule.ignore) {
			await db.from('bank_transactions').update({ status: 'ignored' }).eq('id', tx.id);
			filed++;
			continue;
		}
		const category = rule.category_id ? categoryById.get(rule.category_id) : undefined;
		if (!category) continue;
		const huf = await toHuf(Number(tx.amount), tx.currency, tx.booked_on);
		if (huf == null || huf <= 0) continue;
		if (!(await importToFinance(db, { userId, tx, category, hufAmount: huf }))) filed++;
	}
	return filed;
}
