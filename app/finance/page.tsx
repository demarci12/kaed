import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import type { FinanceBudget, FinanceCategory, FinanceLimits, FinanceTransaction } from '@/lib/finance';
import { Popup, PopupActions } from '@/components/Popup';
import {
	btn, btnGhost, cx, input, label, table, tableWrap, td, th, FormError, PageHead, Pill,
} from '@/components/ui';
import { QuickAdd } from './QuickAdd';

const tile = 'flex flex-col gap-2 p-5 border border-line rounded-[14px] bg-paper';
const tileLabel = 'text-xs font-semibold tracking-[0.06em] uppercase text-muted';
const tileValue = 'font-serif text-[28px] font-semibold tabular-nums';
const control = 'w-full font-sans text-base text-ink bg-canvas border border-line rounded-[10px] px-3.5 py-2.5 outline-none focus:border-ink';

function formatAmount(n: number) {
	return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CategoryOptions({ categories }: { categories: FinanceCategory[] }) {
	const byType = (t: FinanceCategory['type']) => categories.filter((c) => c.type === t);
	return (
		<>
			<optgroup label="Income">
				{byType('income').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
			</optgroup>
			<optgroup label="Expense">
				{byType('expense').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
			</optgroup>
			<optgroup label="Saving">
				{byType('saving').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
			</optgroup>
		</>
	);
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireUser();
	const sp = await searchParams;

	const now = new Date();
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

	// One round trip, not four -- see the Promise.all rule in CLAUDE.md.
	const [{ data: transactions }, { data: categories }, { data: currentBudgets }, { data: limits }] = await Promise.all([
		supabase
			.from('finance_transactions')
			.select('*')
			.order('occurred_on', { ascending: false })
			.order('created_at', { ascending: false }),
		supabase.from('finance_categories').select('*').order('name', { ascending: true }),
		supabase.from('finance_budgets').select('*').eq('month', currentMonth),
		supabase.from('finance_limits').select('*').limit(1).maybeSingle(),
	]);

	const typedTransactions = (transactions ?? []) as FinanceTransaction[];
	const typedCategories = (categories ?? []) as FinanceCategory[];
	const typedBudgets = (currentBudgets ?? []) as FinanceBudget[];
	const startingSavingsBalance = Number((limits as FinanceLimits | null)?.starting_savings_balance ?? 0);

	const categoryById = new Map(typedCategories.map((c) => [c.id, c]));

	// Daily/weekly limits come from budget planning's total planned expense for
	// the current month, not a separately-entered number -- plan it once on
	// /finance/budget and both views stay in sync.
	const expenseCategoryIds = new Set(typedCategories.filter((c) => c.type === 'expense').map((c) => c.id));
	const plannedExpenseThisMonth = typedBudgets
		.filter((b) => expenseCategoryIds.has(b.category_id))
		.reduce((sum, b) => sum + Number(b.amount), 0);

	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	const weeksInMonth = daysInMonth / 7;
	const dailyLimit = plannedExpenseThisMonth > 0 ? plannedExpenseThisMonth / daysInMonth : null;
	const weeklyLimit = plannedExpenseThisMonth > 0 ? plannedExpenseThisMonth / weeksInMonth : null;

	const totalIncome = typedTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
	const totalExpense = typedTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
	const totalSaving =
		startingSavingsBalance +
		typedTransactions.filter((t) => t.type === 'saving').reduce((s, t) => s + Number(t.amount), 0);
	const balance = totalIncome - totalExpense;

	// Today (local date) and this ISO week (Monday..Sunday) spend.
	const todayStr = new Date().toISOString().slice(0, 10);
	const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday
	const monday = new Date(now);
	monday.setDate(now.getDate() - dayOfWeek);
	const mondayStr = monday.toISOString().slice(0, 10);

	const spentToday = typedTransactions
		.filter((t) => t.type === 'expense' && t.occurred_on === todayStr)
		.reduce((s, t) => s + Number(t.amount), 0);
	const spentThisWeek = typedTransactions
		.filter((t) => t.type === 'expense' && t.occurred_on >= mondayStr && t.occurred_on <= todayStr)
		.reduce((s, t) => s + Number(t.amount), 0);
	const spentThisMonth = typedTransactions
		.filter((t) => t.type === 'expense' && t.occurred_on >= currentMonth && t.occurred_on <= todayStr)
		.reduce((s, t) => s + Number(t.amount), 0);

	const dailyRemaining = dailyLimit != null ? dailyLimit - spentToday : null;
	const weeklyRemaining = weeklyLimit != null ? weeklyLimit - spentThisWeek : null;
	const monthlyRemaining = plannedExpenseThisMonth > 0 ? plannedExpenseThisMonth - spentThisMonth : null;

	const limitCard = (
		title: string,
		limit: number | null,
		remaining: number | null,
		spent: number,
		emptyNote: string,
	) => (
		<div className="flex flex-col gap-1.5">
			<span className={tileLabel}>{title}</span>
			{limit != null ? (
				<>
					<span className={cx(tileValue, remaining! < 0 ? 'text-negative' : 'text-positive')}>
						{formatAmount(remaining!)} left
					</span>
					<span className="text-[13px] text-muted tabular-nums">{formatAmount(spent)} of {formatAmount(limit)}</span>
					<div className="h-[5px] bg-canvas border border-line rounded-full overflow-hidden mt-0.5">
						<div
							className={cx('h-full', spent > limit ? 'bg-negative' : 'bg-ink')}
							style={{ width: `${Math.min(100, Math.round((spent / limit) * 100))}%` }}
						/>
					</div>
				</>
			) : (
				<span className="text-[13px] text-muted">{emptyNote} {formatAmount(spent)} spent.</span>
			)}
		</div>
	);

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Household"
				title="Finance."
				lede="Shared income and spending — every transaction visible to both of you."
				actions={
					<>
						<Link href="/finance/budget" className={btnGhost}>Budget planning →</Link>
						<Link href="/finance/settings" className={btnGhost}>Settings</Link>
						<button type="button" disabled aria-disabled="true" className={cx(btnGhost, 'pointer-events-none opacity-45 cursor-not-allowed')}>
							Statistics
							<span className="ml-1.5 px-[7px] py-px rounded-full bg-canvas border border-line text-[10px] font-semibold tracking-[0.04em] uppercase text-muted">Soon</span>
						</button>
						<Popup title="Add transaction" trigger={(open) => (
							<button type="button" className={btn} onClick={open}>+ Add transaction</button>
						)}>
							{(close) => (
								<form method="post" action="/api/finance/transactions/create">
									<label className={label} htmlFor="type">Type</label>
									<select id="type" name="type" required defaultValue="expense" className={control}>
										<option value="expense">Expense</option>
										<option value="income">Income</option>
										<option value="saving">Saving</option>
									</select>

									<label className={label} htmlFor="amount">Amount</label>
									<input id="amount" name="amount" type="number" step="0.01" min="0.01" required className={input} />

									<label className={label} htmlFor="category_id">Category</label>
									<select id="category_id" name="category_id" defaultValue="" className={control}>
										<option value="">No category</option>
										<CategoryOptions categories={typedCategories} />
									</select>

									<label className={label} htmlFor="occurred_on">Date</label>
									<input id="occurred_on" name="occurred_on" type="date" className={input} />

									<label className={label} htmlFor="note">Note</label>
									<input id="note" name="note" type="text" maxLength={200} placeholder="Optional" className={input} />

									<PopupActions onCancel={close} submitLabel="Add" />
								</form>
							)}
						</Popup>
					</>
				}
			/>

			{sp.error && <FormError>{sp.error}</FormError>}

			<QuickAdd categories={typedCategories} />

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
				<div className={tile}>
					<span className={tileLabel}>Balance</span>
					<span className={cx(tileValue, balance < 0 && 'text-negative')}>{formatAmount(balance)}</span>
				</div>
				<div className={tile}>
					<span className={tileLabel}>Total income</span>
					<span className={cx(tileValue, 'text-positive')}>{formatAmount(totalIncome)}</span>
				</div>
				<div className={tile}>
					<span className={tileLabel}>Total spending</span>
					<span className={cx(tileValue, 'text-negative')}>{formatAmount(totalExpense)}</span>
				</div>
				<div className={tile}>
					<span className={tileLabel}>Savings balance</span>
					<span className={cx(tileValue, 'text-info')}>{formatAmount(totalSaving)}</span>
				</div>
				<div className={tile}>
					<span className={tileLabel}>Remaining this month</span>
					{monthlyRemaining != null ? (
						<span className={cx(tileValue, monthlyRemaining < 0 ? 'text-negative' : 'text-positive')}>
							{formatAmount(monthlyRemaining)}
						</span>
					) : (
						<span className="font-sans text-sm font-medium text-muted">No expense budget planned</span>
					)}
				</div>
			</div>

			<div className="mt-6 p-5 border border-line rounded-[14px] bg-paper">
				<div className="flex items-center justify-between gap-3">
					<h2 className="m-0 font-serif text-base font-semibold">Spending limits</h2>
					<Link href="/finance/budget" className="text-[13px] text-muted border-b border-line no-underline hover:text-ink hover:border-ink">
						From budget plan →
					</Link>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
					{limitCard('Today', dailyLimit, dailyRemaining, spentToday, 'No expense budget planned this month yet.')}
					{limitCard('This week', weeklyLimit, weeklyRemaining, spentThisWeek, 'No expense budget planned this month yet.')}
				</div>
			</div>

			<div className={cx(tableWrap, 'mt-8')}>
				<table className={table}>
					<thead>
						<tr>
							<th className={th}>Date</th>
							<th className={th}>Type</th>
							<th className={th}>Category</th>
							<th className={th}>Note</th>
							<th className={cx(th, 'text-right')}>Amount</th>
							<th className={th} />
						</tr>
					</thead>
					<tbody>
						{typedTransactions.length ? typedTransactions.map((t) => (
							<tr key={t.id}>
								<td className={cx(td, 'whitespace-nowrap tabular-nums')}>{t.occurred_on}</td>
								<td className={cx(td, 'whitespace-nowrap')}>
									<Pill value={t.type}>
										{t.type === 'income' ? 'Income' : t.type === 'saving' ? 'Saving' : 'Expense'}
									</Pill>
								</td>
								<td className={cx(td, 'whitespace-nowrap text-muted')}>
									{t.category_id ? categoryById.get(t.category_id)?.name ?? '—' : '—'}
								</td>
								<td className={cx(td, 'whitespace-nowrap text-muted')}>{t.note ?? '—'}</td>
								<td className={cx(
									td,
									'whitespace-nowrap text-right font-medium tabular-nums',
									t.type === 'income' ? 'text-positive' : t.type === 'saving' ? 'text-info' : 'text-negative',
								)}>
									{t.type === 'expense' ? '−' : '+'}{formatAmount(Number(t.amount))}
								</td>
								<td className={cx(td, 'whitespace-nowrap text-right')}>
									<form method="post" action={`/api/finance/transactions/${t.id}/delete`} className="m-0 inline-block">
										<button
											type="submit"
											aria-label="Delete transaction"
											className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full border border-transparent bg-transparent text-muted text-[15px] leading-none cursor-pointer hover:border-line hover:text-negative"
										>
											×
										</button>
									</form>
								</td>
							</tr>
						)) : (
							<tr>
								<td colSpan={6} className={cx(td, 'py-7 text-muted')}>No transactions yet. Add your first one.</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}
