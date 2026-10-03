import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { BATCH_SIZE, suggestBatch, type Example, type Suggestion } from '@/lib/bank-categorize';
import type { BankTransaction } from '@/lib/banking';
import { serviceClient } from '@/lib/cms';
import type { FinanceCategory } from '@/lib/finance';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const INBOX_LIMIT = 100; // keep in step with the inbox page
const EXAMPLE_LIMIT = 80;

/** Suggests a category for every inbox row. Nothing is stored or filed: the client pre-fills its pickers. */
export async function POST() {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

	const db = serviceClient();
	const [{ data: inbox }, { data: cats }, { data: filed }] = await Promise.all([
		db.from('bank_transactions').select('*').eq('status', 'inbox').order('booked_on', { ascending: false }).limit(INBOX_LIMIT),
		session.supabase.from('finance_categories').select('id, name, type').order('name'),
		// What the owner already decided, so Claude copies their habits rather than inventing its own.
		db.from('bank_transactions').select('counterparty, finance_transaction_id').eq('status', 'imported').not('counterparty', 'is', null).not('finance_transaction_id', 'is', null).order('created_at', { ascending: false }).limit(200),
	]);
	const rows = (inbox ?? []) as BankTransaction[];
	const categories = (cats ?? []) as Pick<FinanceCategory, 'id' | 'name' | 'type'>[];
	if (!rows.length) return NextResponse.json({ ok: true, suggestions: {} });
	if (!categories.length) return NextResponse.json({ ok: false, error: 'Add finance categories first.' }, { status: 400 });

	const ftIds = (filed ?? []).map((f) => f.finance_transaction_id as string);
	const { data: fts } = ftIds.length ? await db.from('finance_transactions').select('id, category_id').in('id', ftIds) : { data: [] };
	const catNameByFt = new Map((fts ?? []).map((f) => [f.id as string, categories.find((c) => c.id === f.category_id)?.name]));
	const seen = new Set<string>();
	const examples: Example[] = [];
	for (const f of filed ?? []) {
		const category = catNameByFt.get(f.finance_transaction_id as string);
		const counterparty = String(f.counterparty);
		if (!category || seen.has(counterparty)) continue;
		seen.add(counterparty);
		examples.push({ counterparty, category });
		if (examples.length >= EXAMPLE_LIMIT) break;
	}

	try {
		const chunks: BankTransaction[][] = [];
		for (let i = 0; i < rows.length; i += BATCH_SIZE) chunks.push(rows.slice(i, i + BATCH_SIZE));
		const parts = await Promise.all(chunks.map((c) => suggestBatch(c, categories, examples)));
		const suggestions: Record<string, Suggestion> = Object.assign({}, ...parts);
		return NextResponse.json({ ok: true, suggestions });
	} catch (e) {
		return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Suggesting failed.' }, { status: 502 });
	}
}
