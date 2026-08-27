'use client';

import { useState } from 'react';
import { btn } from '@/components/ui';
import type { FinanceCategory } from '@/lib/finance';

const control =
	'min-w-0 font-sans text-base text-ink bg-canvas border border-line rounded-lg px-2.5 py-2 outline-none focus:border-ink';

/**
 * Quick-add bar. The Astro version kept a hidden `type` input in sync with the
 * chosen category through a document-delegated change listener (a directly
 * bound one went stale after a soft navigation). React owns the value here, so
 * the type can never drift from the selection.
 */
export function QuickAdd({ categories }: { categories: FinanceCategory[] }) {
	const byType = (t: FinanceCategory['type']) => categories.filter((c) => c.type === t);
	const first = categories[0];
	const [categoryId, setCategoryId] = useState(first?.id ?? '');

	const type = categories.find((c) => c.id === categoryId)?.type ?? 'expense';

	return (
		<form
			method="post"
			action="/api/finance/transactions/create"
			className="flex flex-wrap md:flex-nowrap items-center gap-2.5 mt-6 px-4 py-3 border border-line rounded-xl bg-paper"
		>
			<input type="hidden" name="type" value={type} />
			<select
				name="category_id"
				required
				value={categoryId}
				onChange={(e) => setCategoryId(e.target.value)}
				className={`flex-[2] ${control}`}
			>
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
			<input
				type="number"
				name="amount"
				step="0.01"
				min="0.01"
				required
				placeholder="Amount"
				className={`flex-1 ${control}`}
			/>
			<button type="submit" className={btn}>Add</button>
		</form>
	);
}
