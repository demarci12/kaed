import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { toHuf, HOME_CURRENCY, type BankConnection, type BankTransaction } from '@/lib/banking';
import { serviceClient } from '@/lib/cms';
import type { FinanceCategory } from '@/lib/finance';
import { ConfirmSubmit } from '@/app/business-ideas/ConfirmSubmit';
import { btnGhost, card, cardHead, cardTitle, chipMuted, cx, Empty, FormError, PageHead, table, tableWrap, td, th } from '@/components/ui';
import { BankPicker } from './BankPicker';
import { SyncButton } from './SyncButton';
import { FileForm, SuggestButton, SuggestProvider } from './Suggest';

const INBOX_LIMIT = 100;

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const daysLeft = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);

export default async function BanksPage({ searchParams }: { searchParams: Promise<{ error?: string; connected?: string }> }) {
	const { supabase } = await requireOwner();
	const sp = await searchParams;
	const db = serviceClient();

	const [{ data: conns }, { data: inbox, count }, { data: categories }] = await Promise.all([
		db.from('bank_connections').select('*').order('created_at', { ascending: true }),
		db.from('bank_transactions').select('*', { count: 'exact' }).eq('status', 'inbox').order('booked_on', { ascending: false }).limit(INBOX_LIMIT),
		supabase.from('finance_categories').select('*').order('name', { ascending: true }),
	]);
	const connections = (conns ?? []) as BankConnection[];
	const rows = (inbox ?? []) as BankTransaction[];
	const cats = (categories ?? []) as FinanceCategory[];
	const options = cats.map((c) => ({ id: c.id, name: c.name, type: c.type }));

	// Suggested HUF amount per row; foreign-currency rows get the booking-date ECB rate, editable before filing.
	const hufSuggestions = await Promise.all(rows.map((r) => toHuf(Number(r.amount), r.currency, r.booked_on)));
	const connName = new Map(connections.map((c) => [c.id, c.bank_name]));
	const syncable = connections.filter((c) => c.status === 'active').map((c) => c.id);

	return (
		<SuggestProvider>
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Household"
				title="Banks."
				lede="Read-only links to your bank accounts. New transactions land in the inbox; file one and the merchant is remembered for next time."
				actions={
					<>
						<Link href="/finance" className={btnGhost}>← Finance</Link>
						<SuggestButton />
						<SyncButton ids={syncable} label="Sync all" />
					</>
				}
			/>
			{sp.error && <FormError>{sp.error}</FormError>}
			{sp.connected && <p className="mt-4 mb-0 text-sm text-positive">Connected. Hit “Sync now” to pull the transactions.</p>}

			<BankPicker />

			<div className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
				{connections.length ? connections.map((c) => {
					const left = daysLeft(c.valid_until);
					const expiring = c.status === 'expired' || (left != null && left <= 7);
					return (
						<div key={c.id} className={card}>
							<div className={cardHead}>
								<span className={cardTitle}>{c.bank_name}</span>
								<span className={chipMuted}>{c.country}</span>
							</div>
							<ul className="m-0 p-0 list-none text-sm text-muted">
								{c.accounts.map((a) => <li key={a.hash}>{a.name ?? a.iban ?? 'Account'}{a.currency ? ` · ${a.currency}` : ''}</li>)}
								{!c.accounts.length && <li>No accounts yet.</li>}
							</ul>
							<span className={cx('text-xs', expiring || c.status !== 'active' ? 'text-negative' : 'text-muted')}>
								{c.status === 'pending' ? 'Waiting for the bank…'
									: c.status === 'error' ? `Error: ${c.last_error ?? 'unknown'}`
									: c.status === 'expired' || (left != null && left <= 0) ? 'Access expired — reconnect'
									: `Access ends in ${left} days${left != null && left <= 7 ? ' — reconnect soon' : ''}`}
							</span>
							{c.last_error && c.status === 'active' && <span className="text-xs text-negative">Last sync failed: {c.last_error}</span>}
							<span className="text-xs text-muted">
								{c.last_synced_at ? `Synced ${new Date(c.last_synced_at).toLocaleString('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Never synced'}
							</span>
							<div className="flex items-center gap-2 flex-wrap mt-auto pt-2">
								{c.status === 'active' && <SyncButton ids={[c.id]} ghost />}
								<form method="post" action="/api/banking/connect">
									<input type="hidden" name="connection_id" value={c.id} />
									<input type="hidden" name="bank" value={c.bank_name} />
									<input type="hidden" name="country" value={c.country} />
									<button type="submit" className={btnGhost}>{c.status === 'active' ? 'Reconnect' : 'Connect'}</button>
								</form>
								<form id={`rm-${c.id}`} method="post" action={`/api/banking/connections/${c.id}/delete`} />
								<ConfirmSubmit form={`rm-${c.id}`} message={`Remove ${c.bank_name}? Access is revoked and its imported bank rows are deleted (transactions already filed under Finance stay).`} className={cx(btnGhost, 'ml-auto')}>Remove</ConfirmSubmit>
							</div>
						</div>
					);
				}) : <Empty>No banks connected yet. Pick one above.</Empty>}
			</div>

			<div className="mt-10 flex items-baseline justify-between gap-3">
				<h2 className="m-0 font-serif text-xl font-semibold">Inbox</h2>
				<span className="text-sm text-muted">{count ?? 0} to file{(count ?? 0) > INBOX_LIMIT ? ` (showing ${INBOX_LIMIT})` : ''}</span>
			</div>
			<div className={cx(tableWrap, 'mt-4')}>
				<table className={table}>
					<thead>
						<tr>
							<th className={th}>Date</th>
							<th className={th}>Bank</th>
							<th className={th}>Counterparty</th>
							<th className={cx(th, 'text-right')}>Amount</th>
							<th className={th}>File as</th>
						</tr>
					</thead>
					<tbody>
						{rows.length ? rows.map((r, i) => {
							const foreign = r.currency !== HOME_CURRENCY;
							const huf = hufSuggestions[i];
							return (
								<tr key={r.id}>
									<td className={cx(td, 'whitespace-nowrap tabular-nums')}>{r.booked_on}</td>
									<td className={cx(td, 'whitespace-nowrap text-muted')}>{connName.get(r.connection_id) ?? '—'}</td>
									<td className={td}>
										<div className="font-medium">{r.counterparty ?? '—'}</div>
										{r.remittance && r.remittance !== r.counterparty && <div className="text-xs text-muted max-w-[34ch] truncate">{r.remittance}</div>}
									</td>
									<td className={cx(td, 'whitespace-nowrap text-right tabular-nums', r.direction === 'in' ? 'text-positive' : 'text-negative')}>
										{r.direction === 'in' ? '+' : '−'}{fmt(Number(r.amount))} {r.currency}
									</td>
									<td className={td}>
										<FileForm txId={r.id} categories={options} defaultHuf={huf} foreign={foreign} />
									</td>
								</tr>
							);
						}) : (
							<tr><td colSpan={5} className={cx(td, 'py-7 text-muted')}>Inbox is empty.</td></tr>
						)}
					</tbody>
				</table>
			</div>
			<p className="mt-3 text-xs text-muted">“Ignore” is for transfers between your own accounts and anything that shouldn’t count. “Remember” makes the next transaction from the same counterparty file itself on sync.</p>
		</section>
		</SuggestProvider>
	);
}
