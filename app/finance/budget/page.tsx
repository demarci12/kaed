import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import {
	budgetedFor,
	type FinanceBudget, type FinanceCategory, type FinanceLimits, type FinanceTransaction, type FinanceType,
} from '@/lib/finance';
import { btnGhost, cx, table, tableWrap, td, tdNum, th, FormError, PageHead } from '@/components/ui';

const SECTION_LABEL: Record<FinanceType, string> = { income: 'Income', expense: 'Expense', saving: 'Saving' };

function formatAmount(n: number) {
	return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function BudgetPage({
	searchParams,
}: { searchParams: Promise<{ month?: string; error?: string }> }) {
	const { supabase } = await requireUser();
	const sp = await searchParams;

	const now = new Date();
	const monthValid = sp.month && /^\d{4}-\d{2}-01$/.test(sp.month);
	const month = monthValid ? sp.month! : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

	const monthDate = new Date(`${month}T00:00:00Z`);
	const toMonthStr = (d: Date) => d.toISOString().slice(0, 10).replace(/\d{2}$/, '01');
	const nextMonth = toMonthStr(new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1)));
	const prevMonth = toMonthStr(new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() - 1, 1)));
	const monthLabel = monthDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', timeZone: 'UTC' });

	// Savings balance is a global, all-time running total (matches the card on
	// the Finance page) -- not something that resets or gets "planned" per
	// month the way income/expense do. Shown here for context only.
	const [{ data: categories }, { data: budgets }, { data: transactions }, { data: allSavingTx }, { data: limits }] =
		await Promise.all([
			supabase.from('finance_categories').select('*').order('name', { ascending: true }),
			supabase.from('finance_budgets').select('*').eq('month', month),
			supabase.from('finance_transactions').select('*').gte('occurred_on', month).lt('occurred_on', nextMonth),
			supabase.from('finance_transactions').select('amount').eq('type', 'saving'),
			supabase.from('finance_limits').select('*').limit(1).maybeSingle(),
		]);

	const startingSavingsBalance = Number((limits as FinanceLimits | null)?.starting_savings_balance ?? 0);
	const globalSavingsBalance =
		startingSavingsBalance + ((allSavingTx ?? []) as { amount: number }[]).reduce((s, t) => s + Number(t.amount), 0);

	const typedCategories = (categories ?? []) as FinanceCategory[];
	const typedBudgets = (budgets ?? []) as FinanceBudget[];
	const typedTransactions = (transactions ?? []) as FinanceTransaction[];

	const categoriesByType: Record<FinanceType, FinanceCategory[]> = {
		income: typedCategories.filter((c) => c.type === 'income'),
		expense: typedCategories.filter((c) => c.type === 'expense'),
		saving: typedCategories.filter((c) => c.type === 'saving'),
	};

	const budgetByCategoryId = new Map(typedBudgets.map((b) => [b.category_id, { amount: Number(b.amount) }]));
	const actualByCategoryId = new Map<string, number>();
	for (const t of typedTransactions) {
		if (!t.category_id) continue;
		actualByCategoryId.set(t.category_id, (actualByCategoryId.get(t.category_id) ?? 0) + Number(t.amount));
	}

	const budgeted = (cat: FinanceCategory) => budgetedFor(cat, budgetByCategoryId);

	function totals(type: FinanceType) {
		const cats = categoriesByType[type];
		return {
			budgeted: cats.reduce((sum, c) => sum + budgeted(c), 0),
			actual: typedTransactions.filter((t) => t.type === type).reduce((sum, t) => sum + Number(t.amount), 0),
		};
	}

	const incomeTotals = totals('income');
	const expenseTotals = totals('expense');
	const savingTotals = totals('saving');

	// Projected balance if the plan is followed exactly, and the actual
	// position so far based on what's really been logged this month.
	const plannedEndOfMonth = incomeTotals.budgeted - expenseTotals.budgeted - savingTotals.budgeted;
	const actualSoFar = incomeTotals.actual - expenseTotals.actual - savingTotals.actual;

	// Weeks-in-month is approximate (days / 7) since months don't divide evenly.
	const daysInMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate();
	const weeksInMonth = daysInMonth / 7;
	const toWeekly = (n: number) => n / weeksInMonth;
	const toDaily = (n: number) => n / daysInMonth;

	// Projected savings balance if this month's planned saving amount is kept
	// up every month going forward, compounding at a blended monthly rate
	// weighted by each saving category's planned monthly amount.
	const savingCategories = categoriesByType.saving;
	const savingWeightedRateSum = savingCategories.reduce((s, c) => s + budgeted(c) * Number(c.interest_rate ?? 0), 0);
	const savingContributionSum = savingCategories.reduce((s, c) => s + budgeted(c), 0);
	const blendedMonthlyRatePct = savingContributionSum > 0 ? savingWeightedRateSum / savingContributionSum : 0;
	const blendedMonthlyRate = blendedMonthlyRatePct / 100;

	const projections = [1, 3, 6, 12, 24].map((months) => {
		const P = globalSavingsBalance;
		const C = savingTotals.budgeted;
		const r = blendedMonthlyRate;
		const balance = r === 0
			? P + C * months
			: P * Math.pow(1 + r, months) + C * ((Math.pow(1 + r, months) - 1) / r);
		return { months, balance };
	});

	const emptyState = 'p-6 text-center text-muted border border-line rounded-[14px] bg-paper';
	const barLabel = 'text-[11px] tracking-[0.06em] uppercase opacity-70';
	const barValue = 'font-serif text-xl font-semibold tabular-nums';

	return (
		<section className="max-w-[900px]">
			<Link href="/finance" className="inline-block mb-6 text-[13px] text-muted no-underline hover:text-ink">← Finance</Link>

			<PageHead
				eyebrow="Household"
				title="Budget planning."
				lede="Plan income, spending, and saving for the month together, and see what's left over if you stick to it."
			/>

			<div className="flex items-center justify-center gap-2.5 md:gap-5 mt-8">
				<Link href={`/finance/budget?month=${prevMonth}`} className={cx(btnGhost, 'min-h-8 px-3.5 text-[13px]')}>← Prev</Link>
				<span className="font-serif text-[15px] md:text-lg font-semibold md:min-w-[180px] text-center">{monthLabel}</span>
				<Link href={`/finance/budget?month=${nextMonth}`} className={cx(btnGhost, 'min-h-8 px-3.5 text-[13px]')}>Next →</Link>
			</div>

			{sp.error && <FormError>{sp.error}</FormError>}

			<div className="flex justify-between gap-4 flex-wrap mt-7 px-6 py-5 bg-ink text-white rounded-[14px]">
				<div className="flex flex-col gap-1">
					<span className={barLabel}>Planned income</span>
					<span className={barValue}>{formatAmount(incomeTotals.budgeted)}</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className={barLabel}>Planned expense</span>
					<span className={barValue}>{formatAmount(expenseTotals.budgeted)}</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className={barLabel}>Planned saving</span>
					<span className={barValue}>{formatAmount(savingTotals.budgeted)}</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className={barLabel}>End-of-month balance</span>
					<span className={cx(
						'font-serif text-[26px] font-semibold tabular-nums',
						plannedEndOfMonth < 0 ? 'text-[#ff9b95]' : 'text-[#8fe0ac]',
					)}>
						{formatAmount(plannedEndOfMonth)}
					</span>
				</div>
			</div>

			<div className="flex gap-8 flex-wrap mt-4 px-1">
				<div className="flex flex-col gap-0.5">
					<span className="text-[11px] tracking-[0.06em] uppercase text-muted">Actual so far this month</span>
					<span className={cx('font-serif text-base font-semibold tabular-nums', actualSoFar < 0 ? 'text-negative' : 'text-positive')}>
						{formatAmount(actualSoFar)}
					</span>
				</div>
				<div className="flex flex-col gap-0.5">
					<span className="text-[11px] tracking-[0.06em] uppercase text-muted">Global savings balance</span>
					<span className="font-serif text-base font-semibold tabular-nums text-info">{formatAmount(globalSavingsBalance)}</span>
				</div>
			</div>

			<div className="mt-10">
				<h2 className="m-0 mb-3.5 font-serif text-lg font-semibold">If you keep this plan</h2>
				{savingTotals.budgeted > 0 ? (
					<div className={tableWrap}>
						<table className={table}>
							<thead>
								<tr>
									<th className={th}>In</th>
									<th className={cx(th, 'text-right')}>Projected savings balance</th>
								</tr>
							</thead>
							<tbody>
								{projections.map((p) => (
									<tr key={p.months}>
										<td className={cx(td, 'font-medium whitespace-nowrap')}>
											{p.months === 1 ? 'End of this month' : `${p.months} months`}
										</td>
										<td className={tdNum}>{formatAmount(p.balance)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className={emptyState}>Set a planned saving amount above to see a projection.</div>
				)}
				<p className="mt-3.5 mx-1 mb-0 text-[13px] text-muted">
					Starting from today&apos;s balance of {formatAmount(globalSavingsBalance)}, assuming you keep saving{' '}
					{formatAmount(savingTotals.budgeted)} every month
					{blendedMonthlyRate > 0 ? ` at a blended ${blendedMonthlyRatePct.toFixed(2)}%/mo return.` : '.'}
				</p>
			</div>

			{(['income', 'expense', 'saving'] as FinanceType[]).map((type) => (
				<div key={type} className="mt-10">
					<h2 className="m-0 mb-3.5 font-serif text-lg font-semibold">{SECTION_LABEL[type]}</h2>
					{categoriesByType[type].length ? (
						<div className={tableWrap}>
							<table className={table}>
								<thead>
									<tr>
										<th className={th}>Category</th>
										<th className={th}>Planned / month</th>
										<th className={cx(th, 'text-right')}>≈ / week</th>
										<th className={cx(th, 'text-right')}>≈ / day</th>
										<th className={cx(th, 'text-right')}>Actual</th>
										<th className={th}>{type === 'expense' ? 'Remaining' : 'Difference'}</th>
									</tr>
								</thead>
								<tbody>
									{categoriesByType[type].map((cat) => {
										const planned = budgeted(cat);
										const actual = actualByCategoryId.get(cat.id) ?? 0;
										const remaining = type === 'expense' ? planned - actual : actual - planned;
										const pct = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0;
										return (
											<tr key={cat.id}>
												<td className={cx(td, 'font-medium whitespace-nowrap')}>{cat.name}</td>
												<td className={td}>
													<form method="post" action="/api/finance/budgets/set" className="flex items-center gap-2 m-0">
														<input type="hidden" name="category_id" value={cat.id} />
														<input type="hidden" name="month" value={month} />
														<input
															type="number" name="amount" step="0.01" min="0"
															defaultValue={planned || ''} placeholder="0.00"
															className="w-[100px] font-sans text-base text-ink bg-canvas border border-line rounded-lg px-2.5 py-1.5 outline-none focus:border-ink"
														/>
														<button type="submit" className={cx(btnGhost, 'min-h-8 px-3.5 text-[13px]')}>Save</button>
													</form>
												</td>
												<td className={cx(tdNum, 'text-muted')}>
													{planned > 0 ? formatAmount(toWeekly(planned)) : '—'}
												</td>
												<td className={cx(tdNum, 'text-muted')}>
													{planned > 0 ? formatAmount(toDaily(planned)) : '—'}
												</td>
												<td className={tdNum}>{formatAmount(actual)}</td>
												<td className={td}>
													<div className="flex flex-col gap-1.5 min-w-[120px]">
														<span className={cx('tabular-nums', type === 'expense' && remaining < 0 && 'text-negative font-medium')}>
															{formatAmount(remaining)}
														</span>
														{planned > 0 && (
															<div className="h-[5px] bg-canvas border border-line rounded-full overflow-hidden">
																<div
																	className={cx('h-full', type === 'expense' && actual > planned ? 'bg-negative' : 'bg-ink')}
																	style={{ width: `${pct}%` }}
																/>
															</div>
														)}
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					) : (
						<div className={emptyState}>
							No {SECTION_LABEL[type].toLowerCase()} categories yet. Add some from the{' '}
							<Link href="/finance/settings" className="underline">settings page</Link>.
						</div>
					)}
				</div>
			))}
		</section>
	);
}
