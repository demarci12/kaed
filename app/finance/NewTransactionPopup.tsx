'use client';

import { Popup, PopupActions } from '@/components/Popup';
import { btn, input, label } from '@/components/ui';
import type { FinanceCategory } from '@/lib/finance';

const control = 'w-full font-sans text-base text-ink bg-canvas border border-line rounded-[10px] px-3.5 py-2.5 outline-none focus:border-ink';

/**
 * Popup takes render-prop children, which cannot cross the server/client
 * boundary -- so the trigger and form live in this client wrapper.
 */
export function NewTransactionPopup({ categories }: { categories: FinanceCategory[] }) {
	const byType = (t: FinanceCategory['type']) => categories.filter((c) => c.type === t);
	return (
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
						<optgroup label="Income">
							{byType('income').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
						</optgroup>
						<optgroup label="Expense">
							{byType('expense').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
						</optgroup>
						<optgroup label="Saving">
							{byType('saving').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
						</optgroup>
					</select>

					<label className={label} htmlFor="occurred_on">Date</label>
					<input id="occurred_on" name="occurred_on" type="date" className={input} />

					<label className={label} htmlFor="note">Note</label>
					<input id="note" name="note" type="text" maxLength={200} placeholder="Optional" className={input} />

					<PopupActions onCancel={close} submitLabel="Add" />
				</form>
			)}
		</Popup>
	);
}
