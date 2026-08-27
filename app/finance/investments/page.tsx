import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { fetchPrices, positionMetrics, type Investment } from '@/lib/investments';
import { InlineEdit } from '@/components/InlineEdit';
import { Popup, PopupActions } from '@/components/Popup';
import {
	btn, btnGhost, cx, input, label, table, tableWrap, td, th, thNum, FormError, PageHead,
} from '@/components/ui';
import { AutoRefresh, RefreshButton } from './Refresh';

// Every derived figure comes from positionMetrics(); nothing is recomputed here.
const huf = (n: number) => Math.round(n).toLocaleString('hu-HU');
const pct = (n: number | null) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`);
const usdPrice = (n: number) => (n < 0.01 ? n.toFixed(8) : n.toFixed(4));
const sign = (n: number) => (n > 0 ? 'text-positive' : n < 0 ? 'text-negative' : '');

const num = 'text-right px-4 py-2.5 border-b border-line tabular-nums whitespace-nowrap';
const tile = 'p-[18px] border border-line rounded-[14px] bg-paper';
const tileValue = 'm-0 mt-1.5 font-serif text-[26px] font-semibold tracking-[-0.01em] tabular-nums';
const tileSub = 'm-0 mt-1 text-[13px] text-muted tabular-nums';
const tileLabel = 'text-[11px] font-semibold tracking-[0.06em] uppercase text-muted';

export default async function InvestmentsPage({
	searchParams,
}: { searchParams: Promise<{ error?: string; refresh?: string }> }) {
	// requireOwner, not requireUser: /finance itself is shared with the member
	// role, but this page is owner-only and redirects them back to /finance.
	const { supabase } = await requireOwner();
	const sp = await searchParams;

	const { data: rows } = await supabase.from('investments').select('*').order('sort_order', { ascending: true });
	const investments = (rows ?? []) as Investment[];

	// Server-side only, and via process.env rather than a bundler-inlined
	// constant, so rotating the key on Vercel takes effect without a redeploy.
	const prices = await fetchPrices(
		investments.map((i) => ({ symbol: i.symbol, cmc_slug: i.cmc_slug })),
		process.env.CMC_API_KEY,
		{ force: sp.refresh != null },
	);

	const positions = investments.map((inv) => ({
		inv,
		quote: prices.quotes[inv.symbol],
		m: positionMetrics(inv, prices.quotes[inv.symbol]),
	}));

	const totals = positions.reduce(
		(acc, p) => ({
			value: acc.value + p.m.valueHuf,
			cost: acc.cost + p.m.costHuf,
			goal: acc.goal + (p.m.goalValueHuf ?? 0),
		}),
		{ value: 0, cost: 0, goal: 0 },
	);
	const totalChange = totals.value - totals.cost;
	const totalChangePct = totals.cost > 0 ? (totalChange / totals.cost) * 100 : null;

	return (
		<section className="max-w-[1180px]">
			<PageHead
				eyebrow="Finance · Private"
				title="Investments."
				lede="Live prices from CoinMarketCap. Click any white number to edit it."
				actions={
					<>
						<Link href="/finance" className={btnGhost}>← Finance</Link>
						<Popup title="Add holding" trigger={(open) => (
							<button type="button" className={btn} onClick={open}>+ Add holding</button>
						)}>
							{(close) => (
								<form method="post" action="/api/finance/investments/create">
									<label className={label} htmlFor="symbol">Symbol</label>
									<input id="symbol" name="symbol" type="text" required maxLength={20} placeholder="ONDO" className={input} />

									<label className={label} htmlFor="cmc_slug">CoinMarketCap slug (optional)</label>
									<input id="cmc_slug" name="cmc_slug" type="text" maxLength={60} placeholder="sigma-sol" className={input} />

									<label className={label} htmlFor="quantity">Quantity</label>
									<input id="quantity" name="quantity" type="number" step="any" min="0" required className={input} />

									<label className={label} htmlFor="cost_basis_huf">Invested (HUF)</label>
									<input id="cost_basis_huf" name="cost_basis_huf" type="number" step="any" min="0" required className={input} />

									<label className={label} htmlFor="goal_price_usd">Goal price (USD)</label>
									<input id="goal_price_usd" name="goal_price_usd" type="number" step="any" min="0" className={input} />

									<PopupActions onCancel={close} submitLabel="Add holding" />
								</form>
							)}
						</Popup>
					</>
				}
			/>

			{sp.error && <FormError>{sp.error}</FormError>}
			{prices.error && <FormError>Price lookup failed: {prices.error}</FormError>}
			{prices.missing.length > 0 && !prices.error && (
				<FormError>No price returned for: {prices.missing.join(', ')}. Check the symbol or set a CMC slug.</FormError>
			)}

			<div className="grid [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mt-8">
				<div className={tile}>
					<span className={tileLabel}>Value now</span>
					<p className={tileValue}>{huf(totals.value)}</p>
					<p className={tileSub}>HUF</p>
				</div>
				<div className={tile}>
					<span className={tileLabel}>Invested</span>
					<p className={tileValue}>{huf(totals.cost)}</p>
					<p className={tileSub}>HUF</p>
				</div>
				<div className={tile}>
					<span className={tileLabel}>Profit / loss</span>
					<p className={cx(tileValue, sign(totalChange))}>{huf(totalChange)}</p>
					<p className={cx(tileSub, sign(totalChange))}>{pct(totalChangePct)}</p>
				</div>
				<div className={tile}>
					<span className={tileLabel}>If goals hit</span>
					<p className={tileValue}>{huf(totals.goal)}</p>
					<p className={tileSub}>
						{totals.value > 0 ? `${(totals.goal / totals.value).toFixed(1)}× from here` : 'HUF'}
					</p>
				</div>
			</div>

			<div className="flex items-center justify-between gap-3 flex-wrap my-3.5 mb-[18px] text-[13px] text-muted">
				<span>
					<AutoRefresh fetchedAt={prices.fetchedAt} />
					{prices.usdHuf ? ` · 1 USD = ${prices.usdHuf.toFixed(2)} HUF` : ''}
				</span>
				<RefreshButton />
			</div>

			<div className={tableWrap}>
				<table className={table}>
					<thead>
						<tr>
							<th className={th}>Asset</th>
							<th className={thNum}>Quantity</th>
							<th className={thNum}>Price USD</th>
							<th className={thNum}>Value HUF</th>
							<th className={thNum}>Invested</th>
							<th className={thNum}>Change</th>
							<th className={thNum}>Change %</th>
							<th className={thNum}>Goal USD</th>
							<th className={thNum}>To goal</th>
							<th className={thNum}>Goal HUF</th>
							<th className={th} />
						</tr>
					</thead>
					<tbody>
						{positions.length ? positions.map(({ inv, quote, m }) => (
							<tr key={inv.id}>
								<td className={td}>
									<InlineEdit
										value={inv.symbol} field="symbol" id={inv.id}
										endpoint="/api/finance/investments" className="font-semibold"
									/>
									{inv.cmc_slug && <span className="block text-[11px] text-muted">{inv.cmc_slug}</span>}
								</td>
								<td className={num}>
									<InlineEdit
										value={String(Number(inv.quantity))} field="quantity" id={inv.id}
										endpoint="/api/finance/investments" kind="number"
										display={Number(inv.quantity).toLocaleString('hu-HU')}
									/>
								</td>
								<td className={cx(num, 'text-muted')}>{quote ? usdPrice(quote.priceUsd) : '—'}</td>
								<td className={num}>{quote ? huf(m.valueHuf) : '—'}</td>
								<td className={num}>
									<InlineEdit
										value={String(Number(inv.cost_basis_huf))} field="cost_basis_huf" id={inv.id}
										endpoint="/api/finance/investments" kind="number"
										display={huf(Number(inv.cost_basis_huf))}
									/>
								</td>
								<td className={cx(num, sign(m.changeHuf))}>{quote ? huf(m.changeHuf) : '—'}</td>
								<td className={cx(num, sign(m.changeHuf))}>{quote ? pct(m.changePct) : '—'}</td>
								<td className={num}>
									<InlineEdit
										value={inv.goal_price_usd != null ? String(Number(inv.goal_price_usd)) : ''}
										field="goal_price_usd" id={inv.id} endpoint="/api/finance/investments" kind="number"
										display={inv.goal_price_usd != null ? String(Number(inv.goal_price_usd)) : 'Set'}
									/>
								</td>
								<td className={cx(num, 'text-muted')}>{pct(m.upsidePct)}</td>
								<td className={num}>{m.goalValueHuf != null ? huf(m.goalValueHuf) : '—'}</td>
								<td className="px-2 py-2.5 border-b border-line">
									<form method="post" action={`/api/finance/investments/${inv.id}/delete`} className="m-0">
										<button
											type="submit" aria-label={`Delete ${inv.symbol}`}
											className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full border border-transparent bg-transparent text-muted text-base leading-none cursor-pointer hover:border-[--color-negative-line] hover:text-negative"
										>
											×
										</button>
									</form>
								</td>
							</tr>
						)) : (
							<tr><td colSpan={11} className="py-7 px-4 text-muted">No holdings yet. Add your first one.</td></tr>
						)}
					</tbody>
					{positions.length > 0 && (
						<tfoot className="bg-canvas [&_td]:border-t [&_td]:border-line">
							<tr>
								<td className="px-4 py-3"><strong>SUM</strong></td>
								<td colSpan={2} />
								<td className={cx(num, 'border-b-0')}><strong>{huf(totals.value)}</strong></td>
								<td className={cx(num, 'border-b-0')}><strong>{huf(totals.cost)}</strong></td>
								<td className={cx(num, 'border-b-0', sign(totalChange))}><strong>{huf(totalChange)}</strong></td>
								<td className={cx(num, 'border-b-0', sign(totalChange))}><strong>{pct(totalChangePct)}</strong></td>
								<td colSpan={2} />
								<td className={cx(num, 'border-b-0')}><strong>{huf(totals.goal)}</strong></td>
								<td />
							</tr>
						</tfoot>
					)}
				</table>
			</div>
		</section>
	);
}
