import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import type { FinanceCategory, FinanceLimits, FinanceType } from '@/lib/finance';
import { InlineEdit } from '@/components/InlineEdit';
import { btn, cx, FormError, PageHead } from '@/components/ui';

const field = 'font-sans text-base text-ink bg-canvas border border-line rounded-[10px] px-3.5 py-2.5 outline-none focus:border-ink';
const fieldLabel = 'text-[13px] font-medium text-muted';
const fieldWrap = 'flex-[1_1_200px] flex flex-col gap-1.5';
const panel = 'mt-8 p-7 border border-line rounded-[14px] bg-paper';

// The Astro version used a scoped `.category-table th/td` block to avoid
// repeating classes across three side-by-side tables. Same job, done with
// shared class constants so there is no CSS at all.
const catTh = 'text-left px-2.5 py-2 text-[10px] font-semibold tracking-[0.05em] uppercase text-muted border-b border-line whitespace-nowrap';
const catTd = 'px-2.5 py-2 border-b border-line align-middle';

function formatAmount(n: number) {
	return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CategoryTable({ title, categories, withInterest }: {
	title: string; categories: FinanceCategory[]; withInterest?: boolean;
}) {
	const cols = withInterest ? 4 : 3;
	return (
		<div>
			<h3 className="m-0 mb-2.5 text-[13px] font-semibold tracking-[0.04em] uppercase text-muted">{title}</h3>
			<div className="overflow-x-auto border border-line rounded-[10px] bg-canvas">
				<table className="w-full border-collapse text-[13px]">
					<thead>
						<tr>
							<th className={catTh}>Name</th>
							<th className={catTh}>Default / month</th>
							{withInterest && <th className={catTh}>Interest %/mo</th>}
							<th className={catTh} />
						</tr>
					</thead>
					<tbody>
						{categories.length ? categories.map((c) => (
							<tr key={c.id}>
								<td className={catTd}>
									<InlineEdit value={c.name} field="name" id={c.id} endpoint="/api/finance/categories" />
								</td>
								<td className={cx(catTd, 'text-right tabular-nums')}>
									<InlineEdit
										value={String(Number(c.default_amount))}
										field="default_amount" id={c.id} endpoint="/api/finance/categories" kind="number"
										display={formatAmount(Number(c.default_amount))}
									/>
								</td>
								{withInterest && (
									<td className={cx(catTd, 'text-right tabular-nums')}>
										<InlineEdit
											value={c.interest_rate != null ? String(Number(c.interest_rate)) : ''}
											field="interest_rate" id={c.id} endpoint="/api/finance/categories" kind="number"
											display={c.interest_rate != null ? String(Number(c.interest_rate)) : '—'}
										/>
									</td>
								)}
								<td className={cx(catTd, 'w-[1%] text-right')}>
									<form method="post" action={`/api/finance/categories/${c.id}/delete`} className="m-0">
										<button
											type="submit" aria-label="Delete category"
											className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full border-0 bg-transparent text-muted text-[15px] leading-none cursor-pointer hover:bg-paper hover:text-negative"
										>
											×
										</button>
									</form>
								</td>
							</tr>
						)) : (
							<tr><td colSpan={cols} className={cx(catTd, 'py-4 text-muted')}>None yet.</td></tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export default async function FinanceSettingsPage({
	searchParams,
}: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireUser();
	const sp = await searchParams;

	const [{ data: categories }, { data: limits }] = await Promise.all([
		supabase.from('finance_categories').select('*').order('name', { ascending: true }),
		supabase.from('finance_limits').select('*').limit(1).maybeSingle(),
	]);

	const typedCategories = (categories ?? []) as FinanceCategory[];
	const typedLimits = limits as FinanceLimits | null;
	const byType = (t: FinanceType) => typedCategories.filter((c) => c.type === t);

	return (
		<section className="max-w-[900px]">
			<Link href="/finance" className="inline-block mb-6 text-[13px] text-muted no-underline hover:text-ink">← Finance</Link>

			<PageHead
				eyebrow="Household"
				title="Finance settings."
				lede="Starting balance, spending limits, and the categories used across income, expense, and saving."
			/>

			{sp.error && <FormError>{sp.error}</FormError>}

			<div className={panel}>
				<h2 className="m-0 font-serif text-xl font-semibold">Starting balance &amp; limits</h2>
				<p className="mt-2 mb-0 text-sm text-muted max-w-[60ch]">
					Starting balance is added on top of every saving transaction when computing your savings balance —
					set it once to whatever you already have saved.
				</p>
				<form method="post" action="/api/finance/settings/update" className="mt-5">
					<div className="flex gap-4 flex-wrap">
						<div className={fieldWrap}>
							<label htmlFor="starting-balance" className={fieldLabel}>Starting savings balance</label>
							<input
								id="starting-balance" name="starting_savings_balance" type="number" step="0.01"
								defaultValue={typedLimits?.starting_savings_balance ?? 0} className={field}
							/>
						</div>
						<div className={fieldWrap}>
							<label htmlFor="daily-limit" className={fieldLabel}>Daily spending limit override</label>
							<input
								id="daily-limit" name="daily_limit" type="number" step="0.01" min="0"
								placeholder="From budget plan" defaultValue={typedLimits?.daily_limit ?? ''} className={field}
							/>
						</div>
						<div className={fieldWrap}>
							<label htmlFor="weekly-limit" className={fieldLabel}>Weekly spending limit override</label>
							<input
								id="weekly-limit" name="weekly_limit" type="number" step="0.01" min="0"
								placeholder="From budget plan" defaultValue={typedLimits?.weekly_limit ?? ''} className={field}
							/>
						</div>
					</div>
					<div className="flex justify-end mt-[18px]">
						<button type="submit" className={btn}>Save</button>
					</div>
				</form>
			</div>

			<div className={panel}>
				<h2 className="m-0 font-serif text-xl font-semibold">Categories</h2>
				<p className="mt-2 mb-0 text-sm text-muted max-w-[60ch]">Used across transactions and budget planning.</p>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
					<CategoryTable title="Income" categories={byType('income')} />
					<CategoryTable title="Expense" categories={byType('expense')} />
					<CategoryTable title="Saving" categories={byType('saving')} withInterest />
				</div>

				<form method="post" action="/api/finance/categories/create" className="mt-5">
					<div className="flex gap-4 flex-wrap">
						<div className={fieldWrap}>
							<label htmlFor="cat-name" className={fieldLabel}>New category</label>
							<input id="cat-name" name="name" type="text" required maxLength={80} className={field} />
						</div>
						<div className={fieldWrap}>
							<label htmlFor="cat-type" className={fieldLabel}>Type</label>
							<select id="cat-type" name="type" defaultValue="expense" className={field}>
								<option value="expense">Expense</option>
								<option value="income">Income</option>
								<option value="saving">Saving</option>
							</select>
						</div>
						<div className={fieldWrap}>
							<label htmlFor="cat-default-amount" className={fieldLabel}>Default amount / month</label>
							<input id="cat-default-amount" name="default_amount" type="number" step="0.01" min="0" placeholder="0.00" className={field} />
						</div>
						<div className={fieldWrap}>
							<label htmlFor="cat-interest-rate" className={fieldLabel}>Interest %/mo (saving only)</label>
							<input id="cat-interest-rate" name="interest_rate" type="number" step="0.001" placeholder="Optional" className={field} />
						</div>
					</div>
					<div className="flex justify-end mt-[18px]">
						<button type="submit" className={btn}>Add category</button>
					</div>
				</form>
			</div>
		</section>
	);
}
